import { getCloudflareContext } from '@opennextjs/cloudflare';
import { ApiError, errorResponse, requireAdmin } from '@/lib/server/api-security';
import { DRIVE_ID_RE, extractDriveFolderId } from '@/lib/server/photo-manifest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hàng đợi "quét mặt" cho trang chọn ảnh.
// - Admin bấm nút trên web -> POST { action: 'enqueue', folderId } ghi faces/queue.json.
// - Agent trên máy tính (scripts/face-agent.mjs) long-poll GET ?action=claim, nhận
//   việc, chạy face-groups.py rồi báo lại POST { action: 'done' }.
// - Web poll GET ?action=status&folderId để hiện tiến độ.
// Trạng thái lưu trên R2 (không tốn Firestore).

const QUEUE_KEY = 'faces/queue.json';
const STALE_MS = 30 * 60 * 1000; // job "running" quá 30 phút coi như agent chết, cho nhận lại

type Job = {
  folderId: string;
  status: 'queued' | 'running' | 'done' | 'error';
  requestedAt: number;
  startedAt?: number;
  finishedAt?: number;
  by?: string;
  detail?: string;
  people?: number;
  faceCount?: number;
};
type Queue = { jobs: Job[] };

async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { PHOTOS?: R2Bucket }).PHOTOS;
  if (!bucket) throw new ApiError(503, 'Chưa gắn R2 bucket PHOTOS cho Worker.');
  return bucket;
}

async function readQueue(bucket: R2Bucket): Promise<Queue> {
  const object = await bucket.get(QUEUE_KEY);
  if (!object) return { jobs: [] };
  try {
    const data = await object.json() as Queue;
    return { jobs: Array.isArray(data.jobs) ? data.jobs : [] };
  } catch {
    return { jobs: [] };
  }
}

async function writeQueue(bucket: R2Bucket, queue: Queue) {
  await bucket.put(QUEUE_KEY, JSON.stringify(queue), {
    httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'no-store' }
  });
}

function publicJob(job: Job) {
  return {
    folderId: job.folderId, status: job.status, requestedAt: job.requestedAt,
    startedAt: job.startedAt || 0, finishedAt: job.finishedAt || 0,
    detail: job.detail || '', people: job.people || 0, faceCount: job.faceCount || 0
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'status';
    const bucket = await getBucket();

    if (action === 'claim') {
      // Agent xác thực bằng khóa riêng (không dùng token đăng nhập admin).
      const agentKey = process.env.FACE_AGENT_KEY;
      if (!agentKey) throw new ApiError(503, 'Chưa đặt FACE_AGENT_KEY cho Worker.');
      if ((request.headers.get('x-agent-key') || '') !== agentKey) throw new ApiError(401, 'Sai khóa agent.');

      const queue = await readQueue(bucket);
      const now = Date.now();
      const job = queue.jobs.find((j) => j.status === 'queued' || (j.status === 'running' && now - (j.startedAt || 0) > STALE_MS));
      if (!job) return Response.json({ job: null });
      job.status = 'running';
      job.startedAt = now;
      job.detail = '';
      await writeQueue(bucket, queue);
      return Response.json({ job: { folderId: job.folderId } });
    }

    await requireAdmin(request);
    if (action !== 'status') throw new ApiError(400, 'action không hợp lệ.');
    const folderId = extractDriveFolderId(url.searchParams.get('folderId') || '');
    const queue = await readQueue(bucket);
    const job = folderId ? queue.jobs.find((j) => j.folderId === folderId) : null;
    return Response.json({ job: job ? publicJob(job) : null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action || '');
    const bucket = await getBucket();

    if (action === 'done') {
      const agentKey = process.env.FACE_AGENT_KEY;
      if (!agentKey) throw new ApiError(503, 'Chưa đặt FACE_AGENT_KEY cho Worker.');
      if ((request.headers.get('x-agent-key') || '') !== agentKey) throw new ApiError(401, 'Sai khóa agent.');

      const folderId = String(body.folderId || '');
      if (!DRIVE_ID_RE.test(folderId)) throw new ApiError(400, 'folderId không hợp lệ.');
      const queue = await readQueue(bucket);
      const job = queue.jobs.find((j) => j.folderId === folderId);
      if (!job) throw new ApiError(404, 'Không có job này.');
      job.status = body.ok ? 'done' : 'error';
      job.finishedAt = Date.now();
      job.detail = String(body.detail || '').slice(0, 300);
      job.people = Math.max(0, Math.min(10000, Math.floor(Number(body.people) || 0)));
      job.faceCount = Math.max(0, Math.min(1000000, Math.floor(Number(body.faceCount) || 0)));
      await writeQueue(bucket, queue);
      return Response.json({ ok: true });
    }

    const admin = await requireAdmin(request);
    if (action !== 'enqueue') throw new ApiError(400, 'action không hợp lệ.');

    const folderId = extractDriveFolderId(String(body.folderId || ''));
    if (!folderId) throw new ApiError(400, 'Link hoặc id folder Google Drive không hợp lệ.');

    const queue = await readQueue(bucket);
    const now = Date.now();
    let job = queue.jobs.find((j) => j.folderId === folderId);
    if (job && (job.status === 'queued' || job.status === 'running') && now - (job.startedAt || job.requestedAt) < STALE_MS) {
      return Response.json({ job: publicJob(job), alreadyQueued: true });
    }
    job = { folderId, status: 'queued', requestedAt: now, by: String(admin.email || '') };
    queue.jobs = [job, ...queue.jobs.filter((j) => j.folderId !== folderId)].slice(0, 100);
    await writeQueue(bucket, queue);
    return Response.json({ job: publicJob(job), alreadyQueued: false });
  } catch (error) {
    return errorResponse(error);
  }
}
