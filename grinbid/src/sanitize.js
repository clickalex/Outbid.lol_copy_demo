'use strict';

/**
 * Input sanitization helpers.
 * All user-supplied strings pass through these before touching the store or
 * being echoed back to the client. Values are normalized, length-capped and
 * control characters stripped — emoji stay intact.
 */

const { CONFIG } = require('./config');

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function cleanText(value, opts = {}) {
  const max = Number.isFinite(opts.max) ? opts.max : 140;
  const allowNewlines = Boolean(opts.allowNewlines);
  if (value === null || value === undefined) return '';
  let s = String(value);
  s = s.replace(CONTROL_CHARS, '');
  if (allowNewlines) {
    s = s.replace(/\r\n?/g, '\n');
  } else {
    s = s.replace(/\s+/g, ' ').trim();
  }
  return [...s].slice(0, max).join('');
}

function sanitizeUsername(value) {
  const s = cleanText(value, { max: 20 }).toLowerCase();
  return CONFIG.AUTH.USERNAME_RE.test(s) ? s : null;
}

function sanitizeDisplayName(value) {
  const s = cleanText(value, { max: 24 });
  return s.length >= 2 ? s : null;
}

function sanitizeAvatar(value, fallback = '🙂') {
  const s = cleanText(value, { max: 8 });
  // One or two emoji-ish glyphs max; anything else falls back.
  const glyphs = [...s].filter((ch) => /\p{Extended_Pictographic}/u.test(ch));
  const pick = glyphs.slice(0, 2).join('');
  return pick || fallback;
}

function sanitizeSlug(value) {
  const s = cleanText(value, { max: 40 }).toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(s) || /^[a-z0-9]{1,40}$/.test(s) ? s : null;
}

function sanitizeId(value, max = 64) {
  const s = cleanText(value, { max });
  return /^[A-Za-z0-9_-]{1,64}$/.test(s) ? s : null;
}

/**
 * Coin amounts are non-negative integers within a sane bound.
 * Returns a Number or null when invalid.
 */
function sanitizeAmount(value, { min = 0, max = 1_000_000_000 } = {}) {
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function sanitizeCategory(value) {
  const ALLOWED = new Set(['celebrity', 'influencer', 'estate', 'venue', 'brand', 'community']);
  const s = cleanText(value, { max: 20 }).toLowerCase();
  return ALLOWED.has(s) ? s : null;
}

function sanitizeBoolean(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function hashIp(ip) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(String(ip || 'unknown')).digest('hex').slice(0, 16);
}

module.exports = {
  cleanText,
  sanitizeUsername,
  sanitizeDisplayName,
  sanitizeAvatar,
  sanitizeSlug,
  sanitizeId,
  sanitizeAmount,
  sanitizeCategory,
  sanitizeBoolean,
  hashIp
};
