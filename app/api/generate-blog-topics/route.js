import { cleanString, enforceRateLimit, errorResponse, getClientIp, requireAdmin } from '@/lib/server/api-security';

export const runtime = 'nodejs';

function safeJsonParse(text = '') {
    const raw = String(text || '').trim();
    try { return JSON.parse(raw); } catch { }

    const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

    try { return JSON.parse(cleaned); } catch { }

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);

    throw new Error('AI không trả về JSON hợp lệ.');
}

function clampCount(value) {
    const number = Number(value) || 1;
    return Math.min(20, Math.max(1, number));
}

function buildTopicPrompt({ keyword, count, brandName, serviceArea, services }) {
    return `
Bạn là chuyên gia SEO content tiếng Việt cho studio ảnh cưới, kỷ yếu, photobooth.

Hãy tạo ${count} ý tưởng bài blog liên quan đến từ khóa gốc: "${keyword}".

Thương hiệu: ${brandName || 'Merci Studio'}
Dịch vụ: ${(services || ['ảnh cưới', 'kỷ yếu', 'photobooth', 'váy cưới']).join(', ')}
Khu vực ưu tiên: ${serviceArea || 'Bắc Ninh, Bắc Giang, Hà Nội'}

Yêu cầu:
- Mỗi ý tưởng phải là 1 bài riêng, không trùng nhau.
- Ưu tiên từ khóa có khả năng SEO local và ra booking.
- Bao phủ nhiều search intent: kinh nghiệm, bảng giá, checklist, địa điểm, concept, so sánh, câu hỏi thường gặp, chuẩn bị trước buổi chụp.
- topic là tiêu đề/chủ đề bài viết tự nhiên, có thể dùng làm prompt viết bài.
- mainKeyword là từ khóa chính cho bài đó, ngắn gọn.
- Không tạo chủ đề quá chung chung.

Chỉ trả về JSON hợp lệ, không thêm giải thích ngoài JSON.
`;
}

// Global state for key rotation
let currentKeyIndex = 0;

function getGeminiKeys() {
    return [
        process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
    ].filter(k => k && k !== 'your_second_gemini_key_here' && k !== 'your_third_gemini_key_here');
}

async function fetchWithGeminiRotation(prompt, generationConfig) {
    const keys = getGeminiKeys();
    if (keys.length === 0) {
        throw new Error('Thiếu GEMINI_API_KEY trong biến môi trường.');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const keyToUse = keys[currentKeyIndex];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(keyToUse)}`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.warn(`[Topics] Gemini key ${currentKeyIndex + 1} lỗi ${response.status}:`, data?.error?.message);
                currentKeyIndex = (currentKeyIndex + 1) % keys.length;
                lastError = new Error(data?.error?.message || `Lỗi ${response.status}`);
                continue; // Try next key
            }

            return data;
        } catch (error) {
            console.error(`[Topics] Lỗi fetch Gemini với key ${currentKeyIndex + 1}:`, error.message);
            currentKeyIndex = (currentKeyIndex + 1) % keys.length;
            lastError = error;
        }
    }

    throw new Error(lastError?.message || 'Tất cả Gemini API keys đều bị lỗi hoặc quá giới hạn (Rate Limit).');
}

async function generateTopicsWithGemini({ prompt }) {
    const data = await fetchWithGeminiRotation(prompt, {
        temperature: 0.8,
        maxOutputTokens: 3000,
        responseMimeType: 'application/json',
        responseSchema: {
            type: "OBJECT",
            properties: {
                items: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            topic: { type: "STRING" },
                            mainKeyword: { type: "STRING" }
                        },
                        required: ["topic", "mainKeyword"]
                    }
                }
            },
            required: ["items"]
        }
    });

    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\\n').trim() || '';
    if (!text) throw new Error('Gemini không trả về danh sách chủ đề.');

    return safeJsonParse(text);
}

export async function POST(request) {
    try {
        const admin = await requireAdmin(request);
        enforceRateLimit(`generate-blog-topics:${admin.uid}:${getClientIp(request)}`, 20, 60 * 60 * 1000);
        const body = await request.json();
        const provider = 'gemini'; // Force Gemini
        const keyword = cleanString(body.keyword, 'Từ khóa', 200, true);
        const count = clampCount(body.count);

        if (!keyword) {
            return Response.json({ error: 'Vui lòng nhập từ khóa gốc.' }, { status: 400 });
        }

        const prompt = buildTopicPrompt({
            keyword,
            count,
            brandName: cleanString(body.brandName, 'Thương hiệu', 120),
            serviceArea: cleanString(body.serviceArea, 'Khu vực', 200),
            services: Array.isArray(body.services) ? body.services.slice(0, 20).map((item) => cleanString(item, 'Dịch vụ', 80)).filter(Boolean) : undefined
        });

        const result = await generateTopicsWithGemini({ prompt });

        const items = Array.isArray(result?.items) ? result.items : [];
        const cleanedItems = items
            .map(item => ({
                topic: (item.topic || item.title || '').toString().trim(),
                mainKeyword: (item.mainKeyword || item.keyword || keyword).toString().trim()
            }))
            .filter(item => item.topic)
            .slice(0, count);

        return Response.json({ provider, keyword, count, items: cleanedItems });
    } catch (error) {
        console.error('Generate blog topics error:', error);
        return errorResponse(error);
    }
}
