'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenu } from './user-menu';
import { ConnectionStatus } from './connection-status';
import { ThemeToggle } from './theme-toggle';
import { NotificationBell } from './notification-bell';
import { useUIStore } from '@/store/ui-store';
import { useIsMobile } from '@/hooks/use-media-query';

export function AppHeader() {
  const { toggleSidebar } = useUIStore();
  const isMobile = useIsMobile();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background/80 backdrop-blur-xl px-4">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon-sm" onClick={toggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <ConnectionStatus />
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
