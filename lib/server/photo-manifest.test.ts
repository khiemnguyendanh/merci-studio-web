import { describe, expect, it } from 'vitest';
import {
  emptyManifest,
  extractDriveFolderId,
  imageKeys,
  mergeAlbum,
  pickNewFiles,
  readWebpSize,
  resolveAlbumTarget,
  type Manifest
} from './photo-manifest';

const base = 'https://img.mercistudio.net/photos';

function sample(): Manifest {
  return {
    ...emptyManifest(base),
    albums: [{
      id: 'static_vay-cuoi_signature',
      slug: 'signature',
      title: 'Signature',
      sub: 'Váy cưới',
      category: 'Váy cưới',
      categories: ['Váy cưới'],
      sizes: [],
      hashtags: [],
      coverUrl: `${base}/vay-cuoi/signature/001_t.webp`,
      coverImageUrl: `${base}/vay-cuoi/signature/001.webp`,
      order: 100,
      imageCount: 1,
      images: [{ id: 'vay-cuoi/signature/001', name: 'IMG_1.JPG', url: '', thumbnailUrl: '' }]
    }]
  };
}

describe('photo manifest sync', () => {
  it('extracts folder ids from Drive links', () => {
    expect(extractDriveFolderId('https://drive.google.com/drive/folders/1nU0DJzXvsrTelAQ9Fc5P72YKSfxWzngM?usp=sharing'))
      .toBe('1nU0DJzXvsrTelAQ9Fc5P72YKSfxWzngM');
    expect(extractDriveFolderId('not a link')).toBe('');
  });

  it('reuses the existing album and category folder by name', () => {
    const t = resolveAlbumTarget(sample(), { category: 'Váy cưới', folderId: 'folderAAAAAAAA', folderName: 'Signature' });
    expect(t).toMatchObject({ albumId: 'static_vay-cuoi_signature', catSlug: 'vay-cuoi', albumSlug: 'signature', exists: true });
  });

  it('creates vest size albums with the same slug rule as build-photos', () => {
    const t = resolveAlbumTarget(sample(), { category: 'Vest', folderId: 'folderBBBBBBBB', folderName: 'xl' });
    expect(t).toMatchObject({ albumId: 'static_vest_vest-size-xl', title: 'Vest size XL', sizes: ['XL'], exists: false });
  });

  it('skips files already present by original name or drive id', () => {
    const files = [{ id: 'a'.repeat(12), name: 'img_1.jpg' }, { id: 'b'.repeat(12), name: 'IMG_2.JPG' }];
    expect(pickNewFiles(sample().albums[0], files).map((f) => f.name)).toEqual(['IMG_2.JPG']);
  });

  it('merges new images and remembers the Drive folder', () => {
    const m = sample();
    const target = { ...resolveAlbumTarget(m, { category: 'Váy cưới', folderId: 'folderAAAAAAAA', folderName: 'Signature' }), driveFolderId: 'folderAAAAAAAA' };
    const keys = imageKeys(target.catSlug, target.albumSlug, 'b'.repeat(12));
    const next = mergeAlbum(m, target, [{ id: keys.id, name: 'IMG_2.JPG', url: 'u', thumbnailUrl: 't', driveId: 'b'.repeat(12) }], 5);
    expect(next.albums[0].imageCount).toBe(2);
    expect(next.albums[0].driveFolderId).toBe('folderAAAAAAAA');
    expect(m.albums[0].images).toHaveLength(1);
    expect(resolveAlbumTarget(next, { category: 'Wedding', folderId: 'folderAAAAAAAA', folderName: 'Đổi tên' }).albumId)
      .toBe('static_vay-cuoi_signature');
  });

  it('reads WebP VP8X dimensions', () => {
    const buf = new Uint8Array(30);
    buf.set([...'RIFF'].map((c) => c.charCodeAt(0)), 0);
    buf.set([...'WEBPVP8X'].map((c) => c.charCodeAt(0)), 8);
    const w = 1279, h = 1919; // stored minus one
    buf.set([w & 0xff, (w >> 8) & 0xff, 0, h & 0xff, (h >> 8) & 0xff, 0], 24);
    expect(readWebpSize(buf)).toEqual({ width: 1280, height: 1920 });
  });
});
