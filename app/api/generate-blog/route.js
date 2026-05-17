export const runtime = 'nodejs';

function createSlug(input = '') {
    return input
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function extractJson(text = '') {
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const first = clean.indexOf('{');
    const last = clean.lastIndexOf('}');

    if (first === -1 || last === -1) {
        throw new Error('AI không trả về JSON hợp lệ.');
    }

    return JSON.parse(clean.slice(first, last + 1));
}

function buildPrompt({ topic, keyword, brandInfo }) {
    return `
Bạn là chuyên gia SEO content cho studio ảnh cưới, kỷ yếu, photobooth tại Việt Nam.

Hãy viết một bài blog tiếng Việt chuẩn SEO cho website Merci Studio.

Thông tin thương hiệu:
${brandInfo || `
Merci Studio
Dịch vụ: chụp ảnh cưới, ảnh cá nhân, kỷ yếu, couple, baby/family, photobooth, makeup
Khu vực ưu tiên: Bắc Ninh, Bắc Giang, Việt Yên, Hà Nội
Địa chỉ:
- 244 Đội Cấn, Hà Nội
- 650 Thân Nhân Trung, Việt Yên, Bắc Ninh
Hotline: 0888.999.545
`}

Chủ đề bài viết: ${topic}
Từ khóa chính: ${keyword || topic}

Yêu cầu SEO:
- title dài khoảng 50-65 ký tự
- metaDesc dài khoảng 135-155 ký tự
- slug tiếng Việt không dấu, ngắn gọn
- content dùng Markdown
- Có 1 đoạn mở bài ngắn
- Có heading ## và ###
- Có checklist hoặc bullet hữu ích
- Có CTA cuối bài kêu gọi inbox/đặt lịch
- Giọng văn tự nhiên, local, dễ hiểu
- Không bịa cam kết quá đà
- Không dùng văn phong máy móc

Chỉ trả về JSON hợp lệ, không thêm giải thích ngoài JSON.

Cấu trúc JSON:
{
  "title": "Tiêu đề SEO",
  "slug": "slug-khong-dau",
  "metaDesc": "Mô tả SEO",
  "content": "Nội dung Markdown đầy đủ",
  "coverUrl": ""
}
`;
}

async function generateWithGemini({ prompt }) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
        throw new Error('Thiếu GEMINI_API_KEY trong biến môi trường.');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
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
                    maxOutputTokens: 5000,
                    responseMimeType: 'application/json'
                }
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        console.error('Gemini API error:', data);
        throw new Error(data?.error?.message || 'Gemini API lỗi.');
    }

    const text =
        data?.candidates?.[0]?.content?.parts
            ?.map(part => part.text || '')
            .join('\n')
            .trim() || '';

    if (!text) {
        throw new Error('Gemini không trả về nội dung.');
    }

    return extractJson(text);
}

async function generateWithOpenAI({ prompt }) {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    if (!apiKey) {
        throw new Error('Thiếu OPENAI_API_KEY trong biến môi trường.');
    }

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
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.75,
            max_output_tokens: 5000,
            text: {
                format: {
                    type: 'json_object'
                }
            }
        })
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('OpenAI API error:', data);
        throw new Error(data?.error?.message || 'OpenAI API lỗi.');
    }

    const text =
        data?.output_text ||
        data?.output?.[0]?.content?.[0]?.text ||
        '';

    if (!text) {
        throw new Error('OpenAI không trả về nội dung.');
    }

    return extractJson(text);
}

export async function POST(request) {
    try {
        const body = await request.json();

        const provider = (body.provider || 'gemini').toLowerCase();
        const topic = (body.topic || '').trim();
        const keyword = (body.keyword || '').trim();
        const brandInfo = (body.brandInfo || '').trim();

        if (!topic) {
            return Response.json(
                { error: 'Vui lòng nhập chủ đề bài viết.' },
                { status: 400 }
            );
        }

        const prompt = buildPrompt({ topic, keyword, brandInfo });

        let result;

        if (provider === 'openai' || provider === 'chatgpt') {
            result = await generateWithOpenAI({ prompt });
        } else if (provider === 'gemini') {
            result = await generateWithGemini({ prompt });
        } else {
            return Response.json(
                { error: 'Provider không hợp lệ. Chỉ dùng: gemini hoặc openai.' },
                { status: 400 }
            );
        }

        const title = result.title || topic;
        const slug = createSlug(result.slug || title);

        return Response.json({
            provider,
            title,
            slug,
            metaDesc: result.metaDesc || '',
            content: result.content || '',
            coverUrl: result.coverUrl || ''
        });
    } catch (error) {
        console.error('Generate blog error:', error);
        return Response.json(
            { error: error.message || 'Không tạo được bài viết.' },
            { status: 500 }
        );
    }
}