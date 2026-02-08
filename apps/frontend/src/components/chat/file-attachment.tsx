'use client';

import { useState } from 'react';
import { FileText, Download, Image, Film, Music, File, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { API_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Attachment } from '@ai-chat/shared';

interface FileAttachmentProps {
  attachment: Attachment;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5" />;
  if (mimeType.startsWith('video/')) return <Film className="h-5 w-5" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5" />;
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
}

function getFullUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${API_URL}${path}`;
}

// Image attachment with lightbox
function ImageAttachment({ attachment }: FileAttachmentProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const thumbUrl = attachment.thumbnailUrl
    ? getFullUrl(attachment.thumbnailUrl)
    : getFullUrl(attachment.fileUrl);

  return (
    <>
      <button
        onClick={() => setShowLightbox(true)}
        className="rounded-lg overflow-hidden max-w-[300px] cursor-pointer hover:opacity-90 transition-opacity"
      >
        <img
          src={thumbUrl}
          alt={attachment.fileName}
          className="max-h-[300px] w-auto object-cover rounded-lg"
          loading="lazy"
        />
      </button>

      <Dialog open={showLightbox} onOpenChange={setShowLightbox}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/90 border-none">
          <img
            src={getFullUrl(attachment.fileUrl)}
            alt={attachment.fileName}
            className="max-w-full max-h-[85vh] object-contain mx-auto"
          />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5">
            <span className="text-xs text-white">{attachment.fileName}</span>
            <a
              href={getFullUrl(attachment.fileUrl)}
              download={attachment.fileName}
              className="text-white hover:text-primary transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Video attachment with inline player
function VideoAttachment({ attachment }: FileAttachmentProps) {
  return (
    <div className="rounded-lg overflow-hidden max-w-[400px]">
      <video
        src={getFullUrl(attachment.fileUrl)}
        controls
        className="max-h-[300px] w-full rounded-lg"
        poster={attachment.thumbnailUrl ? getFullUrl(attachment.thumbnailUrl) : undefined}
        preload="metadata"
      />
      <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
        {attachment.fileName} · {formatFileSize(attachment.fileSize)}
      </p>
    </div>
  );
}

// Audio attachment with player
function AudioAttachment({ attachment }: FileAttachmentProps) {
  return (
    <div className="rounded-lg bg-muted/40 p-2 min-w-[250px] max-w-[350px]">
      <div className="flex items-center gap-2 mb-1">
        <Music className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs font-medium truncate">{attachment.fileName}</span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatFileSize(attachment.fileSize)}
        </span>
      </div>
      <audio
        src={getFullUrl(attachment.fileUrl)}
        controls
        className="w-full h-8"
        preload="metadata"
      />
    </div>
  );
}

// Generic file attachment
function GenericAttachment({ attachment }: FileAttachmentProps) {
  return (
    <a
      href={getFullUrl(attachment.fileUrl)}
      download={attachment.fileName}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/60 transition-colors max-w-[300px]"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {getFileIcon(attachment.mimeType)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatFileSize(attachment.fileSize)}
        </p>
      </div>
      <Download className="h-4 w-4 text-muted-foreground shrink-0" />
    </a>
  );
}

export function FileAttachment({ attachment }: FileAttachmentProps) {
  if (attachment.mimeType.startsWith('image/')) {
    return <ImageAttachment attachment={attachment} />;
  }
  if (attachment.mimeType.startsWith('video/')) {
    return <VideoAttachment attachment={attachment} />;
  }
  if (attachment.mimeType.startsWith('audio/')) {
    return <AudioAttachment attachment={attachment} />;
  }
  return <GenericAttachment attachment={attachment} />;
}
