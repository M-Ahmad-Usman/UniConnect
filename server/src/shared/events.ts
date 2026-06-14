import { EventEmitter } from "node:events";
import type { PostPriority, ServerType } from "@prisma/client";

// ─── Event Payload Types ────────────────────────────────────────────────────

export interface PostCreatedPayload {
  postId: number;
  channelId: number;
  serverId: number;
  authorId: number;
  title: string;
  priority: PostPriority;
  serverType: ServerType;
}

// ─── Event Names ────────────────────────────────────────────────────────────

export const APP_EVENTS = {
  POST_CREATED: "post:created",
} as const;

// ─── Typed Event Emitter ────────────────────────────────────────────────────

interface AppEventMap {
  [APP_EVENTS.POST_CREATED]: [PostCreatedPayload];
}

class TypedEventEmitter extends EventEmitter {
  override emit<K extends keyof AppEventMap>(event: K, ...args: AppEventMap[K]): boolean {
    return super.emit(event, ...args);
  }

  override on<K extends keyof AppEventMap>(event: K, listener: (...args: AppEventMap[K]) => void): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  override off<K extends keyof AppEventMap>(event: K, listener: (...args: AppEventMap[K]) => void): this {
    return super.off(event, listener as (...args: unknown[]) => void);
  }
}

export const appEvents = new TypedEventEmitter();
