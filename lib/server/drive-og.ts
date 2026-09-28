import 'server-only';
import { cachedJson } from './edge-cache';

// Thumbnail realtime cho link gửi khách (?folder=...): lấy tên folder + ảnh đầu
// tiên trong folder Drive để làm og:image. Cache ở biên để bot Zalo/Facebook
// quét lại nhiều lần không tốn quota Drive API.
const OG_CACHE_SECONDS = 1800;

// Throttle theo IP: ?folder=<id> công khai gọi được API Drive (tốn quota) nên giới
// hạn tần suất; cache 30 phút phía trên đã gánh phần lớn request lặp.
const ogHits = new Map<string, { count: number; resetAt: number }>();
function ogAllowed(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = ogHits.get(key);
  if (!entry || entry.resetAt <= now) {
    ogHits.set(key, { count: 1, resetAt: now + windowMs });
    if (ogHits.size > 5000) ogHits.clear();
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

export type DriveFolderOg = { name: string; imageUrl: string } | null;

export async function getDriveFolderOg(folderId: string, clientIp = 'unknown'): Promise<DriveFolderOg> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  if (!apiKey || !/^[a-zA-Z0-9_-]{10,200}$/.test(folderId)) return null;
  if (!ogAllowed(`og:${clientIp}`, 40, 60_000)) return null;

  const { data } = await cachedJson<{ name: string; imageUrl: string }>(
    `drive-og/${folderId}`,
    OG_CACHE_SECONDS,
    async () => {
      const [infoResponse, filesResponse] = await Promise.all([
        fetch(
          `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?key=${apiKey}&fields=name`,
          { cache: 'no-store' }
        ),
        fetch(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+mimeType+contains+'image/'+and+trashed=false` +
            `&key=${apiKey}&fields=files(id)&pageSize=1&orderBy=name`,
          { cache: 'no-store' }
        )
      ]);
      if (!filesResponse.ok) return null;
      const files = (await filesResponse.json()) as { files?: { id: string }[] };
      const fileId = files.files?.[0]?.id;
      if (!fileId) return null;
      const info = infoResponse.ok ? ((await infoResponse.json()) as { name?: string }) : {};
      return {
        name: info.name || '',
        imageUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
      };
    }
  );
  return data;
}
