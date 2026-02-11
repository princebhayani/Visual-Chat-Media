'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface UploadResult {
  fileUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

interface UseFileUploadReturn {
  upload: (file: File) => Promise<UploadResult | null>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useFileUpload(): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Use simple fetch-based upload via api client
      // Progress tracking would need XMLHttpRequest but for simplicity we use fetch
      setProgress(50); // Simulate mid-progress

      const result = await api.upload<UploadResult>('/api/upload', formData);
      setProgress(100);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, progress, error, reset };
}
