'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ConversationItem } from './conversation-item';
import { NewChatDialog } from './new-chat-dialog';
import { useConversations } from '@/hooks/use-conversations';
import { useChatStore } from '@/store/chat-store';
import { useUIStore } from '@/store/ui-store';
import { groupConversationsByDate } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-media-query';

export function Sidebar() {
  const {
    conversations,
    isLoadingConversations,
    deleteConversation,
    renameConversation,
    togglePin,
  } = useConversations();
  const { activeConversationId, searchQuery, setSearchQuery } = useChatStore();
  const { isSidebarCollapsed, toggleSidebarCollapsed } = useUIStore();
  const isMobile = useIsMobile();
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  const grouped = groupConversationsByDate(conversations);

  if (isMobile && isSidebarCollapsed) return null;

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? 64 : 300 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="flex h-full flex-col border-r bg-sidebar/60 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3">
          {!isSidebarCollapsed && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-semibold gradient-text"
            >
              Chat
            </motion.h2>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebarCollapsed}
            className="shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pb-2">
          <Button
            onClick={() => setShowNewChatDialog(true)}
            variant={isSidebarCollapsed ? 'ghost' : 'gradient'}
            className={isSidebarCollapsed ? 'w-8 h-8 p-0' : 'w-full justify-start gap-2'}
            size={isSidebarCollapsed ? 'icon-sm' : 'default'}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!isSidebarCollapsed && 'New Chat'}
          </Button>
        </div>

        {/* Search */}
        {!isSidebarCollapsed && (
          <div className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="h-8 pl-8 text-xs bg-muted/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}

        <Separator />

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {isLoadingConversations ? (
              <div className="space-y-2 p-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              !isSidebarCollapsed && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No conversations yet
                </p>
              )
            ) : (
              <AnimatePresence mode="popLayout">
                {grouped.map((group) => (
                  <div key={group.label} className="mb-3">
                    {!isSidebarCollapsed && (
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </p>
                    )}
                    {group.items.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={conversation.id === activeConversationId}
                        isCollapsed={isSidebarCollapsed}
                        onDelete={deleteConversation}
                        onRename={renameConversation}
                        onTogglePin={togglePin}
                      />
                    ))}
                  </div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </motion.aside>

      {/* New Chat Dialog */}
      <NewChatDialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog} />
    </>
  );
}
