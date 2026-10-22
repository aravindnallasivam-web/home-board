import { del, get, set } from 'idb-keyval';
import { useEffect, useState } from 'react';
import { uid } from '../util';

const key = (id: string) => `photo:${id}`;

/** Shrink a picked photo so the tablet's storage doesn't fill up, then save it. */
export async function savePhoto(file: File, maxSide = 1600): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo'))), 'image/jpeg', 0.86),
  );
  const id = uid();
  await set(key(id), blob);
  return id;
}

export const deletePhoto = (id: string) => del(key(id));

const cache = new Map<string, string>();

/** Object URL for a stored photo (cached for the life of the app). */
export function usePhotoUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(id ? cache.get(id) ?? null : null);
  useEffect(() => {
    let alive = true;
    if (!id) {
      setUrl(null);
      return;
    }
    const hit = cache.get(id);
    if (hit) {
      setUrl(hit);
      return;
    }
    get<Blob>(key(id)).then((blob) => {
      if (!alive || !blob) return;
      const u = URL.createObjectURL(blob);
      cache.set(id, u);
      setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}
