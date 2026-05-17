export const runtime = 'nodejs';

function safeJsonParse(text = '') {
    const raw = String(text || '').trim();

    try {
        return JSON.parse(raw);
    } catch (_) {}

    const cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (_) {}

    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
        return JSON.parse(match[0]);
    }

    throw new Error('AI không trả về JSON hợp lệ.');
}

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

function buildTopicsPrompt({
    keyword,
    count,
    brandName,
    serviceArea,
    services
}) {
    return `
Bạn là chuyên gia SEO content cho studio chụp ảnh, ảnh cưới, kỷ yếu, photobooth tại Việt Nam.

Hãy tạo danh sách ${count} ý tưởng bài blog liên quan đến từ khóa gốc:

"${keyword}"

Thông tin thương hiệu:
- Thương hiệu: ${brandName}
- Khu vực SEO local: ${serviceArea}
- Dịch vụ chính: ${services}

Yêu cầu:
1. Trả về DUY NHẤT JSON hợp lệ, không markdown code fence, không giải thích thêm.
2. Mỗi bài phải có:
   - topic: chủ đề bài viết hấp dẫn, tự nhiên, có ý định tìm kiếm rõ ràng
   - mainKeyword: từ khóa chính cho bài đó
   - searchIntent: ý định tìm kiếm của khách hàng
   - angle: góc triển khai nội dung
3. Ưu tiên chủ đề có khả năng kéo khách booking/inbox.
4. Chủ đề phải xoay quanh dịch vụ thật của studio.
5. Không tạo chủ đề quá chung chung.
6. Không bịa thông tin giá, khuyến mãi, cam kết.
7. Có kết hợp SEO local: ${serviceArea}.
8. Nội dung phù hợp thị trường Việt Nam.

Ví dụ format chủ đề:
- Kinh nghiệm chụp ảnh cưới ở Bắc Ninh cho cặp đôi lần đầu chuẩn bị
- Chụp ảnh kỷ yếu cấp 3 ở Bắc Ninh cần chuẩn bị gì?
- Photobooth tiệc cưới Bắc Ninh: có nên thuê không?
- Checklist chuẩn bị trước buổi chụp ảnh cưới studio

Schema JSON bắt buộc:
{
  "items": [
    {
      "topic": "string",
      "mainKeyword": "string",
      "searchIntent": "string",
      "angle": "string"
    }
  ]
}
`;
}

async function generateWithGemini(prompt) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('Thiếu GEMINI_API_KEY trong .env.local hoặc Vercel Environment Variables.');
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
        `?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                temperature: 0.75,
                maxOutputTokens: 3000,
                responseMimeType: 'application/json'
            }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Gemini topic API error:', data);
        throw new Error(data?.error?.message || 'Gemini API lỗi khi tạo chủ đề.');
    }

    const outputText = (data?.candidates || [])
        .flatMap(candidate => candidate?.content?.parts || [])
        .map(part => part?.text || '')
        .join('')
        .trim();

    if (!outputText) {
        throw new Error('Gemini chưa trả về danh sách chủ đề.');
    }

    return safeJsonParse(outputText);
}

async function generateWithOpenAI(prompt) {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('Thiếu OPENAI_API_KEY trong .env.local hoặc Vercel Environment Variables.');
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model,
            input: [
                {
                    role: 'system',
                    content:
                        'Bạn là chuyên gia SEO content tiếng Việt. Luôn trả về JSON hợp lệ, không thêm giải thích ngoài JSON.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.75,
            max_output_tokens: 3000,
            text: {
                format: {
                    type: 'json_schema',
                    name: 'seo_blog_topic_ideas',
                    strict: true,
                    schema: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            items: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    additionalProperties: false,
                                    properties: {
                                        topic: { type: 'string' },
                                        mainKeyword: { type: 'string' },
                                        searchIntent: { type: 'string' },
                                        angle: { type: 'string' }
                                    },
                                    required: [
                                        'topic',
                                        'mainKeyword',
                                        'searchIntent',
                                        'angle'
                                    ]
                                }
                            }
                        },
                        required: ['items']
                    }
                }
            }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('OpenAI topic API error:', data);
        throw new Error(data?.error?.message || 'OpenAI API lỗi khi tạo chủ đề.');
    }

    const outputText =
        data?.output_text ||
        (data?.output || [])
            .flatMap(item => item?.content || [])
            .map(part => part?.text || '')
            .join('')
            .trim();

    if (!outputText) {
        throw new Error('OpenAI chưa trả về danh sách chủ đề.');
    }

    return safeJsonParse(outputText);
}

function normalizeTopics(parsed, keyword, count) {
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];

    const items = rawItems
        .map((item, index) => {
            const topic = String(item?.topic || '').trim();
            const mainKeyword = String(item?.mainKeyword || item?.keyword || keyword).trim();

            if (!topic) return null;

            return {
                id: `topic_${Date.now()}_${index}`,
                topic,
                mainKeyword,
                searchIntent: String(
                    item?.searchIntent || 'Tìm hiểu thông tin trước khi đặt dịch vụ'
                ).trim(),
                angle: String(
                    item?.angle || 'Bài viết tư vấn, dễ đọc, có CTA đặt lịch'
                ).trim(),
                slug: createSlug(topic)
            };
        })
        .filter(Boolean)
        .slice(0, count);

    if (items.length === 0) {
        throw new Error('AI chưa tạo được chủ đề hợp lệ.');
    }

    return items;
}

export async function POST(request) {
    try {
        const body = await request.json();

        const provider = String(body.provider || 'gemini').toLowerCase();
        const keyword = String(body.keyword || '').trim();
        const count = Math.min(20, Math.max(1, Number(body.count) || 6));

        const brandName = body.brandName || 'Merci Studio';
        const serviceArea = body.serviceArea || 'Bắc Ninh, Bắc Giang, Hà Nội';

        const services = Array.isArray(body.services)
            ? body.services.join(', ')
            : body.services ||
              'ảnh cưới, kỷ yếu, couple, baby family, photobooth, makeup, váy cưới';

        if (!keyword) {
            return Response.json(
                { error: 'Vui lòng nhập từ khóa gốc.' },
                { status: 400 }
            );
        }

        const prompt = buildTopicsPrompt({
            keyword,
            count,
            brandName,
            serviceArea,
            services
        });

        const parsed =
            provider === 'openai' || provider === 'chatgpt'
                ? await generateWithOpenAI(prompt)
                : await generateWithGemini(prompt);

        const items = normalizeTopics(parsed, keyword, count);

        return Response.json({
            provider,
            keyword,
            count: items.length,
            items
        });
    } catch (error) {
        console.error('Generate blog topics route error:', error);

        return Response.json(
            {
                error: error.message || 'Không tạo được danh sách chủ đề.'
            },
            { status: 500 }
        );
    }
}