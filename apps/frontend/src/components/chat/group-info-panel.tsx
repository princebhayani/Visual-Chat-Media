'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  LogOut,
  Shield,
  ShieldCheck,
  Crown,
  X,
  Pencil,
  Check,
  Loader2,
  Search,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { useUserStore } from '@/store/user-store';
import { cn } from '@/lib/utils';
import type { Conversation, ConversationMember, UserPublic } from '@ai-chat/shared';

interface GroupInfoPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  onLeaveGroup?: () => void;
}

export function GroupInfoPanel({
  open,
  onOpenChange,
  conversation,
  onLeaveGroup,
}: GroupInfoPanelProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { updateConversation } = useChatStore();
  const { isOnline } = useUserStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(conversation.groupName || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState(conversation.description || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserPublic[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);

  const members = conversation.members || [];
  const currentMember = members.find((m) => m.userId === currentUser?.id);
  const isOwner = currentMember?.role === 'OWNER';
  const isAdmin = currentMember?.role === 'ADMIN' || isOwner;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'ADMIN':
        return <ShieldCheck className="h-3 w-3 text-blue-500" />;
      default:
        return null;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'Owner';
      case 'ADMIN':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  const handleUpdateName = async () => {
    if (!editName.trim() || editName === conversation.groupName) {
      setIsEditingName(false);
      return;
    }
    setIsUpdating(true);
    try {
      await api.patch(`/api/conversations/${conversation.id}`, {
        groupName: editName.trim(),
      });
      updateConversation(conversation.id, { groupName: editName.trim() });
      setIsEditingName(false);
    } catch {
      // Error handled by api client
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (editDesc === conversation.description) {
      setIsEditingDesc(false);
      return;
    }
    setIsUpdating(true);
    try {
      await api.patch(`/api/conversations/${conversation.id}`, {
        description: editDesc.trim() || null,
      });
      updateConversation(conversation.id, { description: editDesc.trim() || null });
      setIsEditingDesc(false);
    } catch {
      // Error handled by api client
    } finally {
      setIsUpdating(false);
    }
  };

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
      // Filter out existing members
      const memberIds = new Set(members.map((m) => m.userId));
      setSearchResults(results.filter((u) => !memberIds.has(u.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [members]);

  const handleAddMember = async (userId: string) => {
    setIsAddingMember(true);
    try {
      await api.post(`/api/conversations/${conversation.id}/members`, {
        userId,
      });
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      setMemberSearch('');
    } catch {
      // Error handled by api client
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.delete(`/api/conversations/${conversation.id}/members/${userId}`);
    } catch {
      // Error handled by api client
    }
  };

  const handleUpdateRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    try {
      await api.patch(
        `/api/conversations/${conversation.id}/members/${userId}/role`,
        { role },
      );
    } catch {
      // Error handled by api client
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser) return;
    try {
      await api.delete(
        `/api/conversations/${conversation.id}/members/${currentUser.id}`,
      );
      onLeaveGroup?.();
      onOpenChange(false);
    } catch {
      // Error handled by api client
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Group Info
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-4">
            {/* Group Avatar & Name */}
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center">
                <Users className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>

              {isEditingName ? (
                <div className="flex items-center gap-1 w-full max-w-[250px]">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-center"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleUpdateName}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setIsEditingName(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-semibold">
                    {conversation.groupName || conversation.title}
                  </h3>
                  {isAdmin && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setEditName(conversation.groupName || conversation.title);
                        setIsEditingName(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Description
                </p>
                {isAdmin && !isEditingDesc && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={() => {
                      setEditDesc(conversation.description || '');
                      setIsEditingDesc(true);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {isEditingDesc ? (
                <div className="flex items-start gap-1">
                  <Input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Add a description..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateDescription();
                      if (e.key === 'Escape') setIsEditingDesc(false);
                    }}
                  />
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={handleUpdateDescription}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setIsEditingDesc(false)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {conversation.description || 'No description'}
                </p>
              )}
            </div>

            <Separator />

            {/* Members */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Members ({members.length})
                </p>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => setShowAddMember(!showAddMember)}
                  >
                    <UserPlus className="h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>

              {/* Add Member Search */}
              <AnimatePresence>
                {showAddMember && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pb-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search users to add..."
                          className="h-8 pl-8 text-xs"
                          value={memberSearch}
                          onChange={(e) => {
                            setMemberSearch(e.target.value);
                            searchUsers(e.target.value);
                          }}
                          autoFocus
                        />
                      </div>
                      {isSearching && (
                        <div className="flex justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors"
                        >
                          <Avatar className="h-7 w-7">
                            {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                            <AvatarFallback className="text-[10px] bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{user.name}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] px-2"
                            onClick={() => handleAddMember(user.id)}
                            disabled={isAddingMember}
                          >
                            {isAddingMember ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Add'
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Separator />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Member List */}
              <div className="space-y-1">
                {members.map((member) => {
                  const isSelf = member.userId === currentUser?.id;
                  const memberOnline = isOnline(member.userId);

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent/50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          {member.user?.avatarUrl && (
                            <AvatarImage src={member.user.avatarUrl} />
                          )}
                          <AvatarFallback
                            className={cn(
                              'text-xs text-white',
                              member.role === 'OWNER'
                                ? 'bg-gradient-to-br from-yellow-500 to-orange-500'
                                : member.role === 'ADMIN'
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-500'
                                  : 'bg-gradient-to-br from-violet-500 to-purple-600',
                            )}
                          >
                            {member.user?.name?.charAt(0)?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        {memberOnline && (
                          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-green-500 ring-1 ring-background" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium truncate">
                            {member.user?.name || 'Unknown'}
                            {isSelf && (
                              <span className="text-muted-foreground ml-1">(you)</span>
                            )}
                          </p>
                          {getRoleIcon(member.role)}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {getRoleLabel(member.role)}
                          {memberOnline ? ' · Online' : ''}
                        </p>
                      </div>

                      {/* Actions */}
                      {!isSelf && isOwner && (
                        <div className="flex items-center gap-0.5">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() =>
                                  handleUpdateRole(
                                    member.userId,
                                    member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN',
                                  )
                                }
                              >
                                {member.role === 'ADMIN' ? (
                                  <Shield className="h-3 w-3" />
                                ) : (
                                  <ShieldCheck className="h-3 w-3" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {member.role === 'ADMIN'
                                ? 'Demote to Member'
                                : 'Promote to Admin'}
                            </TooltipContent>
                          </Tooltip>
                          {member.role !== 'OWNER' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon-sm"
                                  variant="ghost"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveMember(member.userId)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}

                      {!isSelf && isAdmin && !isOwner && member.role === 'MEMBER' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(member.userId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Leave Group */}
            {!isOwner && (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleLeaveGroup}
              >
                <LogOut className="h-4 w-4" />
                Leave Group
              </Button>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
