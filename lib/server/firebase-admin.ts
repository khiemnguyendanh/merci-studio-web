import 'server-only';

type FirestoreData = Record<string, unknown>;
type FirestoreValue = Record<string, unknown>;
type Write = {
  update?: { name: string; fields: Record<string, FirestoreValue> };
  updateMask?: { fieldPaths: string[] };
  updateTransforms?: Array<{ fieldPath: string; setToServerValue: 'REQUEST_TIME' }>;
  currentDocument?: { exists: boolean };
  delete?: string;
};

export type DecodedIdToken = Record<string, unknown> & {
  uid: string;
  sub: string;
  email?: string;
  admin?: boolean;
};

const serverTimestampValue = Object.freeze({ __merciServerTimestamp: true });

export const FieldValue = {
  serverTimestamp: () => serverTimestampValue
};

function isServerTimestamp(value: unknown): value is typeof serverTimestampValue {
  return Boolean(
    value &&
    typeof value === 'object' &&
    '__merciServerTimestamp' in value &&
    (value as { __merciServerTimestamp?: boolean }).__merciServerTimestamp
  );
}

function projectId() {
  const value = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!value) throw new Error('Missing FIREBASE_PROJECT_ID.');
  return value;
}

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      clientEmail: String(parsed.client_email || parsed.clientEmail || ''),
      privateKey: String(parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n')
    };
  }

  return {
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  };
}

function base64Url(input: Uint8Array | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function pemBytes(pem: string) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

let accessTokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return accessTokenCache.token;
  }

  const account = serviceAccount();
  if (!account.clientEmail || !account.privateKey) {
    throw new Error('Missing Firebase service-account credentials.');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64Url(JSON.stringify({
    iss: account.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemBytes(account.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsigned)
  );
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const result = await response.json() as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || 'Unable to authenticate the Firebase service account.');
  }

  accessTokenCache = {
    token: result.access_token,
    expiresAt: Date.now() + Math.max(60, Number(result.expires_in || 3600) - 60) * 1000
  };
  return result.access_token;
}

function firestoreRoot() {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId())}/databases/(default)`;
}

function documentName(path: string) {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `projects/${projectId()}/databases/(default)/documents/${encoded}`;
}

function documentUrl(path: string) {
  return `https://firestore.googleapis.com/v1/${documentName(path)}`;
}

function encodeValue(value: unknown): FirestoreValue {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (value && typeof value === 'object') {
    return { mapValue: { fields: encodeFields(value as FirestoreData) } };
  }
  throw new Error(`Unsupported Firestore value: ${typeof value}`);
}

function encodeFields(data: FirestoreData) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined && !isServerTimestamp(value))
      .map(([key, value]) => [key, encodeValue(value)])
  );
}

function decodeValue(value: FirestoreValue): unknown {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: FirestoreValue[] })?.values || [];
    return values.map(decodeValue);
  }
  if ('mapValue' in value) {
    return decodeFields((value.mapValue as { fields?: Record<string, FirestoreValue> })?.fields || {});
  }
  return undefined;
}

function decodeFields(fields: Record<string, FirestoreValue>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function writeFor(ref: DocumentReference, data: FirestoreData, mode: 'set' | 'merge' | 'create' | 'update'): Write {
  const regularFields = Object.keys(data).filter((field) => !isServerTimestamp(data[field]));
  const transforms = Object.keys(data)
    .filter((field) => isServerTimestamp(data[field]))
    .map((fieldPath) => ({ fieldPath, setToServerValue: 'REQUEST_TIME' as const }));
  const write: Write = {
    update: { name: documentName(ref.path), fields: encodeFields(data) }
  };
  if (mode === 'merge' || mode === 'update') write.updateMask = { fieldPaths: regularFields };
  if (mode === 'create') write.currentDocument = { exists: false };
  if (mode === 'update') write.currentDocument = { exists: true };
  if (transforms.length) write.updateTransforms = transforms;
  return write;
}

class FirestoreRestError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

async function firestoreFetch(url: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: { status?: string; message?: string } };
    throw new FirestoreRestError(
      result.error?.status || `HTTP_${response.status}`,
      result.error?.message || `Firestore request failed with ${response.status}.`,
      response.status
    );
  }
  return response;
}

async function commit(writes: Write[], transaction?: string) {
  await firestoreFetch(`${firestoreRoot()}/documents:commit`, {
    method: 'POST',
    body: JSON.stringify({ writes, ...(transaction ? { transaction } : {}) })
  });
}

export class DocumentSnapshot {
  constructor(
    public readonly ref: DocumentReference,
    private readonly value: FirestoreData | null
  ) {}

  get exists() {
    return this.value !== null;
  }

  data() {
    return this.value === null ? undefined : this.value;
  }
}

export class DocumentReference {
  readonly id: string;

  constructor(public readonly path: string) {
    this.id = path.split('/').pop() || '';
  }

  async _get(transaction?: string) {
    const suffix = transaction ? `?transaction=${encodeURIComponent(transaction)}` : '';
    try {
      const response = await firestoreFetch(`${documentUrl(this.path)}${suffix}`);
      const document = await response.json() as { fields?: Record<string, FirestoreValue> };
      return new DocumentSnapshot(this, decodeFields(document.fields || {}));
    } catch (error) {
      if (error instanceof FirestoreRestError && error.status === 404) {
        return new DocumentSnapshot(this, null);
      }
      throw error;
    }
  }

