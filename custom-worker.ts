// Entrypoint deploy: bọc handler do OpenNext sinh ra để giữ CPU mỗi request dưới
// hạn mức 10ms của gói Workers Free.
// - HTML trang công khai được cache ở biên (Cache API) theo phiên bản deploy: trang
//   chủ chỉ render phía client (ssr: false) nên HTML giống nhau cho mọi khách, không
//   cần Next render lại ở mỗi lượt xem.
// - Bot dò lỗ hổng (/wp-admin, .php, /.git, /.env...) bị trả 404 ngay, không vào Next.

// @ts-ignore `.open-next/worker.js` được sinh lúc build
import { default as handler } from './.open-next/worker.js';
// @ts-ignore `.open-next/worker.js` được sinh lúc build
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

type Env = { CF_VERSION_METADATA?: { id?: string } } & Record<string, unknown>;
type Ctx = { waitUntil(promise: Promise<unknown>): void; passThroughOnException(): void };
type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

const HTML_TTL_SECONDS = 600;
const PROBE_RE = /(^\/(wp-|wordpress|xmlrpc|phpmyadmin|cgi-bin|\.git|\.env|\.aws|\.ssh|\.vscode|vendor\/))|\.(php|asp|aspx|jsp|cgi|env|ini|bak|sql)$/i;
const NO_CACHE_PREFIXES = ['/api/', '/__/', '/_next/', '/cdn-cgi/'];
// Trang nội bộ/cá nhân: không cache để không giữ bản cũ khi admin thao tác.
const NO_CACHE_PAGES = new Set(['/tool', '/tao-trang', '/chon-anh', '/loc-anh', '/thong-ke', '/admin']);

// API công khai, dữ liệu chung cho mọi khách (public-content ~1,7 MB JSON: parse lại
// ở mỗi lượt vào trang tốn CPU nhất). Thời gian cache lấy theo s-maxage route tự đặt.
const PUBLIC_API = new Set(['/api/public-content', '/api/public-blogs', '/api/tv-albums', '/api/album-layout']);

function cacheable(request: Request, url: URL) {
  if (request.method !== 'GET') return false;
  if (PUBLIC_API.has(url.pathname)) return true;
  if (NO_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return false;
  if (NO_CACHE_PAGES.has(url.pathname.replace(/\/+$/, ''))) return false;
  // Request RSC/prefetch của Next trả payload khác HTML trên cùng URL.
  if (request.headers.has('rsc') || request.headers.has('next-router-prefetch') || url.searchParams.has('_rsc')) return false;
  if (request.headers.has('authorization')) return false;
  return true;
}

// Tham số theo dõi quảng cáo không đổi nội dung trang; bỏ khỏi key để link từ
// Facebook/Google (mỗi lượt click một fbclid khác) vẫn trúng cache.
const TRACKING_PARAM_RE = /^(utm_\w+|fbclid|gclid|gbraid|wbraid|msclkid|ttclid|zarsrc|_gl|igshid)$/i;

function cacheKey(url: URL, env: Env) {
  const key = new URL(url.toString());
  key.hash = '';
  for (const name of [...key.searchParams.keys()]) {
    if (TRACKING_PARAM_RE.test(name)) key.searchParams.delete(name);
  }
  // Gắn phiên bản deploy: HTML cũ trỏ tới chunk JS đã bị xoá sau deploy mới.
  key.searchParams.set('__v', env.CF_VERSION_METADATA?.id || 'dev');
  return new Request(key.toString(), { method: 'GET' });
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url);
    if (PROBE_RE.test(url.pathname)) {
      return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=86400' } });
    }

    const cache = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default;
    if (!cache || !cacheable(request, url)) return handler.fetch(request, env, ctx);

    const key = cacheKey(url, env);
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) {
      const response = new Response(hit.body, hit);
      const original = response.headers.get('X-Origin-Cache-Control');
      if (original) response.headers.set('Cache-Control', original);
      else response.headers.delete('Cache-Control');
      response.headers.delete('X-Origin-Cache-Control');
      response.headers.set('X-Html-Cache', 'hit');
      return response;
    }

    const response: Response = await handler.fetch(request, env, ctx);
    const type = response.headers.get('content-type') || '';
    const isApi = PUBLIC_API.has(url.pathname);
    // HTML trang + sitemap.xml/robots.txt (đều do Next render ở mỗi lượt bot quét).
    const typeOk = isApi ? type.includes('application/json') : /text\/html|xml|text\/plain/.test(type);
    if (response.status !== 200 || !typeOk || response.headers.has('set-cookie')) {
      return response;
    }

    const stored = new Response(response.clone().body, response);
    // Giữ header gốc để trả cho trình duyệt khi trúng cache (Cache-Control bên dưới chỉ cho Cache API).
    stored.headers.set('X-Origin-Cache-Control', response.headers.get('cache-control') || '');
    if (isApi) {
      const sMaxAge = Number(/s-maxage=(\d+)/.exec(response.headers.get('cache-control') || '')?.[1]) || 300;
      stored.headers.set('Cache-Control', `public, s-maxage=${sMaxAge}, max-age=${sMaxAge}`);
    } else {
      stored.headers.set('Cache-Control', `public, s-maxage=${HTML_TTL_SECONDS}, max-age=${HTML_TTL_SECONDS}`);
    }
    ctx.waitUntil(cache.put(key, stored).catch(() => undefined));

    const out = new Response(response.body, response);
    out.headers.set('X-Html-Cache', 'miss');
    return out;
  }
};
