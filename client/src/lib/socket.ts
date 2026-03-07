import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { queryClient } from '@/lib/query-client';
import { queryKeys, ROUTES } from '@/lib/constants';
import type { UnreadCountPayload } from '@/types/notification.types';

let socket: Socket | null = null;

export function connectSocket(): void {
  if (socket?.connected) return;

  socket = io({
    withCredentials: true,
    // Same-origin — path defaults to /socket.io
  });

  socket.on('notification:new', () => {
    useNotificationStore.getState().incrementUnread();
    // Invalidate notifications list so it refetches when viewed
    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.list() });
  });

  socket.on('notification:unread-count', (payload: UnreadCountPayload) => {
    useNotificationStore.getState().setUnreadCount(payload.count);
  });

  socket.on('auth:expired', () => {
    disconnectSocket();
    useAuthStore.getState().clearUser();
    queryClient.clear();
    window.location.href = ROUTES.LOGIN;
  });
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
