// Agent quét mặt cho trang chọn ảnh. Chạy nền trên máy studio (Scheduled Task):
// long-poll /api/admin/face-scan, có job thì chạy face-groups.py rồi báo kết quả.
// Khóa agent nằm trong .cache/face-agent.json (không commit).
//
//   node scripts/face-agent.mjs            vòng lặp mãi (dùng cho Scheduled Task)
//   node scripts/face-agent.mjs --once     nhận tối đa 1 job rồi thoát (để test)
//   node scripts/face-agent.mjs --set-key <khóa>   lưu khóa rồi thoát

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const CONFIG = path.join(ROOT, '.cache', 'face-agent.json');
const SITE = (process.env.FACE_AGENT_SITE || 'https://www.mercistudio.net').replace(/\/+$/, '');
const POLL_MS = 20000;

function log(message) {
  const line = `${new Date().toISOString().slice(0, 19).replace('T', ' ')} ${message}`;
  console.log(line);
  try { fs.appendFileSync(path.join(ROOT, '.cache', 'face-agent.log'), line + '\n'); } catch {}
}

function loadConfig() {
  if (!fs.existsSync(CONFIG)) return {};
  try { return JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch { return {}; }
}
function saveConfig(config) {
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2));
}

async function api(key, method, query, body) {
  const res = await fetch(`${SITE}/api/admin/face-scan${query ? `?${query}` : ''}`, {
    method,
    headers: { 'x-agent-key': key, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function runScan(folderId, sourcePath) {
  return new Promise((resolve) => {
    const args = ['scripts/face-groups.py', folderId];
    if (sourcePath) args.push('--source-path', sourcePath);
    const child = spawn('python', args, { cwd: ROOT, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
    let output = '';
    const collect = (chunk) => { output = (output + chunk.toString()).slice(-4000); };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);
    child.on('error', (error) => resolve({ ok: false, detail: error.message }));
    child.on('close', (code) => {
      const people = Number(output.match(/->\s+(\d+)\s+người/)?.[1] || 0);
      const faceCount = Number(output.match(/(\d+)\s+khuôn mặt/)?.[1] || 0);
      const lastLine = output.trim().split(/\r?\n/).filter(Boolean).pop() || '';
      resolve(code === 0
        ? { ok: true, detail: `${people} người, ${faceCount} khuôn mặt`, people, faceCount }
        : { ok: false, detail: lastLine.slice(0, 300), people, faceCount });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--set-key') {
    if (!args[1]) throw new Error('Thiếu khóa.');
    saveConfig({ ...loadConfig(), key: args[1] });
    log('Đã lưu khóa agent.');
    return;
  }

  const key = process.env.FACE_AGENT_KEY || loadConfig().key;
  if (!key) throw new Error('Chưa có khóa agent. Chạy: node scripts/face-agent.mjs --set-key <khóa>');
  const once = args.includes('--once');
  log(`Agent quét mặt bắt đầu (${SITE}).`);

  for (;;) {
    try {
      const { job } = await api(key, 'GET', 'action=claim');
      if (job?.folderId) {
        log(`Nhận job: ${job.folderId}`);
        const result = await runScan(job.folderId, job.sourcePath);
        log(result.ok ? `Xong: ${result.detail}` : `Lỗi: ${result.detail}`);
        await api(key, 'POST', '', { action: 'done', folderId: job.folderId, ...result });
        if (once) return;
        continue;
      }
    } catch (error) {
      log(`Lỗi kết nối: ${error.message}`);
    }
    if (once) return;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((error) => { log(`Dừng: ${error.message}`); process.exit(1); });
