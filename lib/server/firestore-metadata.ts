import 'server-only';

type FirestoreValue = { stringValue?: string; integerValue?: string; doubleValue?: number };
type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };

export type PublicContentMetadata = {
  type: 'album' | 'blog';
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
};

function field(document: FirestoreDocument, name: string) {
  return document.fields?.[name]?.stringValue || '';
}

function createSlug(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '');
}

async function fetchCollection(collection: string, masks: string[]) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!projectId || !apiKey) return [];
  const params = new URLSearchParams({ key: apiKey, pageSize: '300' });
  masks.forEach((mask) => params.append('mask.fieldPaths', mask));
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}?${params}`;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) return [];
  const data = await response.json() as { documents?: FirestoreDocument[] };
  return Array.isArray(data.documents) ? data.documents as FirestoreDocument[] : [];
}

export async function findPublicContent(slug: string): Promise<PublicContentMetadata | null> {
  const [albums, blogs] = await fetchPublicDocuments();
  const matches = (document: FirestoreDocument) => {
    const id = document.name.split('/').pop() || '';
    const title = field(document, 'title');
    return field(document, 'slug') === slug || createSlug(title) === slug || id === slug;
  };
  const album = albums.find(matches);
  if (album) return toPublicContent(album, 'album', slug);
  const blog = blogs.find(matches);
  return blog ? toPublicContent(blog, 'blog', slug) : null;
}

function fetchPublicDocuments() {
  return Promise.all([
    fetchCollection('merci_albums', ['title', 'slug', 'sub', 'coverUrl']),
    fetchCollection('merci_blogs', ['title', 'slug', 'metaDesc', 'coverUrl'])
  ]);
}

function toPublicContent(document: FirestoreDocument, type: PublicContentMetadata['type'], slug?: string): PublicContentMetadata {
  const title = field(document, 'title');
  const canonicalSlug = slug || field(document, 'slug') || createSlug(title) || document.name.split('/').pop() || '';
  return {
    type,
    title,
    slug: canonicalSlug,
    description: type === 'album' ? field(document, 'sub') || `${title} - Bộ sưu tập ảnh Merci Studio` : field(document, 'metaDesc') || title,
    coverUrl: field(document, 'coverUrl')
  };
}

export async function listPublicContent(): Promise<PublicContentMetadata[]> {
  const [albums, blogs] = await fetchPublicDocuments();
  const content = [
    ...albums.map((album) => toPublicContent(album, 'album')),
    ...blogs.map((blog) => toPublicContent(blog, 'blog'))
  ];
  return content.filter((item) => item.title && item.slug);
}
