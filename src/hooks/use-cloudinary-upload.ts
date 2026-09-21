import { useCallback, useState } from 'react';

import { type CloudinaryImage, uploadImage } from '@/lib/cloudinary';

export function useCloudinaryUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (localUri: string): Promise<CloudinaryImage | null> => {
    setIsUploading(true);
    setError(null);
    try {
      return await uploadImage(localUri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, error };
}
