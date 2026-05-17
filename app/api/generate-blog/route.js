export const runtime = 'nodejs';

function createSlug(str = '') {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ặ|ẵ|â|ấ|ầ|ẩ|ậ|ẫ/g, 'a')
    .replace(/é|è|ẻ|ẹ|ẽ|ê|ế|ề|ể|ệ|ễ/g, 'e')
    .replace(/i|í|ì|ỉ|ị|ĩ/g, 'i')
    .replace(/ó|ò|ỏ|ọ|õ|ô|ố|ồ|ổ|ộ|ỗ|ơ|ớ|ờ|ở|ợ|ỡ/g, 'o')
    .replace(/ú|ù|ủ|ụ|ũ|ư|ứ|ừ|ử|ự|ữ/g, 'u')
    .replace(/ý|ỳ|ỷ|ỵ|ỹ/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function extractJson(text = '') {
  const cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start === -1 || end === -1) {
    throw new Error('Gemini không trả về JSON hợp lệ.');
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    if (!apiKey) {
      return Response.json(
        { error: 'Thiếu GEMINI_API_KEY trong biến môi trường.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const topic = (body?.topic || '').trim();
    const keyword = (body?.keyword || '').trim();
    const brand = (body?.brand || 'Merci Studio').trim();

    if (!topic) {
      return Response.json(
        { error: 'Vui lòng nhập chủ đề bài viết.' },
        { status: 400 }
      );
    }

    const prompt = `
Bạn là chuyên gia SEO content tiếng Việt cho studio ảnh cưới, kỷ yếu, photobooth, makeup và váy cưới.

Hãy viết 1 bài blog chuẩn SEO cho website của ${brand}.

Thông tin thương hiệu:
- Merci Studio
- Dịch vụ: chụp ảnh cưới, chụp kỷ yếu, photobooth sự kiện, baby/family, couple, makeup, váy cưới
- Khu vực ưu tiên SEO: Bắc Ninh, Bắc Giang, Việt Yên, Hà Nội
- Tệp khách: học sinh cấp 3, cặp đôi sắp cưới, gia đình trẻ, khách địa phương

Chủ đề bài viết:
${topic}

Từ khóa chính:
${keyword || topic}

Yêu cầu SEO:
- Tiêu đề hấp dẫn, khoảng 50-65 ký tự
- Meta description khoảng 135-155 ký tự
- Slug tiếng Việt không dấu, ngắn, có từ khóa
- Nội dung dài khoảng 900-1300 từ
- Viết tự nhiên, dễ đọc, không nhồi nhét từ khóa
- Có mở bài ngắn
- Có nhiều heading H2, H3 bằng markdown
- Có checklist hoặc bullet list nếu phù hợp
- Có CTA cuối bài mời inbox / đặt lịch tại Merci Studio
- Không bịa số liệu, không cam kết quá đà
- Giọng văn trẻ, chuyên nghiệp, hợp khách địa phương

Chỉ trả về JSON hợp lệ, không thêm giải thích bên ngoài.

Format JSON:
{
  "title": "Tiêu đề bài viết",
  "slug": "slug-khong-dau",
  "metaDesc": "Mô tả SEO",
  "coverUrl": "",
  "content": "Nội dung markdown đầy đủ"
}
`;

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
      `?key=${encodeURIComponent(apiKey)}`;

    const geminiRes = await fetch(geminiUrl, {
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
          topP: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      })
    });

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini API error:', geminiData);
      return Response.json(
        {
          error:
            geminiData?.error?.message ||
            'Gemini API lỗi. Hãy kiểm tra GEMINI_API_KEY hoặc GEMINI_MODEL.'
        },
        { status: 500 }
      );
    }

    const text =
      geminiData?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('\n') || '';

    if (!text) {
      return Response.json(
        { error: 'Gemini không trả về nội dung.' },
        { status: 500 }
      );
    }

    const article = extractJson(text);

    const title = article.title || topic;
    const slug = createSlug(article.slug || title);

    return Response.json({
      title,
      slug,
      metaDesc: article.metaDesc || '',
      coverUrl: article.coverUrl || '',
      content: article.content || ''
    });
  } catch (error) {
    console.error('Generate blog route error:', error);
    return Response.json(
      {
        error:
          error?.message ||
          'Không tạo được bài viết bằng Gemini. Vui lòng thử lại.'
      },
      { status: 500 }
    );
  }
}