'use strict';

/**
 * reset-data.js — wipe data/db.json and reseed a fresh database on next boot.
 */

const fs = require('node:fs');
const path = require('node:path');
const { CONFIG } = require('../src/config');

fs.mkdirSync(CONFIG.DATA_DIR, { recursive: true });
for (const f of ['db.json', `${CONFIG.DB_FILE}.tmp`]) {
  try {
    fs.rmSync(f, { force: true });
    console.log(`removed ${f}`);
  } catch (err) {
    console.error(`could not remove ${f}:`, err.message);
  }
}
console.log('Grinbid data reset. Start the server to reseed with fresh data.');
