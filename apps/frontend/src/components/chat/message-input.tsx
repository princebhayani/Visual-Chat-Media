'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReplyPreview } from './reply-preview';
import { FileUploadButton } from './file-upload-button';
import { UploadProgress } from './upload-progress';
import { useSocket } from '@/hooks/use-socket';
import { useFileUpload } from '@/hooks/use-file-upload';
import { SOCKET_EVENTS } from '@ai-chat/shared';
import { cn } from '@/lib/utils';
import type { Message } from '@ai-chat/shared';

interface MessageInputProps {
  conversationId: string;
  isStreaming: boolean;
  onStop: () => void;
  replyToMessage?: Message | null;
  onCancelReply?: () => void;
  onTyping?: () => void;
}

export function MessageInput({
  conversationId,
  isStreaming,
  onStop,
  replyToMessage,
  onCancelReply,
  onTyping,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { socket } = useSocket();
  const [isFocused, setIsFocused] = useState(false);
  const { upload, isUploading, progress, error: uploadError, reset: resetUpload } = useFileUpload();
  const [uploadingFileName, setUploadingFileName] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || !socket || isStreaming) return;

    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
      conversationId,
      content: trimmed,
      ...(replyToMessage ? { replyToId: replyToMessage.id } : {}),
    });
    setContent('');
    if (onCancelReply) onCancelReply();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, socket, conversationId, isStreaming, replyToMessage, onCancelReply]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!socket) return;

      setUploadingFileName(file.name);
      const result = await upload(file);
      if (!result) return;

      // Determine message type from MIME
      let msgType = 'FILE';
      if (result.mimeType.startsWith('image/')) msgType = 'IMAGE';
      else if (result.mimeType.startsWith('video/')) msgType = 'VIDEO';
      else if (result.mimeType.startsWith('audio/')) msgType = 'AUDIO';

      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        conversationId,
        content: result.fileName,
        type: msgType,
        attachments: [
          {
            fileUrl: result.fileUrl,
            fileName: result.fileName,
            fileSize: result.fileSize,
            mimeType: result.mimeType,
          },
        ],
        ...(replyToMessage ? { replyToId: replyToMessage.id } : {}),
      });

      if (onCancelReply) onCancelReply();
      setUploadingFileName('');
      resetUpload();
    },
    [socket, conversationId, upload, replyToMessage, onCancelReply, resetUpload],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      if (replyToMessage && onCancelReply) {
        onCancelReply();
      } else if (isStreaming) {
        onStop();
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping?.();
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const charCount = content.length;
  const isNearLimit = charCount > 9000;
  const hasAIMention = content.toLowerCase().includes('@ai') || content.toLowerCase().startsWith('/ai ');

  return (
    <div className="border-t bg-background/80 backdrop-blur-xl p-4">
      <div className="mx-auto max-w-3xl">
        {/* Upload progress */}
        <AnimatePresence>
          {isUploading && (
            <UploadProgress
              fileName={uploadingFileName}
              progress={progress}
            />
          )}
        </AnimatePresence>

        {/* Upload error */}
        {uploadError && (
          <div className="mb-2 text-xs text-destructive px-1">{uploadError}</div>
        )}

        {/* Reply preview */}
        <AnimatePresence>
          {replyToMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2"
            >
              <ReplyPreview message={replyToMessage} onDismiss={onCancelReply} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI mention indicator */}
        {hasAIMention && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-emerald-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            AI will respond to this message
          </div>
        )}

        <div
          className={cn(
            'relative rounded-2xl border transition-all duration-300',
            isFocused
              ? 'border-primary/50 shadow-md shadow-primary/10'
              : 'border-border',
            isFocused && 'gradient-border',
          )}
        >
          <div className="flex items-end">
            {/* File upload button */}
            <div className="flex items-center pl-2 pb-2">
              <FileUploadButton
                onFileSelect={handleFileSelect}
                disabled={isStreaming || isUploading}
              />
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Type a message... (Shift+Enter for new line)"
              rows={1}
              className="w-full resize-none bg-transparent px-2 py-3 pr-14 text-sm focus:outline-none placeholder:text-muted-foreground scrollbar-thin"
              disabled={isStreaming || isUploading}
            />

            <div className="absolute right-2 bottom-2">
              <AnimatePresence mode="wait">
                {isStreaming ? (
                  <motion.div
                    key="stop"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Button onClick={onStop} variant="destructive" size="icon-sm" className="rounded-xl animate-pulse">
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="send"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                  >
                    <Button onClick={handleSend} disabled={!content.trim() || isUploading} size="icon-sm" variant="gradient" className="rounded-xl">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {charCount > 0 && (
          <div className="flex justify-end mt-1 px-1">
            <span className={cn('text-[10px] transition-colors', isNearLimit ? 'text-destructive' : 'text-muted-foreground')}>
              {charCount.toLocaleString()} / 10,000
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
