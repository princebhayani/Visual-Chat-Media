'use client';

import { useRouter } from 'next/navigation';
import { Bell, MessageSquare, AtSign, PhoneMissed, Users, Sparkles, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

interface NotificationPanelProps {
  onClose: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  NEW_MESSAGE: <MessageSquare className="h-4 w-4 text-blue-500" />,
  MENTION: <AtSign className="h-4 w-4 text-purple-500" />,
  CALL_MISSED: <PhoneMissed className="h-4 w-4 text-red-500" />,
  GROUP_INVITE: <Users className="h-4 w-4 text-orange-500" />,
  AI_COMPLETE: <Sparkles className="h-4 w-4 text-emerald-500" />,
};

function formatTimeAgo(dateStr: string) {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(dateStr).toLocaleDateString();
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const router = useRouter();
  const { notifications, markRead, markAllRead } = useNotifications();

  const handleClick = (notification: (typeof notifications)[0]) => {
    if (!notification.isRead) {
      markRead(notification.id);
    }

    // Navigate to conversation if data contains conversationId
    const data = notification.data as Record<string, unknown> | null;
    if (data?.conversationId) {
      router.push(`/chat/${data.conversationId}`);
      onClose();
    }
  };

  return (
    <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-popover shadow-lg z-50">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">Notifications</h3>
        {notifications.some((n) => !n.isRead) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllRead}
            className="h-7 text-xs gap-1"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-80">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <Bell className="h-8 w-8 opacity-30" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors',
                  !notification.isRead && 'bg-primary/5',
                )}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {typeIcons[notification.type] || <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm truncate', !notification.isRead && 'font-semibold')}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {notification.body}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
                {!notification.isRead && (
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
