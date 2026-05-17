export const runtime = 'nodejs';

function safeJsonParse(text = '') {
    const raw = String(text || '').trim();
    try { return JSON.parse(raw); } catch (_) {}
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    try { return JSON.parse(cleaned); } catch (_) {}
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

async function fetchWithGeminiRotation(prompt, generationConfig, tools) {
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
            const bodyObj = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig
            };
            if (tools) bodyObj.tools = tools;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyObj)
            });

            const data = await response.json();

            if (!response.ok) {
                console.warn(`[SearchTrends] Gemini key ${currentKeyIndex + 1} lỗi ${response.status}:`, data?.error?.message);
                currentKeyIndex = (currentKeyIndex + 1) % keys.length;
                lastError = new Error(data?.error?.message || `Lỗi ${response.status}`);
                continue; 
            }

            return data;
        } catch (error) {
            console.error(`[SearchTrends] Lỗi fetch Gemini với key ${currentKeyIndex + 1}:`, error.message);
            currentKeyIndex = (currentKeyIndex + 1) % keys.length;
            lastError = error;
        }
    }

    throw new Error(lastError?.message || 'Tất cả Gemini API keys đều bị lỗi hoặc quá giới hạn (Rate Limit).');
}

export async function POST(request) {
    try {
        const body = await request.json();
        const keyword = (body.keyword || '').trim();

        if (!keyword) {
            return Response.json({ error: 'Vui lòng nhập chủ đề tìm kiếm trend.' }, { status: 400 });
        }

        const prompt = `Bạn là chuyên gia săn xu hướng. Hãy sử dụng Google Search để tìm ra 5 tin tức hoặc xu hướng mới nhất trong ngày hôm nay tại Việt Nam liên quan đến chủ đề: "${keyword}".
        
Chỉ trả về JSON hợp lệ với cấu trúc:
{
  "items": [
    {
      "title": "Tiêu đề xu hướng ngắn gọn gọn gàng",
      "description": "Mô tả ngắn gọn về xu hướng này"
    }
  ]
}
Không giải thích thêm.`;

        const data = await fetchWithGeminiRotation(prompt, {
            temperature: 0.7,
            maxOutputTokens: 2000
        }, [{ googleSearch: {} }]);

        const text = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n').trim() || '';
        if (!text) throw new Error('Gemini không trả về danh sách trend.');

        const result = safeJsonParse(text);

        const items = Array.isArray(result?.items) ? result.items : [];
        return Response.json({ keyword, items });
    } catch (error) {
        console.error('Search trends error:', error);
        return Response.json(
            { error: error.message || 'Không tìm được xu hướng.' },
            { status: 500 }
        );
    }
}
