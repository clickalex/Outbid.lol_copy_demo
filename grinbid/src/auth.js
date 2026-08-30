'use strict';

/**
 * auth.js — password hashing (scrypt, salted) and stateless HMAC session
 * cookies. No external deps; crypto built-ins only.
 */

const crypto = require('crypto');
const { CONFIG } = require('./config');

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), s, 64, {
    N: CONFIG.AUTH.SCRYPT_N,
    r: CONFIG.AUTH.SCRYPT_R,
    p: CONFIG.AUTH.SCRYPT_P,
    maxmem: 64 * 1024 * 1024
  });
  return { salt: s, hash: derived.toString('hex') };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function hmacKey() {
  // Session tokens are signed with an HMAC derived from a persistent secret.
  // On platforms with ephemeral disks (e.g. Render) SESSION_SECRET can be set
  // as an env var so logins survive redeploys.
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) {
    return process.env.SESSION_SECRET.trim();
  }
  const fs = require('fs');
  const path = require('path');
  const secretFile = path.join(CONFIG.DATA_DIR, '.session-secret');
  try {
    return fs.readFileSync(secretFile, 'utf8').trim();
  } catch {
    const secret = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
    fs.writeFileSync(secretFile, secret, { mode: 0o600 });
    return secret;
  }
}

const SECRET = hmacKey();

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}

function makeToken(kind, subjectId) {
  const body = `${kind}:${subjectId}:${Date.now()}`;
  const b64 = Buffer.from(body, 'utf8').toString('base64url');
  return `${b64}.${sign(b64)}`;
}

/** Returns { kind, subjectId } or null. */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expect = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const decoded = Buffer.from(body, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 3) return null;
    return { kind: parts[0], subjectId: parts.slice(1, -1).join(':') };
  } catch {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      out[key] = decodeURIComponent(value);
    }
  }
  return out;
}

function makeSessionCookie(kind, subjectId, ttlMs) {
  const token = makeToken(kind, subjectId);
  const maxAge = Math.floor(ttlMs / 1000);
  const name = kind === 'user' ? CONFIG.AUTH.SESSION_COOKIE : CONFIG.AUTH.ADMIN_COOKIE;
  return `${name}=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; SameSite=Lax; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}Priority=High`;
}

function clearCookie(name) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`;
}

module.exports = {
  hashPassword,
  verifyPassword,
  makeToken,
  verifyToken,
  parseCookies,
  makeSessionCookie,
  clearCookie
};
