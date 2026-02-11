'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { Sidebar } from '@/components/chat/sidebar';
import { AppHeader } from '@/components/layout/app-header';
import { KeyboardShortcutsDialog } from '@/components/layout/keyboard-shortcuts';
import { SettingsDialog } from '@/components/layout/settings-dialog';
import { SocketProvider } from '@/providers/socket-provider';
import { CallProvider } from '@/providers/call-provider';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { usePresence } from '@/hooks/use-presence';

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  usePresence();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <KeyboardShortcutsDialog />
      <SettingsDialog />
    </div>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <SocketProvider>
        <CallProvider>
          <MainLayoutInner>{children}</MainLayoutInner>
        </CallProvider>
      </SocketProvider>
    </AuthGuard>
  );
}
