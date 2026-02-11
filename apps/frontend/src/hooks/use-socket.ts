'use client';

import { useSocketContext } from '@/providers/socket-provider';

export function useSocket() {
  const { socket, isConnected } = useSocketContext();
  return { socket, isConnected };
}
