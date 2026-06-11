/**
 * Renders the app icons (Искра the firefly on parchment) from inline SVG.
 * Outputs: public/icons/icon-192.png, icon-512.png, maskable-512.png,
 * apple-touch-icon.png (180).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'public', 'icons');
fs.mkdirSync(out, { recursive: true });

// padded=true keeps the firefly inside the maskable safe zone (80%)
function iskraSvg(padded) {
  const scale = padded ? 0.72 : 0.88;
  const shift = (1 - scale) * 50;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="75%">
      <stop offset="0%" stop-color="#FBF4E3"/>
      <stop offset="100%" stop-color="#EBD9AE"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="62%" r="50%">
      <stop offset="0%" stop-color="#FFE9A3" stop-opacity="0.95"/>
      <stop offset="60%" stop-color="#FFD34D" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#FFD34D" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#bg)"/>
  <g transform="translate(${shift} ${shift}) scale(${scale})">
    <circle cx="50" cy="58" r="40" fill="url(#glow)"/>
    <g opacity="0.8">
      <ellipse cx="33" cy="42" rx="16" ry="9" fill="#BFE8F5" transform="rotate(-28 33 42)"/>
      <ellipse cx="67" cy="42" rx="16" ry="9" fill="#BFE8F5" transform="rotate(28 67 42)"/>
    </g>
    <ellipse cx="50" cy="58" rx="15" ry="19" fill="#3A2E22"/>
    <ellipse cx="50" cy="69" rx="11" ry="9" fill="#FFCB3D"/>
    <ellipse cx="50" cy="69" rx="6.5" ry="5.5" fill="#FFF1B8"/>
    <circle cx="50" cy="38" r="11" fill="#4A3A2A"/>
    <g fill="#1c140d">
      <circle cx="46" cy="37" r="2.6"/>
      <circle cx="54" cy="37" r="2.6"/>
    </g>
    <path d="M45 43 q5 5 10 0" stroke="#1c140d" stroke-width="2" stroke-linecap="round" fill="none"/>
    <g stroke="#4A3A2A" stroke-width="2" stroke-linecap="round" fill="none">
      <path d="M44 29 q-4 -7 -9 -8"/>
      <path d="M56 29 q4 -7 9 -8"/>
    </g>
    <circle cx="35" cy="20" r="2.5" fill="#FFCB3D"/>
    <circle cx="65" cy="20" r="2.5" fill="#FFCB3D"/>
  </g>
</svg>`;
}

const normal = Buffer.from(iskraSvg(false));
const maskable = Buffer.from(iskraSvg(true));

await sharp(normal, { density: 384 }).resize(192, 192).png().toFile(path.join(out, 'icon-192.png'));
await sharp(normal, { density: 384 }).resize(512, 512).png().toFile(path.join(out, 'icon-512.png'));
await sharp(maskable, { density: 384 }).resize(512, 512).png().toFile(path.join(out, 'maskable-512.png'));
await sharp(normal, { density: 384 }).resize(180, 180).png().toFile(path.join(out, 'apple-touch-icon.png'));
console.log('icons written to public/icons/');
