// Builds the intranet package: dist/pwh-intranet/ and pwh-intranet-<version>.zip
// Same app code as the claude.ai artifact; fonts are bundled so the app makes no request outside the server.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const VERSION = process.argv[2] || 'v59';
const OUT = 'dist/pwh-intranet';
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
['css', 'js', 'vendor', 'fonts'].forEach(d => copyDir(path.join('app', d), path.join(OUT, d)));

// index.html: Google Fonts -> bundled fonts
let html = fs.readFileSync('app/index.html', 'utf8');
const before = html;
html = html.replace(/<link rel="preconnect"[^>]*>/g, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '<link rel="stylesheet" href="fonts/fonts.css">');
if (html === before || /https?:\/\//.test(html)) throw new Error('index.html still points outside: ' + (html.match(/https?:\/\/[^"']+/) || [''])[0]);
fs.writeFileSync(path.join(OUT, 'index.html'), html);

// nothing in the package may reach outside the server
const ext = [];
(function scan(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { scan(p); continue; }
    if (!/\.(html|css|js)$/.test(f) || f === 'xlsx.full.min.js') continue;
    const m = fs.readFileSync(p, 'utf8').match(/(?:src|href|url)\s*[=(]\s*["']?https?:\/\/[^"')\s]+/g);
    if (m) ext.push(p + ': ' + m.join(', '));
  }
})(OUT);
if (ext.length) throw new Error('external references:\n' + ext.join('\n'));

// server settings: same rules for IIS, Nginx and Apache
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";
fs.writeFileSync(path.join(OUT, 'web.config'), `<?xml version="1.0" encoding="utf-8"?>
<!-- IIS settings for PWH. Put this file in the site folder next to index.html. -->
<configuration>
  <system.webServer>
    <defaultDocument enabled="true"><files><clear /><add value="index.html" /></files></defaultDocument>
    <staticContent>
      <remove fileExtension=".woff2" /><mimeMap fileExtension=".woff2" mimeType="font/woff2" />
      <remove fileExtension=".json" /><mimeMap fileExtension=".json" mimeType="application/json" />
      <clientCache cacheControlMode="DisableCache" />
    </staticContent>
    <httpProtocol>
      <customHeaders>
        <add name="Content-Security-Policy" value="${CSP}" />
        <add name="X-Content-Type-Options" value="nosniff" />
        <add name="Referrer-Policy" value="no-referrer" />
        <add name="Cache-Control" value="no-cache" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
`);
fs.mkdirSync(path.join(OUT, '_server'), { recursive: true });
fs.writeFileSync(path.join(OUT, '_server', 'nginx-pwh.conf'), `# Nginx settings for PWH. Copy into /etc/nginx/conf.d/ and change server_name, root and the certificate paths.
server {
    listen 443 ssl;
    server_name pwh.company.local;
    ssl_certificate     /etc/nginx/certs/pwh.crt;
    ssl_certificate_key /etc/nginx/certs/pwh.key;

    root /var/www/pwh;
    index index.html;
    types { font/woff2 woff2; }

    add_header Content-Security-Policy "${CSP}" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy no-referrer always;
    add_header Cache-Control "no-cache" always;

    location / { try_files $uri $uri/ =404; }
    location /_server/ { deny all; }
}
server { listen 80; server_name pwh.company.local; return 301 https://$host$request_uri; }
`);
fs.writeFileSync(path.join(OUT, '.htaccess'), `# Apache settings for PWH (needs mod_headers and AllowOverride). Put next to index.html.
DirectoryIndex index.html
AddType font/woff2 .woff2
Header always set Content-Security-Policy "${CSP}"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "no-referrer"
Header always set Cache-Control "no-cache"
RedirectMatch 404 ^/_server/
`);
fs.writeFileSync(path.join(OUT, 'version.txt'), `PWH Part Warehouse ${VERSION}\nbuilt ${new Date().toISOString()}\n`);
fs.writeFileSync(path.join(OUT, '_server', 'csp.txt'), CSP + '\n');
if (fs.existsSync('docs/INSTALL-TH.html')) fs.copyFileSync('docs/INSTALL-TH.html', path.join(OUT, 'INSTALL-TH.html'));

const zip = `pwh-intranet-${VERSION}.zip`;
fs.rmSync(zip, { force: true });
execSync(`cd dist && zip -qr ../${zip} pwh-intranet`);
console.log('built', OUT, 'and', zip, (fs.statSync(zip).size / 1024 / 1024).toFixed(2) + ' MB');