  get() {
    return this._get();
  }

  async set(data: FirestoreData, options?: { merge?: boolean }) {
    await commit([writeFor(this, data, options?.merge ? 'merge' : 'set')]);
  }

  async delete() {
    await commit([{ delete: documentName(this.path) }]);
  }
}

class QuerySnapshot {
  constructor(public readonly docs: DocumentSnapshot[]) {}
  get empty() {
    return this.docs.length === 0;
  }
}

class Query {
  private maxResults = 300;

  constructor(
    private readonly collectionId: string,
    private readonly field: string,
    private readonly value: unknown
  ) {}

  limit(value: number) {
    this.maxResults = value;
    return this;
  }

  async get() {
    const response = await firestoreFetch(`${firestoreRoot()}/documents:runQuery`, {
      method: 'POST',
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: this.collectionId }],
          where: {
            fieldFilter: {
              field: { fieldPath: this.field },
              op: 'EQUAL',
              value: encodeValue(this.value)
            }
          },
          limit: this.maxResults
        }
      })
    });
    const rows = await response.json() as Array<{ document?: { name: string; fields?: Record<string, FirestoreValue> } }>;
    const docs = rows.flatMap((row) => {
      if (!row.document) return [];
      const marker = '/documents/';
      const path = row.document.name.slice(row.document.name.indexOf(marker) + marker.length);
      const ref = new DocumentReference(path);
      return [new DocumentSnapshot(ref, decodeFields(row.document.fields || {}))];
    });
    return new QuerySnapshot(docs);
  }
}

class CollectionReference {
  constructor(private readonly path: string) {}

  doc(id = autoId()) {
    return new DocumentReference(`${this.path}/${id}`);
  }

  where(field: string, operator: '==', value: unknown) {
    if (operator !== '==') throw new Error(`Unsupported Firestore operator: ${operator}`);
    return new Query(this.path, field, value);
  }
}

class Transaction {
  readonly writes: Write[] = [];

  constructor(private readonly id: string) {}

  get(ref: DocumentReference) {
    return ref._get(this.id);
  }

  create(ref: DocumentReference, data: FirestoreData) {
    this.writes.push(writeFor(ref, data, 'create'));
  }

  update(ref: DocumentReference, data: FirestoreData) {
    this.writes.push(writeFor(ref, data, 'update'));
  }
}

function autoId() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export const adminDb = {
  collection(path: string) {
    return new CollectionReference(path);
  },

  async runTransaction<T>(callback: (transaction: Transaction) => Promise<T>) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const begin = await firestoreFetch(`${firestoreRoot()}/documents:beginTransaction`, {
        method: 'POST',
        body: JSON.stringify({ options: { readWrite: {} } })
      });
      const { transaction: id } = await begin.json() as { transaction: string };
      const transaction = new Transaction(id);
      try {
        const result = await callback(transaction);
        await commit(transaction.writes, id);
        return result;
      } catch (error) {
        await firestoreFetch(`${firestoreRoot()}/documents:rollback`, {
          method: 'POST',
          body: JSON.stringify({ transaction: id })
        }).catch(() => undefined);
        if (error instanceof FirestoreRestError && error.code === 'ABORTED' && attempt < 2) continue;
        throw error;
      }
    }
    throw new Error('Firestore transaction failed after retries.');
  }
};

type FirebaseJwk = JsonWebKey & { kid?: string };

let firebaseJwkCache: { keys: FirebaseJwk[]; expiresAt: number } | null = null;

async function firebaseJwks() {
  if (firebaseJwkCache && firebaseJwkCache.expiresAt > Date.now()) return firebaseJwkCache.keys;
  const response = await fetch(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  );
  if (!response.ok) throw new Error('Unable to load Firebase signing keys.');
  const result = await response.json() as { keys?: FirebaseJwk[] };
  const cacheControl = response.headers.get('cache-control') || '';
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600);
  firebaseJwkCache = { keys: result.keys || [], expiresAt: Date.now() + maxAge * 1000 };
  return firebaseJwkCache.keys;
}

async function verifyIdToken(token: string): Promise<DecodedIdToken> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed Firebase token.');
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as { alg?: string; kid?: string };
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as Record<string, unknown>;
  if (header.alg !== 'RS256' || !header.kid) throw new Error('Unsupported Firebase token algorithm.');

  const jwk = (await firebaseJwks()).find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw new Error('Unknown Firebase signing key.');
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const validSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!validSignature) throw new Error('Invalid Firebase token signature.');

  const project = projectId();
  const now = Math.floor(Date.now() / 1000);
  const subject = String(payload.sub || '');
  if (
    payload.aud !== project ||
    payload.iss !== `https://securetoken.google.com/${project}` ||
    !subject ||
    subject.length > 128 ||
    Number(payload.exp || 0) <= now ||
    Number(payload.iat || 0) > now
  ) {
    throw new Error('Invalid Firebase token claims.');
  }
  return { ...payload, uid: subject, sub: subject } as DecodedIdToken;
}

export const adminAuth = { verifyIdToken };
