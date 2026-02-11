'use client';

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useClipboard(timeout = 2000) {
  const [hasCopied, setHasCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setHasCopied(true);
        toast.success('Copied to clipboard');
        setTimeout(() => setHasCopied(false), timeout);
      } catch {
        toast.error('Failed to copy');
      }
    },
    [timeout],
  );

  return { copy, hasCopied };
}
