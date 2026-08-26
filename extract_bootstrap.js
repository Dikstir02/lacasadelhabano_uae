const fs = require('fs');
const vm = require('vm');

const s = fs.readFileSync('_canva_source.html', 'utf8');
const marker = "window['bootstrap'] = JSON.parse('";
const idx = s.indexOf(marker);
if (idx < 0) { console.error('marker not found'); process.exit(1); }

let i = idx + marker.length;
while (i < s.length) {
    if (s[i] === '\\' && s[i + 1] === "'") { i += 2; continue; }
    if (s[i] === "'") break;
    i++;
}
const stmt = s.slice(idx, i + 3);
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(stmt, sandbox);
const d = sandbox.window['bootstrap'];
fs.writeFileSync('bootstrap.json', JSON.stringify(d, null, 1));
console.log('ok. top keys:', Object.keys(d).join(', '));