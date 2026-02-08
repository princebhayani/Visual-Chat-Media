'use client';

import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageStatus } from '@ai-chat/shared';

interface MessageStatusIconProps {
  status: MessageStatus;
  className?: string;
}

export function MessageStatusIcon({ status, className }: MessageStatusIconProps) {
  switch (status) {
    case 'READ':
      return <CheckCheck className={cn('h-3 w-3 text-blue-500', className)} />;
    case 'DELIVERED':
      return <CheckCheck className={cn('h-3 w-3 text-muted-foreground', className)} />;
    case 'SENT':
    default:
      return <Check className={cn('h-3 w-3 text-muted-foreground', className)} />;
  }
}
