#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Generates simple SVG placeholders so the UI can iterate quickly without real art.
const createSvg = (label, fill) => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <rect width="120" height="120" rx="14" fill="${fill}" />
  <text x="50%" y="50%" fill="#0f172a" font-size="18" font-family="Inter, sans-serif" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;

const projectRoot = process.cwd();
const assetsRoot = path.resolve(projectRoot, 'src/assets');

const placeholderFiles = [
  { directory: 'icons', name: 'placeholder-icon.svg', label: 'ICON', fill: '#fbbf24' },
  { directory: 'textures', name: 'placeholder-texture.svg', label: 'TEX', fill: '#a78bfa' },
  { directory: 'classes', name: 'placeholder-class.svg', label: 'CLASS', fill: '#60a5fa' },
  { directory: 'cards', name: 'placeholder-card.svg', label: 'CARD', fill: '#34d399' },
  { directory: 'tokens', name: 'placeholder-token.svg', label: 'TOKEN', fill: '#f472b6' },
  { directory: 'ui', name: 'placeholder-ui.svg', label: 'UI', fill: '#facc15' },
];

const gitKeepTargets = ['fonts/.gitkeep'];

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const writeIfMissing = async (filePath, contents) => {
  try {
    await fs.access(filePath);
    return false;
  } catch {
    await fs.writeFile(filePath, contents, 'utf8');
    return true;
  }
};

const run = async () => {
  await ensureDir(assetsRoot);

  // Create placeholder SVGs for each major asset bucket.
  for (const file of placeholderFiles) {
    const targetDir = path.join(assetsRoot, file.directory);
    await ensureDir(targetDir);
    const created = await writeIfMissing(
      path.join(targetDir, file.name),
      createSvg(file.label, file.fill)
    );
    if (created) {
      console.log(`Seeded ${file.directory}/${file.name}`);
    }
  }

  // Drop .gitkeep files so empty directories persist in version control.
  for (const relative of gitKeepTargets) {
    const targetPath = path.join(assetsRoot, relative);
    await ensureDir(path.dirname(targetPath));
    const created = await writeIfMissing(targetPath, '');
    if (created) {
      console.log(`Created ${relative}`);
    }
  }
};

run().catch((error) => {
  console.error('Failed to seed assets:', error);
  process.exitCode = 1;
});
