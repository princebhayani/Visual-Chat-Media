import { create } from 'zustand';
import type { UserPublic } from '@ai-chat/shared';

interface UserState {
  onlineUsers: Set<string>;
  userProfiles: Record<string, UserPublic>;

  setUserOnline: (userId: string) => void;
  setUserOffline: (userId: string) => void;
  cacheProfile: (user: UserPublic) => void;
  cacheProfiles: (users: UserPublic[]) => void;
  isOnline: (userId: string) => boolean;
  getProfile: (userId: string) => UserPublic | undefined;
}

export const useUserStore = create<UserState>((set, get) => ({
  onlineUsers: new Set(),
  userProfiles: {},

  setUserOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.add(userId);
      return { onlineUsers: next };
    }),

  setUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),

  cacheProfile: (user) =>
    set((state) => ({
      userProfiles: { ...state.userProfiles, [user.id]: user },
    })),

  cacheProfiles: (users) =>
    set((state) => {
      const next = { ...state.userProfiles };
      for (const user of users) {
        next[user.id] = user;
      }
      return { userProfiles: next };
    }),

  isOnline: (userId) => get().onlineUsers.has(userId),

  getProfile: (userId) => get().userProfiles[userId],
}));
