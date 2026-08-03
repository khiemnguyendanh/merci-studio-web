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
  const [albums, blogs] = await Promise.all([
    fetchCollection('merci_albums', ['title', 'slug', 'sub', 'coverUrl']),
    fetchCollection('merci_blogs', ['title', 'slug', 'metaDesc', 'coverUrl'])
  ]);
  const matches = (document: FirestoreDocument) => {
    const id = document.name.split('/').pop() || '';
    const title = field(document, 'title');
    return field(document, 'slug') === slug || createSlug(title) === slug || id === slug;
  };
  const album = albums.find(matches);
  if (album) return {
    type: 'album',
    title: field(album, 'title'),
    slug,
    description: field(album, 'sub') || `${field(album, 'title')} - Bộ sưu tập ảnh Merci Studio`,
    coverUrl: field(album, 'coverUrl')
  };
  const blog = blogs.find(matches);
  if (blog) return {
    type: 'blog',
    title: field(blog, 'title'),
    slug,
    description: field(blog, 'metaDesc') || field(blog, 'title'),
    coverUrl: field(blog, 'coverUrl')
  };
  return null;
}
