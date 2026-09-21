import * as Crypto from 'expo-crypto';
import { File, UploadType } from 'expo-file-system';

import { uuid } from './id';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.EXPO_PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.EXPO_PUBLIC_CLOUDINARY_API_SECRET;

const UPLOAD_FOLDER = 'personal-journal';

export type CloudinaryImage = {
  publicId: string;
  url: string;
  width: number;
  height: number;
};

function assertConfigured() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    throw new Error(
      'Cloudinary is not configured — set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET in .env',
    );
  }
}

/** Cloudinary's documented signing algorithm: sort params, join as k=v&k2=v2,
 * append the api_secret with no separator, SHA-1 hash the result. */
async function sign(params: Record<string, string | number>): Promise<string> {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA1, `${toSign}${API_SECRET}`, {
    encoding: Crypto.CryptoEncoding.HEX,
  });
}

/** Uploads a local image (e.g. an expo-image-picker asset URI) to Cloudinary via a
 * signed upload, computed on-device — see the plan's accepted trade-off on embedding
 * the API secret client-side for this private, single-user app.
 *
 * Uses expo-file-system's native multipart upload task rather than
 * `fetch` + `FormData`: SDK 57's fetch implementation doesn't support React
 * Native's `{ uri, name, type }` local-file FormData part (it only accepts a
 * string or a real Blob/File — appending a local file this way throws
 * "Unsupported FormDataPart implementation" at runtime). The native upload
 * task sidesteps that entirely. */
export async function uploadImage(localUri: string): Promise<CloudinaryImage> {
  assertConfigured();

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = uuid();
  const signature = await sign({ folder: UPLOAD_FOLDER, public_id: publicId, timestamp });

  const file = new File(localUri);
  const result = await file.upload(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    uploadType: UploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'image/jpeg',
    parameters: {
      api_key: API_KEY!,
      timestamp: String(timestamp),
      signature,
      public_id: publicId,
      folder: UPLOAD_FOLDER,
    },
  });

  const json = JSON.parse(result.body);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(json?.error?.message ?? `Cloudinary upload failed (${result.status})`);
  }
  return { publicId: json.public_id, url: json.secure_url, width: json.width, height: json.height };
}

/** Signed delete — called when an image is removed from an entry or an entry is
 * deleted. No file involved here, so a plain URL-encoded POST body (not
 * FormData) keeps this off the same fetch/FormData incompatibility above. */
export async function destroyImage(publicId: string): Promise<void> {
  assertConfigured();

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await sign({ public_id: publicId, timestamp });

  const body = new URLSearchParams({
    public_id: publicId,
    api_key: API_KEY!,
    timestamp: String(timestamp),
    signature,
  });

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const json = await response.json();
  if (!response.ok || (json.result !== 'ok' && json.result !== 'not found')) {
    throw new Error(json?.error?.message ?? `Cloudinary destroy failed (${response.status})`);
  }
}

/** Inserts a Cloudinary delivery transformation (e.g. `w_600,c_limit,q_auto,f_auto`)
 * right after `/upload/` in a secure_url, for right-sized thumbnails in lists. */
export function transformUrl(url: string, transformation: string): string {
  return url.replace('/upload/', `/upload/${transformation}/`);
}
