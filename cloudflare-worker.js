export default {
  async fetch(request, env, ctx) {
    // 1. Phân tích URL để lấy ID file
    const url = new URL(request.url);
    const fileId = url.searchParams.get('id');

    // Cấu hình CORS để cho phép website của bạn truy cập
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Xử lý request OPTIONS (CORS preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (!fileId) {
      return new Response('Missing file ID', { status: 400, headers: corsHeaders });
    }

    // 2. URL tải file gốc từ Google Drive
    const driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

    try {
      // 3. Fetch ảnh từ Google Drive
      // Chỉ truyền qua những header cơ bản
      const driveResponse = await fetch(driveUrl, {
        method: request.method
      });

      // Tạo một Response mới dựa trên dữ liệu trả về từ Google Drive
      const response = new Response(driveResponse.body, driveResponse);

      // 4. Gắn thêm Header CORS vào Response để trình duyệt không bị lỗi
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      
      // Thêm Cache Control để trình duyệt và CDN cache lại ảnh
      response.headers.set('Cache-Control', 'public, max-age=31536000, s-maxage=31536000');

      return response;
    } catch (error) {
      return new Response(`Error fetching from Google Drive: ${error.message}`, { status: 500, headers: corsHeaders });
    }
  },
};
