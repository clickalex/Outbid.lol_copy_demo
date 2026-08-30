'use strict';

/**
 * router.js — tiny framework-free HTTP router mapping the Grinbid API.
 * Express-free: matches method + pattern, supports :params, and hands the
 * remaining job to src/api.js handlers. Includes static file serving for
 * /public (with an SPA hash-routing friendly fallback) and error helpers.
 */

const path = require('path');
const fs = require('fs');
const { CONFIG } = require('./config');

class RouteError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

class Router {
  constructor() {
    this.routes = []; // { method, parts, handler }
    this.notFound = null;
    this.errorHandler = null;
  }

  add(method, pattern, handler) {
    const parts = pattern.split('/').filter(Boolean).map((p) => {
      if (p.startsWith(':')) return { param: p.slice(1) };
      return { literal: p };
    });
    this.routes.push({ method, parts, handler });
    return this;
  }

  get(p, h) { return this.add('GET', p, h); }
  post(p, h) { return this.add('POST', p, h); }
  put(p, h) { return this.add('PUT', p, h); }
  patch(p, h) { return this.add('PATCH', p, h); }
  delete(p, h) { return this.add('DELETE', p, h); }

  match(method, urlPath) {
    const parts = urlPath.split('/').filter(Boolean);
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (route.parts.length !== parts.length) continue;
      const params = {};
      let ok = true;
      for (let i = 0; i < parts.length; i += 1) {
        const rp = route.parts[i];
        if (rp.param) params[rp.param] = decodeURIComponent(parts[i]);
        else if (rp.literal !== parts[i]) { ok = false; break; }
      }
      if (ok) return { handler: route.handler, params };
    }
    return null;
  }

  /**
   * Dispatch an incoming request. Handlers receive a single `ctx` object and
   * return a response descriptor: { status, body, headers, raw, stream, file }.
   */
  async dispatch(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (url.pathname.length > CONFIG.HTTP.MAX_URL_LENGTH) {
        return sendJson(res, 414, { error: 'url_too_long' });
      }
      const pathname = url.search ? url.pathname : url.pathname;

      const match = this.match(req.method, pathname);
      if (!match) {
        if (req.method === 'GET' && isStaticPath(pathname)) {
          return serveStatic(res, STATIC_ALIASES[pathname] || pathname);
        }
        if (req.method === 'GET' && !pathname.startsWith('/api/')) {
          return serveStatic(res, '/index.html'); // SPA fallback (hash routing)
        }
        return sendJson(res, 404, { error: 'not_found' });
      }

      const ctx = {
        req,
        res,
        url,
        path: pathname,
        params: match.params,
        query: Object.fromEntries(url.searchParams),
        body: null,
        user: null,
        userRaw: null,
        sessionId: null,
        ip: req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : 'unknown'
      };

      // Body parsing (JSON or urlencoded) — only when needed by the handler.
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
        ctx.body = await readBody(req);
      }

      const result = await match.handler(ctx);
      return writeResponse(res, result);
    } catch (err) {
      if (err instanceof RouteError) {
        return sendJson(res, err.status, { error: err.message, ...err.extra });
      }
      const status = err.status || 500;
      const body = { error: status === 500 ? 'internal_error' : String(err.message || 'error') };
      if (status !== 500) body.details = err.extra || undefined;
      if (status === 500 && this.errorHandler) {
        await this.errorHandler(err, req);
      }
      if (!res.headersSent) return sendJson(res, status, body);
      return null;
    }
  }
}

const STATIC_ALIASES = { '/terms': '/terms.html', '/privacy': '/privacy.html' };

function isStaticPath(p) {
  if (STATIC_ALIASES[p]) return true;
  return [
    '/index.html', '/app.js', '/styles.css', '/favicon.ico',
    '/manifest.webmanifest', '/terms.html', '/privacy.html',
    '/legal.html', '/offline.html', '/robots.txt'
  ].includes(p) || /^\/assets\/[A-Za-z0-9._-]+$/.test(p);
}

function sendJson(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(payload);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

function serveStatic(res, relPath, opts = {}) {
  const safe = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(CONFIG.PUBLIC_DIR, safe);
  if (!filePath.startsWith(CONFIG.PUBLIC_DIR + path.sep) && filePath !== CONFIG.PUBLIC_DIR) {
    return sendJson(res, 400, { error: 'bad_path' });
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(res, 404, { error: 'not_found' });
  }
  const ext = path.extname(filePath).toLowerCase();
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': opts.noCache ? 'no-store' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'"
  });
  stream.pipe(res);
  stream.on('error', () => {
    if (!res.headersSent) sendJson(res, 500, { error: 'serve_error' });
    else res.destroy();
  });
  return null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > CONFIG.HTTP.MAX_BODY_BYTES) {
        done = true;
        reject(new RouteError(413, 'payload_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      const ct = String(req.headers['content-type'] || '');
      try {
        if (ct.includes('application/json')) return resolve(JSON.parse(raw));
        if (ct.includes('application/x-www-form-urlencoded')) {
          return resolve(Object.fromEntries(new URLSearchParams(raw)));
        }
        try {
          return resolve(JSON.parse(raw));
        } catch {
          return resolve(Object.fromEntries(new URLSearchParams(raw)));
        }
      } catch (err) {
        reject(new RouteError(400, 'invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

async function writeResponse(res, result) {
  if (!result) return null;
  if (result.file) return serveStream(res, result.file, result);
  if (result.stream) return result.stream(res);
  const status = result.status || 200;
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    ...(result.headers || {})
  };
  if (result.body && typeof result.body === 'object') {
    headers['Content-Type'] = 'application/json; charset=utf-8';
  }
  return sendJson(res, status, result.body === undefined ? {} : result.body, headers);
}

function serveStream(res, filePath, result) {
  if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'not_found' });
  const ext = path.extname(filePath).toLowerCase();
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Disposition': result.disposition || 'inline',
    'Cache-Control': 'no-store',
    ...(result.headers || {})
  });
  stream.pipe(res);
  return null;
}

module.exports = { Router, RouteError, sendJson, serveStatic, readBody };
