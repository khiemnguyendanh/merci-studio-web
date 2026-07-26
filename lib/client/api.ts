'use client';

import { getAuth } from 'firebase/auth';

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : '';
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(input, { ...init, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Yêu cầu không thành công.');
  return data;
}
