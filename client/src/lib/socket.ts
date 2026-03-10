import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { queryClient } from '@/lib/query-client';
import { queryKeys, ROUTES } from '@/lib/constants';
import type { NewNotificationPayload, PaginatedResponse, Notification, UnreadCountPayload } from '@/types';

let socket: Socket | null = null;

export function connectSocket(): void {
  if (socket) {
    if (!socket.connected) {
      socket.connect();
    }
    return;
  }

  socket = io({
    withCredentials: true,
    // Same-origin — path defaults to /socket.io
  });

  socket.on('notification:new', (payload: NewNotificationPayload) => {
    useNotificationStore.getState().incrementUnread();
    const preview = queryClient.getQueryData<PaginatedResponse<Notification>>(
      queryKeys.notifications.preview(),
    );

    if (preview) {
      queryClient.setQueryData(queryKeys.notifications.preview(), {
        ...preview,
        data: [payload, ...preview.data].slice(0, 6),
      });
    }

    queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all(), refetchType: 'inactive' });
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
