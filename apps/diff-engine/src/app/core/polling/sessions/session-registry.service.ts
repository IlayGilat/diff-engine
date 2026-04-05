import { Injectable } from '@nestjs/common';
import { ActivePollingSession } from './models/active-polling-session.model';

@Injectable()
export class SessionRegistryService {
  private readonly sessions = new Map<string, ActivePollingSession>();
  private readonly streamIdsByConnectionId = new Map<string, Set<string>>();
  private readonly connectionIdByStreamId = new Map<string, string>();

  // Returns the current runtime session for one stream.
  getSession(streamId: string): ActivePollingSession | undefined {
    return this.sessions.get(streamId);
  }

  // Stores the latest runtime session state for one stream.
  saveSession(session: ActivePollingSession): ActivePollingSession {
    this.sessions.set(session.streamId, session);
    return session;
  }

  // Deletes one stream and clears any connection index that points to it.
  deleteSession(streamId: string): void {
    this.sessions.delete(streamId);
    this.removeStreamConnection(streamId);
  }

  // Lists the active stream ids so cleanup can stop everything on shutdown.
  listStreamIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  // Lists streams whose TTL already expired.
  listExpiredStreamIds(now: number): string[] {
    return Array.from(this.sessions.values())
      .filter((session) => session.expiresAt <= now)
      .map((session) => session.streamId);
  }

  // Refreshes the TTL for one stream while the client is still alive.
  refreshLease(streamId: string, ttlMs: number): boolean {
    const session = this.sessions.get(streamId);
    if (!session) {
      return false;
    }

    session.expiresAt = Date.now() + ttlMs;
    this.sessions.set(streamId, session);
    return true;
  }

  // Binds a stream to the current websocket connection.
  bindStreamToConnection(connectionId: string, streamId: string): void {
    this.removeStreamConnection(streamId);

    const streamIds = this.streamIdsByConnectionId.get(connectionId) ?? new Set();
    streamIds.add(streamId);

    this.streamIdsByConnectionId.set(connectionId, streamIds);
    this.connectionIdByStreamId.set(streamId, connectionId);
  }

  // Releases every stream that belonged to one websocket connection.
  releaseConnection(connectionId: string): string[] {
    const streamIds = this.streamIdsByConnectionId.get(connectionId);
    if (!streamIds) {
      return [];
    }

    this.streamIdsByConnectionId.delete(connectionId);
    Array.from(streamIds).forEach((streamId) => {
      this.connectionIdByStreamId.delete(streamId);
    });

    return Array.from(streamIds);
  }

  // Clears the reverse connection lookup for one stream.
  removeStreamConnection(streamId: string): void {
    const connectionId = this.connectionIdByStreamId.get(streamId);
    if (!connectionId) {
      return;
    }

    this.connectionIdByStreamId.delete(streamId);
    const streamIds = this.streamIdsByConnectionId.get(connectionId);
    if (!streamIds) {
      return;
    }

    streamIds.delete(streamId);
    if (streamIds.size === 0) {
      this.streamIdsByConnectionId.delete(connectionId);
    }
  }
}
