import { cleanString, enforceRateLimit, errorResponse, getClientIp, requireAdmin } from '@/lib/server/api-security';

export const runtime = 'nodejs';

function safeJsonParse(text = '') {
    const raw = String(text || '').trim();
    try { return JSON.parse(raw); } catch { }
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try { return JSON.parse(cleaned); } catch { }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI không trả về JSON hợp lệ.');
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
                console.warn(`[TrendTopics] Gemini key ${currentKeyIndex + 1} lỗi ${response.status}:`, data?.error?.message);
                currentKeyIndex = (currentKeyIndex + 1) % keys.length;
                lastError = new Error(data?.error?.message || `Lỗi ${response.status}`);
                continue; 
            }

            return data;
        } catch (error) {
            console.error(`[TrendTopics] Lỗi fetch Gemini với key ${currentKeyIndex + 1}:`, error.message);
            currentKeyIndex = (currentKeyIndex + 1) % keys.length;
            lastError = error;
        }
    }

    throw new Error(lastError?.message || 'Tất cả Gemini API keys đều bị lỗi hoặc quá giới hạn (Rate Limit).');
}

export async function POST(request) {
    try {
        const admin = await requireAdmin(request);
        enforceRateLimit(`generate-trend-topics:${admin.uid}:${getClientIp(request)}`, 20, 60 * 60 * 1000);
        const body = await request.json();
        const trendTitle = cleanString(body.trendTitle, 'Tiêu đề xu hướng', 300, true);
        const count = 5;

        if (!trendTitle) {
            return Response.json({ error: 'Vui lòng cung cấp tiêu đề xu hướng.' }, { status: 400 });
        }

        const brandName = cleanString(body.brandName, 'Thương hiệu', 120) || 'Merci Studio';
        const serviceArea = cleanString(body.serviceArea, 'Khu vực', 200) || 'Bắc Ninh, Bắc Giang, Hà Nội';
        const services = Array.isArray(body.services) ? body.services.slice(0, 20).map((item) => cleanString(item, 'Dịch vụ', 80)).filter(Boolean).join(', ') : (cleanString(body.services, 'Dịch vụ', 500) || 'ảnh cưới, kỷ yếu, photobooth');

        const prompt = `Bạn là chuyên gia SEO content tiếng Việt cho studio: ${brandName}.

Hôm nay có một xu hướng/tin tức mới đang hot: "${trendTitle}"

Hãy sáng tạo ra ${count} ý tưởng bài blog để "bắt trend" này nhưng phải liên quan mật thiết đến dịch vụ của studio.
Dịch vụ của chúng tôi: ${services}.
Khu vực: ${serviceArea}.

Yêu cầu:
- Mỗi ý tưởng phải là 1 bài riêng, hấp dẫn, dễ lên xu hướng.
- Gắn kết xu hướng với việc khách hàng muốn đặt lịch dịch vụ.
- topic là tiêu đề/chủ đề bài viết tự nhiên.
- mainKeyword là từ khóa chính ngắn gọn.

Chỉ trả về JSON hợp lệ với cấu trúc:
{
  "items": [
    {
      "topic": "Chủ đề bài viết",
      "mainKeyword": "từ khóa chính"
    }
  ]
}
Không thêm giải thích ngoài JSON.`;

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

        const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
        if (!text) throw new Error('Gemini không trả về danh sách chủ đề.');

        const result = safeJsonParse(text);
        const items = Array.isArray(result?.items) ? result.items : [];
        
        return Response.json({ trendTitle, items });
    } catch (error) {
        console.error('Generate trend topics error:', error);
        return errorResponse(error);
    }
}
