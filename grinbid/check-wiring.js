'use strict';
/* Static wiring check between demo/app.js (UI) and demo/demo-api.js (mock API). */
const fs = require('fs');
const ui = fs.readFileSync(__dirname + '/app.js', 'utf8');
const api = fs.readFileSync(__dirname + '/demo-api.js', 'utf8');

// 1) every api('/x') call in the UI must match a route regex in the mock API
const routeBlock = api.slice(api.indexOf('const routes'), api.indexOf('async function api('));
const routeRes = [];
for (const m of routeBlock.matchAll(/\['(?:GET|POST)', \/(.+?)\/,/g)) {
  routeRes.push(new RegExp(m[1])); // sources already carry ^…$ anchors
}
console.log('mock routes parsed:', routeRes.length);

const calls = [...ui.matchAll(/api\('([^']+)'/g)].map((m) => m[1].replace(/' \+ /g, '')); // dynamic paths handled below
// expand the two dynamically-built paths used by the UI
calls.push('/auth/signup', '/auth/login', '/profiles/luna-starr', '/tasks/t01/claim', '/profiles/x/claim', '/admin/announce');
const unique = [...new Set(calls.map((c) => c.split('?')[0]))].filter((p) => !p.endsWith('/')); // drop concatenation prefixes, covered by the expansions below
const missing = unique.filter((p) => !routeRes.some((re) => re.test(p)));
console.log('UI→API paths checked:', unique.length, '| unmatched:', missing.length ? missing.join(', ') : 'none');

// 2) identifiers invoked inside inline handlers must be global (ignore GB.* members
//    and ${...} template interpolations, which are evaluated at render time)
const handlers = [...ui.matchAll(/on(?:click|submit|keydown)="([^"]+)"/g)].map((m) => m[1]);
const stripped = handlers.join(' ').replace(/GB\.\w+/g, 'GB').replace(/\$\{[^}]*\}/g, 'X');
const ids = new Set([...stripped.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));
const allowed = new Set(['GB', 'go', 'gbv', 'location', 'confirm', 'event', 'Number', 'String', 'if']);
const bad = [...ids].filter((i) => !allowed.has(i));
console.log('bare inline handler funcs:', [...ids].join(', ') || '(none)', '| not exposed:', bad.length ? bad.join(', ') : 'none');

// 3) GB.* members used inline must exist on window.GB
const gbUsed = new Set([...handlers.join(' ').matchAll(/GB\.(\w+)/g)].map((m) => m[1]));
const gbExport = ui.slice(ui.indexOf('window.GB ='), ui.indexOf('// tiny helpers'));
const missingGB = [...gbUsed].filter((k) => !gbExport.includes(k));
console.log('GB members used inline:', [...gbUsed].length, '| missing:', missingGB.length ? missingGB.join(', ') : 'none');

// 4) element ids referenced must appear in some template
const idsRef = new Set();
for (const m of ui.matchAll(/\$\('#([\w-]+)'\)|getElementById\('([\w-]+)'\)/g)) idsRef.add(m[1] || m[2]);
const staticIds = ['app', 'view', 'toasts', 'confetti', 'modalBack', 'nav', 'chips', 'avatarPick', 'createEmoji', 'authSubmit'];
const missingIds = [...idsRef].filter((id) => !staticIds.includes(id) && !ui.includes('id="' + id + '"'));
console.log('element ids referenced:', idsRef.size, '| missing in templates:', missingIds.length ? missingIds.join(', ') : 'none');

const ok = !missing.length && !bad.length && !missingGB.length && !missingIds.length;
console.log(ok ? '\nWIRING OK ✅' : '\nWIRING PROBLEMS FOUND ❌');
process.exit(ok ? 0 : 1);
