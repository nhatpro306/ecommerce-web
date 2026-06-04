import sharp from 'sharp';
import fs from 'node:fs';

const src = 'public/brand/resey-logo.jpg';
fs.mkdirSync('public/icons', { recursive: true });

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

for (const { size, name } of sizes) {
  await sharp(src)
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: '#ffffff' })
    .png()
    .toFile(`public/icons/${name}`);
}

// Maskable icon: logo within the 80% safe zone on a white square.
const inner = Math.round(512 * 0.8);
const logo = await sharp(src)
  .resize(inner, inner, { fit: 'contain', background: '#ffffff' })
  .png()
  .toBuffer();

await sharp({ create: { width: 512, height: 512, channels: 4, background: '#ffffff' } })
  .composite([{ input: logo, gravity: 'center' }])
  .png()
  .toFile('public/icons/maskable-512.png');

console.log('icons done');
