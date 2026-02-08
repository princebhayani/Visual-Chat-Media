'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUIStore } from '@/store/ui-store';
import { KEYBOARD_SHORTCUTS } from '@/lib/constants';

export function KeyboardShortcutsDialog() {
  const { isShortcutsOpen, setShortcutsOpen } = useUIStore();

  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

  return (
    <Dialog open={isShortcutsOpen} onOpenChange={setShortcutsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {KEYBOARD_SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {shortcut.description}
              </span>
              <div className="flex gap-1">
                {(isMac ? shortcut.mac : shortcut.keys).map((key) => (
                  <kbd
                    key={key}
                    className="rounded-md border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
