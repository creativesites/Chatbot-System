const fs = require('fs');
const path = require('path');

const b64Path = path.join(__dirname, '../packages/widget/assets/mya-logo.b64');
let logoB64 = '';
if (fs.existsSync(b64Path)) {
    logoB64 = fs.readFileSync(b64Path, 'utf8').trim();
}

console.log('📦 Loaded logo base64 (' + logoB64.length + ' chars)');
