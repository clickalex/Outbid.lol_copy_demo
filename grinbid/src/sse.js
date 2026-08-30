'use strict';

/**
 * sse.js — server-sent events hub for /api/stream.
 * Clients subscribe with their session cookie; they receive:
 *   - a `hello` with an initial snapshot revision,
 *   - `event` messages for boosts, claims, drops, tasks, referrals, admin,
 *   - `user` messages whenever their own wallet/streak changes,
 *   - and keep-alive pings every 25 s.
 */

const crypto = require('crypto');

class SseHub {
  constructor() {
    this.clients = new Map(); // id -> { res, userId, send }
    this.history = [];
    this.maxHistory = 200;
    this._pingTimer = setInterval(() => this.pingAll(), 25_000);
    if (this._pingTimer.unref) this._pingTimer.unref();
  }

  get clientCount() {
    return this.clients.size;
  }

  subscribe(res, userId) {
    const id = crypto.randomUUID();
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 3000\n\n');

    const client = {
      id,
      res,
      userId,
      send: (event, data) => {
        if (res.writableEnded || res.destroyed) return false;
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        if (!event.startsWith('ping') && !event.startsWith('hello')) {
          this._remember(event, data, userId);
        }
        try {
          res.write(`event: ${event}\ndata: ${payload}\n\n`);
          return true;
        } catch {
          return false;
        }
      }
    };
    this.clients.set(id, client);
    this.broadcastRaw('presence', { online: this.clients.size, clientId: id });
    const snapshot = this._snapshot();
    client.send('hello', snapshot);
    return { client, id };
  }

  _remember(event, data, userId) {
    this.history.push({ event, data, userId, at: Date.now() });
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  _snapshot() {
    return {
      online: this.clients.size,
      revision: this.history.length,
      serverTime: new Date().toISOString()
    };
  }

  pingAll() {
    for (const c of this.clients.values()) {
      c.send('ping', { t: Date.now() });
    }
  }

  /** Broadcast to every connected client. */
  broadcast(event, data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    for (const c of this.clients.values()) {
      if (c.res.writableEnded || c.res.destroyed) continue;
      try {
        c.res.write(`event: ${event}\ndata: ${payload}\n\n`);
      } catch {
        /* dropped below */
      }
    }
    this._remember(event, data, null);
  }

  /** Broadcast to a specific user only (their wallet changed). */
  toUser(userId, event, data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    for (const c of this.clients.values()) {
      if (c.userId !== userId) continue;
      if (c.res.writableEnded || c.res.destroyed) continue;
      try {
        c.res.write(`event: ${event}\ndata: ${payload}\n\n`);
      } catch {
        /* dropped below */
      }
    }
    this._remember(event, data, userId);
  }

  broadcastRaw(event, data) {
    this.broadcast(event, data);
  }

  remove(clientId) {
    const c = this.clients.get(clientId);
    if (c) {
      this.clients.delete(clientId);
      try { c.res.end(); } catch {}
      this.broadcastRaw('presence', { online: this.clients.size });
    }
  }
}

module.exports = { SseHub };
