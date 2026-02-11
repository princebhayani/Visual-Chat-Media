'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useUIStore } from '@/store/ui-store';

export function useKeyboardShortcuts() {
  const { setSearchOpen, toggleSidebarCollapsed, setShortcutsOpen } = useUIStore();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+K - Search
      if (isCtrl && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }

      // Ctrl+Shift+S - Toggle sidebar
      if (isCtrl && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        toggleSidebarCollapsed();
      }

      // Ctrl+Shift+D - Toggle theme
      if (isCtrl && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }

      // ? - Show shortcuts (when not in input)
      if (e.key === '?' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchOpen, toggleSidebarCollapsed, setTheme, theme, setShortcutsOpen]);
}
