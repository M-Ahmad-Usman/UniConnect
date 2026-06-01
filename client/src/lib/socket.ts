import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { queryClient } from '@/lib/query-client';
import { queryKeys, ROUTES } from '@/lib/constants';
import { invalidateRoleSensitiveQueries, refreshRoleSensitiveSession } from '@/lib/role-session';
import { PostPriority } from '@/types';
import { removeNotificationsFromCache } from '@/features/notifications/cache';
import type {
  DeletedNotificationPayload,
  NewNotificationPayload,
  Notification,
  PaginatedResponse,
  UnreadCountPayload,
} from '@/types';

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
    path: '/api/socket.io',
    // Same-origin — socket path under /api so access_token cookie is sent
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

    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all(),
      refetchType: 'inactive',
    });

    if (payload.post?.channelId) {
      void queryClient.invalidateQueries({
        queryKey: ['posts', payload.post.channelId],
        refetchType: 'active',
      });
    }

    if (payload.post?.priority === PostPriority.URGENT) {
      toast.error(payload.title, {
        description: payload.message,
        action: {
          label: 'View',
          onClick: () => {
            const serverId = payload.post?.channel.serverId;
            const channelId = payload.post?.channelId;
            if (serverId && channelId) {
              window.location.href = ROUTES.CHANNEL(serverId, channelId);
            }
          },
        },
      });
    }
  });

  socket.on('notification:unread-count', (payload: UnreadCountPayload) => {
    useNotificationStore.getState().setUnreadCount(payload.count);
  });

  socket.on('notification:deleted', (payload: DeletedNotificationPayload) => {
    removeNotificationsFromCache(payload.notificationIds);
    void queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all(),
      refetchType: 'inactive',
    });
  });

  socket.on('auth:roles-updated', () => {
    void refreshRoleSensitiveSession().catch((error: unknown) => {
      console.warn('[AUTH] Failed to refresh role-sensitive session', { error });
    });
  });

  socket.on('society:lifecycle-updated', () => {
    invalidateRoleSensitiveQueries();
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

export { invalidateRoleSensitiveQueries };
