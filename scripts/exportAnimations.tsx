// Run with node --import tsx scripts/exportAnimations.tsx. Rendering tools can live
// outside the repo: KALO_ANIMATION_TOOLS=/path/to/tools/node_modules.
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { OpeningArtwork } from '../src/artwork/OpeningArtwork';
import { ToastArtwork } from '../src/artwork/ToastArtwork';

const requireTool = createRequire(path.resolve(process.env.KALO_ANIMATION_TOOLS || 'node_modules', '../package.json'));
const { chromium } = requireTool('playwright');
const { GIFEncoder, quantize, applyPalette } = requireTool('gifenc');
const { PNG } = requireTool('pngjs');
const css = await readFile('src/app.css', 'utf8');
const font = (await readFile('public/fonts/fredoka-kalo.ttf')).toString('base64');
const out = 'public/animations';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
try {
  for (const name of ['opening', 'toast'] as const) for (const theme of ['dark', 'light']) {
    const opening = name === 'opening';
    const width = opening ? 400 : 240;
    const height = opening ? 320 : 240;
    const duration = opening ? 3400 : 2800;
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
    const markup = renderToStaticMarkup(opening ? <OpeningArtwork onComplete={() => {}} /> : <ToastArtwork />);
    await page.setContent(`<style>${css}
      @font-face { font-family: Fredoka; font-weight: 600; src: url(data:font/ttf;base64,${font}); }
      html, body { margin: 0; width: 100%; height: 100%; }
      .kalo-shell { width: ${width}px; height: ${height}px; }
      .opening-splash { animation: none !important; }
      .opening-splash__scene { width: 400px; }
      .opening-splash__skip { display: none; }
      .scan-toast { background: var(--surface); }
    </style><div class="kalo-shell" data-theme="${theme}">${markup}</div>`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { for (const animation of document.getAnimations()) animation.pause(); });
    const gif = GIFEncoder();
    const frameHashes = new Set<string>();
    for (let ms = 0; ms < duration; ms += 40) {
      await page.evaluate((time: number) => { for (const animation of document.getAnimations()) animation.currentTime = time; }, ms);
      const frame = await page.screenshot();
      const { data } = PNG.sync.read(frame);
      const palette = quantize(data, 128);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, width, height, { palette, delay: 40, repeat: opening ? -1 : 0 });
      if (ms === (opening ? 3000 : 2400)) await writeFile(`${out}/${name}-${theme}.png`, frame);
      frameHashes.add(Buffer.from(index).toString('base64'));
    }
    gif.finish();
    const bytes = gif.bytes();
    await writeFile(`${out}/${name}-${theme}.gif`, bytes);
    console.log(`${name}-${theme}: ${duration}ms, ${frameHashes.size} distinct frames, ${bytes.length} bytes`);
    if (frameHashes.size < 20) throw new Error('The animation render did not move.');
    await page.close();
  }
} finally { await browser.close(); }
