// Generates favicon PNG variants from public/icon.svg
// Run with: node scripts/generate-favicons.mjs

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const svgPath = path.join(root, "public", "icon.svg");
const outDir = path.join(root, "public");

const sizes = [
  { name: "favicon-16.png", size: 16 },
  { name: "favicon-32.png", size: 32 },
  { name: "favicon-48.png", size: 48 },
  { name: "apple-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
];

async function run() {
  if (!fs.existsSync(svgPath)) {
    console.error(`Missing ${svgPath}`);
    process.exit(1);
  }
  const svg = fs.readFileSync(svgPath);

  for (const { name, size } of sizes) {
    const outPath = path.join(outDir, name);
    await sharp(svg, { density: 384 })
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`wrote ${name}`);
  }

  // Multi-resolution ICO (16, 32, 48)
  const icoPath = path.join(root, "public", "favicon.ico");
  const icoBufs = await Promise.all(
    [16, 32, 48].map((size) =>
      sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()
    )
  );
  // Simple ICO container: just concatenate PNGs with a small header.
  // For correctness, we rely on Next.js serving the PNGs directly; the .ico
  // is provided as a fallback that browsers can still render.
  const header = Buffer.from([
    0x00, 0x00, 0x01, 0x00, 0x03, 0x00, // ICONDIR + count
  ]);
  const entries = [];
  const bodies = [];
  let offset = 6 + 16 * 3;
  for (let i = 0; i < 3; i++) {
    const size = [16, 32, 48][i];
    const buf = icoBufs[i];
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    bodies.push(buf);
    offset += buf.length;
  }
  fs.writeFileSync(icoPath, Buffer.concat([header, ...entries, ...bodies]));
  console.log("wrote favicon.ico");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
