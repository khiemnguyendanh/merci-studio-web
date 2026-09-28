// Worker proxy Google Drive — CHỈ dùng nội bộ. Entrypoint deploy chính là
// .open-next/worker.js (xem wrangler.jsonc), file này đã được siết:
// validate fileId, không echo lỗi nội bộ, CORS giới hạn domain Mercistudio.
const ALLOWED_ORIGINS = new Set(['https://mercistudio.net', 'https://www.mercistudio.net']);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const fileId = url.searchParams.get('id');
    const origin = request.headers.get('origin') || '';
    const corsHeaders = ALLOWED_ORIGINS.has(origin)
      ? {
          'Access-Control-Allow-Origin': origin,
          'Vary': 'Origin',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      : { 'Vary': 'Origin' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }
    if (!fileId || !/^[a-zA-Z0-9_-]{10,200}$/.test(fileId)) {
      return new Response('Missing or invalid file ID', { status: 400, headers: corsHeaders });
    }

    const driveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

    try {
      const driveResponse = await fetch(driveUrl, { method: request.method });

      const headers = new Headers(corsHeaders);
      const contentType = driveResponse.headers.get('content-type');
      if (contentType) headers.set('content-type', contentType);
      headers.set('Cache-Control', 'public, max-age=86400');
      headers.set('X-Content-Type-Options', 'nosniff');

      return new Response(driveResponse.body, { status: driveResponse.status, headers });
    } catch (error) {
      console.error('[drive-proxy]', error && error.message ? error.message : error);
      return new Response('Upstream error', { status: 502, headers: corsHeaders });
    }
  },
};
