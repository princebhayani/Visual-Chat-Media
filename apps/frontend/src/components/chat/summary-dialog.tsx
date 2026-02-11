'use client';

import { useState } from 'react';
import { Loader2, Copy, Check, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownRenderer } from './markdown-renderer';
import { api } from '@/lib/api-client';
import { useClipboard } from '@/hooks/use-clipboard';

interface SummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function SummaryDialog({
  open,
  onOpenChange,
  conversationId,
}: SummaryDialogProps) {
  const [summary, setSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { copy, hasCopied } = useClipboard();

  const fetchSummary = async () => {
    setIsLoading(true);
    setSummary('');
    try {
      const data = await api.post<{ summary: string }>(
        `/api/conversations/${conversationId}/summarize`,
      );
      setSummary(data.summary);
    } catch {
      setSummary('Failed to generate summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on open
  const handleOpenChange = (value: boolean) => {
    onOpenChange(value);
    if (value && !summary) {
      fetchSummary();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Summary
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyzing conversation...
              </p>
            </div>
          ) : summary ? (
            <div className="prose prose-sm dark:prose-invert max-w-none pb-4">
              <MarkdownRenderer content={summary} />
            </div>
          ) : null}
        </ScrollArea>

        {summary && !isLoading && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copy(summary)}
              className="gap-1.5"
            >
              {hasCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSummary}
              className="gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Regenerate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
