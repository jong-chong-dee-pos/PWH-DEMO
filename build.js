// Generates labels.th.js (once), index.html (standalone) and artifact.html (for the Artifact tool).
const fs=require('fs'), path=require('path');
global.window=global; require('./app/js/labels.js');
const en=PWH.en;
const thPath='app/js/labels.th.js';
// Keep any Thai already typed in; only add lines for new keys.
let existing={};
if(fs.existsSync(thPath)){
  global.PWH.th=undefined; delete require.cache[require.resolve('./'+thPath)]; require('./'+thPath); existing=PWH.th||{};
}
const lines=Object.keys(en).map(k=>`  ${JSON.stringify(k)}: ${JSON.stringify(existing[k]||'')},   // ${en[k].replace(/\n/g,' ')}`);
fs.writeFileSync(thPath,`/* Thai text for the screen (first draft written by Claude, to be checked and edited by the factory team). Edit any text between the quotes.
 * A key left as '' falls back to the English text shown after //.
 * Keep {n}, {name}, {rows} ... exactly as they are; the app fills them in. */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});
  PWH.th = {
${lines.join('\n')}
  };
})(window);
`);
const fonts='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Thai:wght@400;500;600&display=swap">';
const scripts=['vendor/xlsx.full.min.js','js/labels.th.js','js/labels.js','js/db.js','js/parsers.js','js/checks.js','js/changes.js','js/layout.js','js/route.js','js/m2.js','js/m3.js','js/freq.js','js/m4.js','js/m5.js','js/lookup.js','js/app.js'].map(s=>`<script src="${s}"></script>`).join('\n');
const title='PWH Part Warehouse';
fs.writeFileSync('app/index.html',`<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
${fonts}
<link rel="stylesheet" href="css/app.css">
</head><body><div id="app"></div>
${scripts}
</body></html>
`);
fs.writeFileSync('artifact.html',`<title>${title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<link rel="stylesheet" href="css/app.css">
<div id="app"></div>
${scripts}
`);
console.log('built', Object.keys(en).length,'labels');
