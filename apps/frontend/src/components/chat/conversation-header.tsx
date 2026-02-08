'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, User, Users, Info, Phone, Video, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GroupInfoPanel } from './group-info-panel';
import { SummaryDialog } from './summary-dialog';
import { useUserStore } from '@/store/user-store';
import { useAuthStore } from '@/store/auth-store';
import { useCall } from '@/hooks/use-call';
import { cn } from '@/lib/utils';
import type { Conversation, ConversationType } from '@ai-chat/shared';

interface ConversationHeaderProps {
  conversation: Conversation | undefined;
  conversationType: ConversationType;
}

export function ConversationHeader({
  conversation,
  conversationType,
}: ConversationHeaderProps) {
  const router = useRouter();
  const { isOnline } = useUserStore();
  const currentUser = useAuthStore((s) => s.user);
  const { startCall } = useCall();
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  if (!conversation) return null;

  // Get display info
  const getDisplayInfo = () => {
    if (conversationType === 'AI_CHAT') {
      return {
        icon: <Bot className="h-4 w-4" />,
        title: conversation.title || 'AI Chat',
        subtitle: 'Powered by Google Gemini',
        iconClass: 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-600 dark:text-emerald-400',
      };
    }

    if (conversationType === 'DIRECT') {
      const otherMember = conversation.members?.find(
        (m) => m.userId !== currentUser?.id,
      );
      const otherOnline = otherMember ? isOnline(otherMember.userId) : false;
      return {
        icon: <User className="h-4 w-4" />,
        title: otherMember?.user?.name || conversation.title,
        subtitle: otherOnline ? 'Online' : 'Offline',
        iconClass: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-600 dark:text-violet-400',
        showOnline: otherOnline,
      };
    }

    // GROUP
    const memberCount = conversation.members?.length || 0;
    const onlineCount = conversation.members?.filter((m) =>
      isOnline(m.userId),
    ).length || 0;
    return {
      icon: <Users className="h-4 w-4" />,
      title: conversation.groupName || conversation.title,
      subtitle: `${memberCount} members · ${onlineCount} online`,
      iconClass: 'bg-gradient-to-br from-orange-500/20 to-pink-500/20 text-orange-600 dark:text-orange-400',
    };
  };

  const info = getDisplayInfo();

  const handleLeaveGroup = () => {
    router.push('/chat');
  };

  return (
    <>
      <div className="flex items-center justify-between border-b bg-background/80 backdrop-blur-sm px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'h-9 w-9 rounded-full flex items-center justify-center',
              info.iconClass,
            )}
          >
            {info.icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold">{info.title}</h2>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              {'showOnline' in info && info.showOnline && (
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
              )}
              {info.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Call buttons for DIRECT chats */}
          {conversationType === 'DIRECT' && (() => {
            const otherMember = conversation.members?.find(
              (m) => m.userId !== currentUser?.id,
            );
            if (!otherMember) return null;
            return (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        startCall(otherMember.userId, conversation.id, 'AUDIO')
                      }
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Audio Call</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        startCall(otherMember.userId, conversation.id, 'VIDEO')
                      }
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Video Call</TooltipContent>
                </Tooltip>
              </>
            );
          })()}

          {/* AI Summarize button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setShowSummary(true)}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>AI Summary</TooltipContent>
          </Tooltip>

          {/* Group info button */}
          {conversationType === 'GROUP' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setShowGroupInfo(true)}
                >
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Group Info</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Summary Dialog */}
      <SummaryDialog
        open={showSummary}
        onOpenChange={setShowSummary}
        conversationId={conversation.id}
      />

      {/* Group Info Panel */}
      {conversationType === 'GROUP' && (
        <GroupInfoPanel
          open={showGroupInfo}
          onOpenChange={setShowGroupInfo}
          conversation={conversation}
          onLeaveGroup={handleLeaveGroup}
        />
      )}
    </>
  );
}
