import 'server-only';

/**
 * Cache JSON ở biên Cloudflare bằng Cache API (có sẵn trong Worker, không cần KV/R2).
 * Lý do: trên Cloudflare Workers, `fetch(..., { next: { revalidate } })` KHÔNG có
 * bộ nhớ cache bền (open-next.config.ts không cấu hình incremental cache) nên mỗi
 * request đều gọi Firestore → cạn quota đọc hằng ngày.
 *
 * Hai lớp cache cho mỗi key:
 * - fresh:     hết hạn sau ttlSeconds → gọi nguồn lại
 * - last-good: giữ 7 ngày → dùng khi nguồn lỗi / hết quota (stale-on-error)
 * Không có Cache API (next build / next dev) thì gọi nguồn trực tiếp.
 */

type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

export type CacheStatus = 'hit' | 'miss' | 'stale' | 'none' | 'empty';

const LAST_GOOD_TTL_SECONDS = 7 * 24 * 3600;
const CACHE_ORIGIN = 'https://mercistudio.net/__edge-cache/';

function edgeCache(): EdgeCache | null {
  const caches = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches;
  return caches?.default ?? null;
}

function jsonResponse(body: string, ttlSeconds: number) {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, s-maxage=${ttlSeconds}, max-age=${ttlSeconds}`
    }
  });
}

export async function cachedJson<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T | null>
): Promise<{ data: T | null; status: CacheStatus }> {
  const cache = edgeCache();
  const freshRequest = new Request(`${CACHE_ORIGIN}${key}`);
  const lastGoodRequest = new Request(`${CACHE_ORIGIN}${key}/last-good`);

  if (cache) {
    try {
      const hit = await cache.match(freshRequest);
      if (hit) return { data: await hit.json() as T, status: 'hit' };
    } catch {
      // bỏ qua lỗi cache, đi tiếp
    }
  }

  let data: T | null = null;
  try {
    data = await load();
  } catch {
    data = null;
  }

  if (data !== null) {
    if (cache) {
      try {
        const body = JSON.stringify(data);
        await cache.put(freshRequest, jsonResponse(body, ttlSeconds));
        await cache.put(lastGoodRequest, jsonResponse(body, LAST_GOOD_TTL_SECONDS));
      } catch {
        // không ghi được cache thì vẫn trả dữ liệu
      }
    }
    return { data, status: cache ? 'miss' : 'none' };
  }

  if (cache) {
    try {
      const stale = await cache.match(lastGoodRequest);
      if (stale) return { data: await stale.json() as T, status: 'stale' };
    } catch {
      // bỏ qua
    }
  }
  return { data: null, status: 'empty' };
}
