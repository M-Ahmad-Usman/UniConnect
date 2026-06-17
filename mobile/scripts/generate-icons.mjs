import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const svgSource = join(scriptDir, '../../client/public/logo.svg');
const androidRes = join(scriptDir, '../android/app/src/main/res');

const densities = [
  { folder: 'mipmap-mdpi', size: 48, foreground: 108 },
  { folder: 'mipmap-hdpi', size: 72, foreground: 162 },
  { folder: 'mipmap-xhdpi', size: 96, foreground: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, foreground: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, foreground: 432 },
];

const svgBuffer = readFileSync(svgSource);

async function generate() {
  for (const { folder, size, foreground } of densities) {
    const dir = join(androidRes, folder);
    mkdirSync(dir, { recursive: true });

    await sharp(svgBuffer).resize(size, size).png().toFile(join(dir, 'ic_launcher.png'));
    await sharp(svgBuffer).resize(size, size).png().toFile(join(dir, 'ic_launcher_round.png'));
    await sharp(svgBuffer)
      .resize(foreground, foreground)
      .png()
      .toFile(join(dir, 'ic_launcher_foreground.png'));

    console.warn(
      `[MOBILE] Generated ${folder}: ic_launcher.png ${size}px, foreground ${foreground}px`,
    );
  }

  const adaptiveDir = join(androidRes, 'mipmap-anydpi-v26');
  mkdirSync(adaptiveDir, { recursive: true });

  const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;

  writeFileSync(join(adaptiveDir, 'ic_launcher.xml'), adaptiveIconXml);
  writeFileSync(join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveIconXml);

  const valuesDir = join(androidRes, 'values');
  mkdirSync(valuesDir, { recursive: true });

  const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">#1e293b</color>
    <color name="colorPrimaryDark">#0f172a</color>
    <color name="colorAccent">#14b8a6</color>
</resources>
`;

  const launcherBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#1e293b</color>
</resources>
`;

  writeFileSync(join(valuesDir, 'colors.xml'), colorsXml);
  writeFileSync(join(valuesDir, 'ic_launcher_background.xml'), launcherBackgroundXml);

  const splashDir = join(androidRes, 'drawable');
  mkdirSync(splashDir, { recursive: true });

  const logoBuffer = await sharp(svgBuffer).resize(512, 512).png().toBuffer();

  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: { r: 30, g: 41, b: 59, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, gravity: 'center' }])
    .png()
    .toFile(join(splashDir, 'splash.png'));

  console.warn('[MOBILE] Generated adaptive icons and splash.png');
}

generate().catch((error) => {
  console.error('[MOBILE] Icon generation failed', { error });
  process.exit(1);
});
