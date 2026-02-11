'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';

interface SmartRepliesProps {
  conversationId: string;
  onSelect: (text: string) => void;
  triggerRefresh?: number;
}

export function SmartReplies({
  conversationId,
  onSelect,
  triggerRefresh,
}: SmartRepliesProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ suggestions: string[] }>(
        `/api/conversations/${conversationId}/smart-replies`,
      );
      setSuggestions(data.suggestions);
      setIsDismissed(false);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (triggerRefresh !== undefined) {
      fetchSuggestions();
    }
  }, [triggerRefresh, fetchSuggestions]);

  // Auto-dismiss after 30s
  useEffect(() => {
    if (suggestions.length > 0) {
      const timer = setTimeout(() => setIsDismissed(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [suggestions]);

  if (isDismissed || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        className="flex items-center gap-1.5 px-4 pb-1"
      >
        <Sparkles className="h-3 w-3 text-primary shrink-0" />
        <div className="flex gap-1.5 flex-wrap flex-1">
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => {
                onSelect(suggestion);
                setIsDismissed(true);
              }}
              className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          className="h-5 w-5 shrink-0"
          onClick={() => setIsDismissed(true)}
        >
          <X className="h-3 w-3" />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
