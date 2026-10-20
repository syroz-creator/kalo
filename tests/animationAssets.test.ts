import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function inspectGif(bytes: Buffer) {
  assert.equal(bytes.toString('ascii', 0, 6), 'GIF89a');
  const width = bytes.readUInt16LE(6), height = bytes.readUInt16LE(8);
  let offset = 13 + (bytes[10] & 128 ? 3 * (2 << (bytes[10] & 7)) : 0);
  let frames = 0, duration = 0, loops: number | null = null;
  const skipBlocks = () => { while (bytes[offset]) offset += 1 + bytes[offset]; offset++; };
  while (offset < bytes.length) {
    const block = bytes[offset++];
    if (block === 0x3b) break;
    if (block === 0x21) {
      const kind = bytes[offset++];
      if (kind === 0xf9) duration += bytes.readUInt16LE(offset + 2) * 10;
      if (kind === 0xff && bytes.toString('ascii', offset + 1, offset + 12) === 'NETSCAPE2.0') loops = bytes.readUInt16LE(offset + 15);
      skipBlocks();
    } else {
      assert.equal(block, 0x2c, `Unexpected GIF block at ${offset - 1}`);
      frames++;
      const flags = bytes[offset + 8];
      offset += 9 + (flags & 128 ? 3 * (2 << (flags & 7)) : 0);
      offset++;
      skipBlocks();
    }
  }
  return { width, height, frames, duration, loops };
}

for (const theme of ['dark', 'light']) for (const name of ['opening', 'toast']) test(`${name} ${theme} GIF has bounded dimensions, full timing and correct looping`, () => {
  const bytes = readFileSync(`public/animations/${name}-${theme}.gif`);
  const info = inspectGif(bytes);
  assert.deepEqual(info, name === 'opening'
    ? { width: 400, height: 320, frames: 85, duration: 3400, loops: null }
    : { width: 240, height: 240, frames: 70, duration: 2800, loops: 0 });
  assert.ok(bytes.length < 500000);
  const poster = readFileSync(`public/animations/${name}-${theme}.png`);
  assert.equal(poster.toString('ascii', 1, 4), 'PNG');
  assert.equal(poster.readUInt32BE(16), info.width);
  assert.equal(poster.readUInt32BE(20), info.height);
});
