import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './lib/book.mjs';

const require = createRequire(import.meta.url);
const lucidePath = process.argv[2] || require.resolve('lucide');
const lucide = require(lucidePath);
const names = ['ArrowLeft', 'BookOpen', 'ClipboardCheck', 'SlidersHorizontal', 'Search', 'Sun', 'Moon', 'X'];
const nodes = Object.fromEntries(names.map(name => {
  const value = lucide[name];
  if (!Array.isArray(value)) throw new Error(`Missing Lucide icon node: ${name}`);
  return [name.replace(/[a-z][A-Z]/g, pair => `${pair[0]}-${pair[1]}`).toLowerCase(), value];
}));
const output = `/* Lucide icon nodes, ISC license; see LUCIDE-LICENSE.txt. Generated, do not edit. */
(function () {
  const nodes = ${JSON.stringify(nodes)};
  window.VindaLifeIcons = function () {
    for (const element of document.querySelectorAll('[data-lucide]')) {
      const children = nodes[element.dataset.lucide];
      if (!children) continue;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      for (const [key, value] of Object.entries({viewBox:'0 0 24 24', width:'24', height:'24', fill:'none', stroke:'currentColor', 'stroke-width':'2', 'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true'})) svg.setAttribute(key, value);
      for (const [tag, attributes] of children) {
        const child = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attributes)) child.setAttribute(key, value);
        svg.appendChild(child);
      }
      svg.setAttribute('class', element.className || '');
      element.replaceWith(svg);
    }
  };
})();\n`;
writeFileSync(resolve(ROOT, 'vinda-icons.js'), output);
console.log(`Generated ${names.length} locally vendored Lucide icons.`);
