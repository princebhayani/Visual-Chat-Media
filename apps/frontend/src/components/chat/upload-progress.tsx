'use client';

import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UploadProgressProps {
  fileName: string;
  progress: number;
  onCancel?: () => void;
}

export function UploadProgress({ fileName, progress, onCancel }: UploadProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 mx-4 mb-1"
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{fileName}</p>
        <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      {onCancel && (
        <Button size="icon-sm" variant="ghost" className="h-6 w-6 shrink-0" onClick={onCancel}>
          <X className="h-3 w-3" />
        </Button>
      )}
    </motion.div>
  );
}
