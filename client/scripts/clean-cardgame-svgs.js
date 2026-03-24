/**
 * Strips Inkscape/RDF namespaces from CardGame SVGs so @svgr/webpack can compile them.
 * Run: node scripts/clean-cardgame-svgs.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../src/assets/img/CardGame');

function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (name.endsWith('.svg')) cleanFile(p);
    }
}

function cleanFile(p) {
    let s = fs.readFileSync(p, 'utf8');
    const orig = s;

    s = s.replace(/<inkscape:path-effect[\s\S]*?\/>/g, '');

    s = s.replace(
        /<svg\r?\n\s*xmlns:dc="[^"]*"\r?\n\s*xmlns:cc="[^"]*"\r?\n\s*xmlns:rdf="[^"]*"\r?\n\s*xmlns:svg="[^"]*"\r?\n\s*xmlns="http:\/\/www.w3.org\/2000\/svg"\r?\n(?:\s*xmlns:inkscape="[^"]*"\r?\n)?/,
        '<svg\n   xmlns="http://www.w3.org/2000/svg"\n   '
    );

    // Already-cleaned files that still declare xmlns:inkscape on its own line
    s = s.replace(/\r?\n\s*xmlns:inkscape="[^"]*"/g, '');

    s = s.replace(/<metadata[^>]*>[\s\S]*?<\/metadata>\s*/g, '');

    if (s !== orig) {
        fs.writeFileSync(p, s);
        console.log('cleaned', path.relative(root, p));
    }
}

walk(root);
