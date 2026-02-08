'use client';

import { useSocket } from '@/hooks/use-socket';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              'h-2 w-2 rounded-full transition-colors duration-300',
              isConnected ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-red-500 animate-pulse',
            )}
          />
          <span className="hidden sm:inline">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {isConnected ? 'Real-time connection active' : 'Trying to reconnect...'}
      </TooltipContent>
    </Tooltip>
  );
}
