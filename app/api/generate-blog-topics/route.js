export const runtime = 'nodejs';

function extractJson(text = '') {
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');

    if (first === -1 || last === -1) {
        throw new Error('AI không trả về JSON hợp lệ.');
    }

    return JSON.parse(clean.slice(first, last + 1));
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

Cấu trúc JSON:
{
  "items": [
    {
      "topic": "Chủ đề bài viết",
      "mainKeyword": "từ khóa chính"
    }
  ]
}
`;
}

async function generateTopicsWithGemini({ prompt }) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) throw new Error('Thiếu GEMINI_API_KEY trong biến môi trường.');

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
            },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 3000,
                    responseMimeType: 'application/json'
                }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error('Gemini topic API error:', data);
        throw new Error(data?.error?.message || 'Gemini API lỗi.');
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
    if (!text) throw new Error('Gemini không trả về danh sách chủ đề.');

    return extractJson(text);
}

async function generateTopicsWithOpenAI({ prompt }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    if (!apiKey) throw new Error('Thiếu OPENAI_API_KEY trong biến môi trường.');

    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            input: [
                {
                    role: 'system',
                    content: 'Bạn là chuyên gia SEO content tiếng Việt. Luôn trả về JSON hợp lệ, không thêm markdown ngoài JSON.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_output_tokens: 3000,
            text: { format: { type: 'json_object' } }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('OpenAI topic API error:', data);
        throw new Error(data?.error?.message || 'OpenAI API lỗi.');
    }

    const text = data?.output_text || data?.output?.[0]?.content?.[0]?.text || '';
    if (!text) throw new Error('OpenAI không trả về danh sách chủ đề.');

    return extractJson(text);
}

export async function POST(request) {
    try {
        const body = await request.json();
        const provider = (body.provider || 'gemini').toLowerCase();
        const keyword = (body.keyword || '').trim();
        const count = clampCount(body.count);

        if (!keyword) {
            return Response.json({ error: 'Vui lòng nhập từ khóa gốc.' }, { status: 400 });
        }

        const prompt = buildTopicPrompt({
            keyword,
            count,
            brandName: body.brandName,
            serviceArea: body.serviceArea,
            services: body.services
        });

        let result;
        if (provider === 'openai' || provider === 'chatgpt') {
            result = await generateTopicsWithOpenAI({ prompt });
        } else if (provider === 'gemini') {
            result = await generateTopicsWithGemini({ prompt });
        } else {
            return Response.json({ error: 'Provider không hợp lệ. Chỉ dùng: gemini hoặc openai.' }, { status: 400 });
        }

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
        return Response.json(
            { error: error.message || 'Không tạo được danh sách bài liên quan.' },
            { status: 500 }
        );
    }
}
