import { cleanString, enforceRateLimit, errorResponse, getClientIp, requireAdmin } from '@/lib/server/api-security';

export const runtime = 'nodejs';

function createSlug(str = '') {
    return str
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

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

function normalizeHashtags(input) {
    const raw = Array.isArray(input) ? input : String(input || '').split(/[,\n#]+/);
    return Array.from(new Set(
        raw
            .map(tag => String(tag || '').replace(/^#/, '').trim())
            .filter(Boolean)
            .map(tag => tag.length > 40 ? tag.slice(0, 40) : tag)
    )).slice(0, 8);
}

function buildPrompt({ topic, mainKeyword, brandName, serviceArea, services, tone }) {
    return [
        'Bạn là Senior Content Marketer + SEO Specialist chuyên viết bài cho studio ảnh cưới, kỷ yếu, photobooth, makeup và váy cưới tại Việt Nam.',
        '',
        `Hãy viết 1 bài blog TIẾNG VIỆT chuẩn SEO nhưng sinh động, có cảm xúc, có emoji vừa phải, có tính bán hàng mềm cho website ${brandName}.`,
        '',
        'THÔNG TIN THƯƠNG HIỆU:',
        `- Thương hiệu: ${brandName}`,
        `- Khu vực SEO local: ${serviceArea}`,
        `- Dịch vụ chính: ${services}`,
        `- Giọng văn: ${tone}`,
        `- Chủ đề bài viết: ${topic}`,
        `- Từ khóa chính: ${mainKeyword || topic}`,
        '',
        'YÊU CẦU OUTPUT:',
        '- Chỉ trả về JSON hợp lệ.',
        '- Không markdown code fence ngoài content.',
        '- Không giải thích ngoài JSON.',
        '',
        'YÊU CẦU SEO:',
        '- title dài khoảng 50-65 ký tự, có từ khóa chính, không dùng emoji.',
        '- slug tiếng Việt không dấu, ngắn gọn.',
        '- metaDesc dài khoảng 135-155 ký tự, có từ khóa chính và CTA nhẹ, không dùng emoji.',
        '- content dài khoảng 1000-1600 chữ.',
        '- Từ khóa chính xuất hiện tự nhiên trong mở bài, ít nhất 1 H2, thân bài và CTA cuối.',
        '- Có từ khóa liên quan tự nhiên: chụp ảnh đẹp, studio chụp ảnh, concept chụp ảnh, kinh nghiệm chụp ảnh, đặt lịch chụp ảnh.',
        '- Không nhồi từ khóa.',
        '',
        'YÊU CẦU PHONG CÁCH MARKETING:',
        '- Viết sinh động, có cảm xúc, không giống văn AI.',
        '- Mở bài phải chạm insight khách hàng.',
        '- Có ví dụ thực tế, tình huống khách hàng thường gặp.',
        '- Có CTA mềm ở giữa bài nếu phù hợp.',
        '- Có CTA mạnh hơn ở cuối bài.',
        '- Văn phong thân thiện, tư vấn, gần gũi nhưng chuyên nghiệp.',
        '- Ưu tiên giúp khách muốn inbox/đặt lịch.',
        '',
        'YÊU CẦU EMOJI:',
        '- content phải có emoji sinh động nhưng vừa phải.',
        '- Có thể dùng emoji ở heading hoặc bullet.',
        '- Không dùng emoji trong title, slug, metaDesc.',
        '- Emoji phù hợp: 📸 💍 ✨ 🎓 👗 ✅ 💡 📍 💬 ❤️',
        '',
        'YÊU CẦU CẤU TRÚC CONTENT:',
        '- content dùng Markdown đơn giản.',
        '- Không dùng H1 trong content.',
        '- Dùng "## " cho H2.',
        '- Có 4-6 mục H2.',
        '- Dùng "### " cho H3 nếu cần.',
        '- Dùng "- " cho bullet.',
        '- Có checklist hoặc bullet hữu ích.',
        '',
        'YÊU CẦU ẢNH MINH HỌA:',
        '- Bắt buộc chèn 2-4 vị trí ảnh minh họa trong content.',
        '- Dùng đúng cú pháp Markdown:',
        '![Mô tả ảnh phù hợp với đoạn nội dung](LINK_ANH_CAN_THAY)',
        '- Đặt ảnh sau các mục H2 quan trọng.',
        '- Alt ảnh phải tự nhiên, có liên quan nội dung và có thể chứa từ khóa.',
        '',
        'YÊU CẦU HASHTAG:',
        '- Tạo 4-8 hashtag phù hợp với bài viết.',
        '- Hashtag không có dấu # ở đầu.',
        '- Có ít nhất 1 hashtag theo dịch vụ.',
        '- Có ít nhất 1 hashtag theo khu vực local.',
        '- Không tạo hashtag quá dài.',
        '- Ví dụ: chụp ảnh cưới, Bắc Ninh, studio ảnh cưới, kỷ yếu, photobooth.',
        '',
        'YÊU CẦU NỘI DUNG:',
        '- Không bịa giá cụ thể.',
        '- Không bịa khuyến mãi.',
        '- Không cam kết quá đà như đẹp nhất, rẻ nhất, số 1.',
        `- Có nhắc local tự nhiên: ${serviceArea}.`,
        '- Viết cho khách hàng thật, không viết kiểu học thuật.',
        '',
        'YÊU CẦU COVER:',
        '- coverUrl để chuỗi rỗng "".',
        '',
        `CTA cuối bài: mời khách inbox/đặt lịch với ${brandName}, nhắc khu vực ${serviceArea}, dùng emoji vừa phải.`
    ].join('\n');
}

function normalizeArticle(parsed, topic) {
    const title = String(parsed?.title || topic).trim();
    const slug = createSlug(parsed?.slug || title);
    const metaDesc = String(parsed?.metaDesc || '').trim().slice(0, 170);
    const content = String(parsed?.content || '').trim();
    const coverUrl = String(parsed?.coverUrl || '').trim();
    const hashtags = normalizeHashtags(parsed?.hashtags || []);

    if (!title || !content) {
        throw new Error('AI trả về thiếu title hoặc content.');
    }

    return { title, slug, metaDesc, content, coverUrl, hashtags };
}

function getGeminiText(data) {
    return (data?.candidates || [])
        .flatMap(candidate => candidate?.content?.parts || [])
        .map(part => part?.text || '')
        .join('')
        .trim();
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
                console.warn(`[Blog] Gemini key ${currentKeyIndex + 1} lỗi ${response.status}:`, data?.error?.message);
                currentKeyIndex = (currentKeyIndex + 1) % keys.length;
                lastError = new Error(data?.error?.message || `Lỗi ${response.status}`);
                continue; // Try next key
            }

            return data;
        } catch (error) {
            console.error(`[Blog] Lỗi fetch Gemini với key ${currentKeyIndex + 1}:`, error.message);
            currentKeyIndex = (currentKeyIndex + 1) % keys.length;
            lastError = error;
        }
    }

    throw new Error(lastError?.message || 'Tất cả Gemini API keys đều bị lỗi hoặc quá giới hạn (Rate Limit).');
}

async function generateWithGemini(prompt) {
    const data = await fetchWithGeminiRotation(prompt, {
        temperature: 0.8,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: {
            type: "OBJECT",
            properties: {
                title: { type: "STRING" },
                slug: { type: "STRING" },
                metaDesc: { type: "STRING" },
                content: { type: "STRING" },
                coverUrl: { type: "STRING" },
                hashtags: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["title", "slug", "metaDesc", "content", "coverUrl", "hashtags"]
        }
    });

    const outputText = getGeminiText(data);
    if (!outputText) throw new Error('Gemini chưa trả về nội dung bài viết.');
    return safeJsonParse(outputText);
}

export async function POST(request) {
    try {
        const admin = await requireAdmin(request);
        enforceRateLimit(`generate-blog:${admin.uid}:${getClientIp(request)}`, 20, 60 * 60 * 1000);
        const body = await request.json();

        const provider = 'gemini'; // Force Gemini
        const topic = cleanString(body.topic, 'Chủ đề', 300, true);
        const mainKeyword = cleanString(body.mainKeyword || body.keyword, 'Từ khóa', 160);

        const brandName = cleanString(body.brandName || body.brand, 'Thương hiệu', 120) || 'Merci Studio';
        const serviceArea = cleanString(body.serviceArea, 'Khu vực', 200) || 'Bắc Ninh, Bắc Giang, Việt Yên, Hà Nội';
        const services = Array.isArray(body.services)
            ? body.services.slice(0, 20).map((item) => cleanString(item, 'Dịch vụ', 80)).filter(Boolean).join(', ')
            : cleanString(body.services, 'Dịch vụ', 500) || 'chụp ảnh cưới, chụp ảnh kỷ yếu, chụp ảnh couple, chụp ảnh baby/family, photobooth tiệc cưới và sự kiện, makeup, váy cưới';
        const tone = cleanString(body.tone, 'Giọng văn', 300) || 'sinh động, chuyên nghiệp như marketer, chuẩn SEO, dễ đọc, có cảm xúc, có emoji vừa phải, có CTA inbox/đặt lịch';

        if (!topic) {
            return Response.json({ error: 'Vui lòng nhập chủ đề bài viết.' }, { status: 400 });
        }

        const prompt = buildPrompt({ topic, mainKeyword, brandName, serviceArea, services, tone });
        const parsed = await generateWithGemini(prompt);

        const article = normalizeArticle(parsed, topic);
        return Response.json({ provider, ...article });
    } catch (error) {
        console.error('Generate blog route error:', error);
        return errorResponse(error);
    }
}
