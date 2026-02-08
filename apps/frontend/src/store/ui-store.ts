import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  isSearchOpen: boolean;
  isShortcutsOpen: boolean;
  isSettingsOpen: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSearchOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isSidebarCollapsed: false,
  isSearchOpen: false,
  isShortcutsOpen: false,
  isSettingsOpen: false,

  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  toggleSidebarCollapsed: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
  setShortcutsOpen: (isShortcutsOpen) => set({ isShortcutsOpen }),
  setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
}));
