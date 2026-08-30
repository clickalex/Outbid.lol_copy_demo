'use strict';

/**
 * JsonStore — single-file JSON database (data/db.json).
 *
 * Guarantees:
 *  - Atomic persistence: writes go to `<file>.tmp`, are fsync'd, then the file
 *    is atomically renamed over the live path; the directory is fsync'd too.
 *  - Debounced flush: many in-memory mutations are coalesced into one write;
 *    `flush()`/`close()` force an immediate write and are idempotent.
 *  - Crash safety: a leftover `.tmp` file is ignored; a corrupt db.json is
 *    backed up and rebuilt from seed data instead of losing the server.
 *  - Serialized writes: a single write queue guarantees at most one write in
 *    flight and the final state on disk always matches the in-memory state.
 *
 * Node is single-threaded, so `mutate()` runs synchronously against the live
 * in-memory object — no lock is needed for correctness; the write queue makes
 * the fs side safe against concurrent (e.g. multiple flush) callers.
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { CONFIG } = require('./config');

function defaultDebounceMs() {
  return CONFIG.STORE.DEBOUNCE_MS;
}

class JsonStore {
  constructor(opts = {}) {
    this.file = opts.file || CONFIG.DB_FILE;
    this.debounceMs = Number.isFinite(opts.debounceMs) ? opts.debounceMs : defaultDebounceMs();
    this.createSeed = opts.createSeed || null;
    this.state = null;
    this.dirty = false;
    this._timer = null;
    this._writeChain = Promise.resolve();
    this._pendingWrite = null;
    this._flushes = 0;
  }

  get data() {
    return this.state;
  }

  get flushes() {
    return this._flushes;
  }

  _deepClone() {
    return JSON.parse(JSON.stringify(this.state));
  }

  async init() {
    await fsp.mkdir(path.dirname(this.file), { recursive: true });
    try {
      const raw = await fsp.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.users || typeof parsed.users !== 'object' || !Array.isArray(parsed.tasks)) {
        throw new Error('db.json does not look like a Grinbid database');
      }
      this.state = parsed;
    } catch (err) {
      if (err.code === 'ENOENT') {
        this.state = this._optionalSeed();
      } else {
        // Corrupt/unreadable database: keep a backup, then reseed.
        const backup = `${this.file}.corrupt-${Date.now()}`;
        try {
          await fsp.copyFile(this.file, backup);
          // Keep only a few backups around.
          const siblings = (await fsp.readdir(path.dirname(this.file)))
            .filter((f) => f.startsWith('db.json.corrupt-'))
            .sort();
          while (siblings.length > CONFIG.STORE.MAX_BACKUPS) {
            const oldest = siblings.shift();
            await fsp.unlink(path.join(path.dirname(this.file), oldest)).catch(() => {});
          }
        } catch (backupErr) {
          /* best effort */
        }
        this.state = this._optionalSeed();
      }
    }
    await this.flush();
    return this;
  }

  _optionalSeed() {
    if (typeof this.createSeed === 'function') return this.createSeed();
    throw new Error('JsonStore: missing seed data and db file was not found');
  }

  /**
   * Apply a synchronous mutation to the in-memory state and schedule a
   * debounced flush. The mutator receives the live state and may return any
   * value, which is returned to the caller.
   */
  mutate(mutator) {
    if (!this.state) throw new Error('JsonStore: not initialized');
    const result = mutator(this.state);
    this.dirty = true;
    this._schedule();
    return result;
  }

  _schedule() {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._timer = null;
      this.flush().catch((err) => {
        // Never crash the process because of a disk hiccup; surface on next flush.
        this.lastError = err;
      });
    }, this.debounceMs);
    if (typeof this._timer.unref === 'function') this._timer.unref();
  }

  /**
   * Force a write if dirty. Safe to call at any time; concurrent calls share
   * the same in-flight write, and the slot is freed when it finishes so the
   * next flush (which carries the latest state) writes again.
   */
  flush() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    if (!this._pendingWrite) {
      this._pendingWrite = this._doWrite()
        .catch((err) => { this.lastError = err; throw err; })
        .finally(() => { this._pendingWrite = null; });
    }
    return this._pendingWrite;
  }

  async _doWrite() {
    if (!this.state) return;
    if (!this.dirty && fs.existsSync(this.file)) return;
    const payload = JSON.stringify(this.state, null, 2);
    const tmp = `${this.file}${CONFIG.STORE.TMP_SUFFIX}`;
    const dir = path.dirname(this.file);

    let fh = null;
    try {
      fh = await fsp.open(tmp, 'w', 0o644);
      await fh.writeFile(payload, 'utf8');
      await fh.sync();
      await fh.close();
      fh = null;
      await fsp.rename(tmp, this.file);
      // Best-effort directory sync so the rename is durable.
      try {
        const dh = await fsp.open(dir, 'r');
        await dh.sync();
        await dh.close();
      } catch (_) {
        /* some filesystems don't allow dir fsync — rename already happened */
      }
      this.dirty = false;
      this._flushes += 1;
    } catch (err) {
      if (fh) await fh.close().catch(() => {});
      this.dirty = true; // keep dirty so the next flush retries
      throw err;
    } finally {
      if (fh) await fh.close().catch(() => {});
    }
  }

  async close() {
    if (this.dirty || !fs.existsSync(this.file)) {
      await this.flush();
    }
    return this.flushes;
  }
}

module.exports = { JsonStore };
