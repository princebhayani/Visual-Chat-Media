'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MessageSquare, User, Users, Bot, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api-client';
import { useChatStore } from '@/store/chat-store';
import { useUserStore } from '@/store/user-store';
import { useSocket } from '@/hooks/use-socket';
import { SOCKET_EVENTS } from '@ai-chat/shared';
import { cn } from '@/lib/utils';
import type { UserPublic, Conversation } from '@ai-chat/shared';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = 'dm' | 'ai' | 'group';

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const router = useRouter();
  const { socket } = useSocket();
  const { addConversation, setActiveConversation } = useChatStore();
  const { isOnline, cacheProfiles } = useUserStore();
  const [activeTab, setActiveTab] = useState<TabType>('dm');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Group creation state
  const [selectedMembers, setSelectedMembers] = useState<UserPublic[]>([]);
  const [groupName, setGroupName] = useState('');

  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await api.get<UserPublic[]>(
        `/api/users/search?q=${encodeURIComponent(query)}`,
      );
      setSearchResults(results);
      cacheProfiles(results);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [cacheProfiles]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    searchUsers(value);
  };

  const createDirectChat = async (targetUser: UserPublic) => {
    setIsCreating(true);
    try {
      const conversation = await api.post<Conversation>('/api/conversations', {
        type: 'DIRECT',
        memberIds: [targetUser.id],
      });
      addConversation(conversation);
      setActiveConversation(conversation.id);
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversation.id);
      }
      router.push(`/chat/${conversation.id}`);
      onOpenChange(false);
      resetState();
    } catch {
      // Error handled by api client
    } finally {
      setIsCreating(false);
    }
  };

  const createAIChat = async () => {
    setIsCreating(true);
    try {
      const conversation = await api.post<Conversation>('/api/conversations', {});
      addConversation(conversation);
      setActiveConversation(conversation.id);
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversation.id);
      }
      router.push(`/chat/${conversation.id}`);
      onOpenChange(false);
      resetState();
    } catch {
      // Error handled by api client
    } finally {
      setIsCreating(false);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;

    setIsCreating(true);
    try {
      const conversation = await api.post<Conversation>('/api/conversations', {
        type: 'GROUP',
        groupName: groupName.trim(),
        memberIds: selectedMembers.map((m) => m.id),
      });
      addConversation(conversation);
      setActiveConversation(conversation.id);
      if (socket) {
        socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversation.id);
      }
      router.push(`/chat/${conversation.id}`);
      onOpenChange(false);
      resetState();
    } catch {
      // Error handled by api client
    } finally {
      setIsCreating(false);
    }
  };

  const toggleMember = (user: UserPublic) => {
    setSelectedMembers((prev) => {
      if (prev.some((m) => m.id === user.id)) {
        return prev.filter((m) => m.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const resetState = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedMembers([]);
    setGroupName('');
    setActiveTab('dm');
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dm', label: 'Direct Message', icon: <User className="h-4 w-4" /> },
    { id: 'group', label: 'Group Chat', icon: <Users className="h-4 w-4" /> },
    { id: 'ai', label: 'AI Chat', icon: <Bot className="h-4 w-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetState(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* AI Chat Tab */}
        {activeTab === 'ai' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold">Start an AI Conversation</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Chat with AI powered by Google Gemini
              </p>
            </div>
            <Button
              onClick={createAIChat}
              variant="gradient"
              disabled={isCreating}
              className="w-full"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              New AI Chat
            </Button>
          </div>
        )}

        {/* DM Tab */}
        {activeTab === 'dm' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                autoFocus
              />
            </div>

            <ScrollArea className="h-[280px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery
                      ? 'No users found'
                      : 'Search for users to start a conversation'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => createDirectChat(user)}
                      disabled={isCreating}
                      className="flex items-center gap-3 w-full rounded-lg px-3 py-2.5 hover:bg-accent transition-colors text-left"
                    >
                      <div className="relative">
                        <Avatar className="h-9 w-9">
                          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                          <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isOnline(user.id) && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.status || user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Group Tab */}
        {activeTab === 'group' && (
          <div className="space-y-3">
            <Input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              autoFocus
            />

            {/* Selected members */}
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedMembers.map((member) => (
                  <span
                    key={member.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"
                  >
                    {member.name}
                    <button
                      onClick={() => toggleMember(member)}
                      className="hover:text-destructive transition-colors ml-0.5"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users to add..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>

            <ScrollArea className="h-[200px]">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {searchQuery ? 'No users found' : 'Search for users to add'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((user) => {
                    const isSelected = selectedMembers.some((m) => m.id === user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleMember(user)}
                        className={cn(
                          'flex items-center gap-3 w-full rounded-lg px-3 py-2.5 transition-colors text-left',
                          isSelected
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-accent',
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                          <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                            isSelected
                              ? 'border-primary bg-primary text-white'
                              : 'border-muted-foreground',
                          )}
                        >
                          {isSelected && (
                            <svg className="h-3 w-3" viewBox="0 0 12 12">
                              <path
                                d="M10 3L4.5 8.5 2 6"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <Button
              onClick={createGroupChat}
              variant="gradient"
              disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
              className="w-full"
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Create Group ({selectedMembers.length} member
              {selectedMembers.length !== 1 ? 's' : ''})
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
