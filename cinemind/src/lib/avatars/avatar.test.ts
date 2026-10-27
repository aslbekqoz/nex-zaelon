import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { crc32 } from "node:zlib";
import sharp from "sharp";
import { AVATAR_SIZE, AvatarError, processAvatar } from "./process.ts";

const solid = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 200, g: 40, b: 40 } } });

/** A tiny PNG whose header claims huge dimensions — a decompression-bomb shape. */
function pngClaiming(width: number, height: number) {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IEND", Buffer.alloc(0))]);
}

describe("processAvatar", () => {
  it("crops any supported picture to a 256x256 WebP", async () => {
    for (const img of [await solid(800, 400).jpeg().toBuffer(), await solid(300, 900).png().toBuffer(), await solid(500, 500).webp().toBuffer()]) {
      const out = await processAvatar(img);
      const meta = await sharp(out).metadata();
      assert.equal(meta.format, "webp");
      assert.equal(meta.width, AVATAR_SIZE);
      assert.equal(meta.height, AVATAR_SIZE);
    }
  });

  it("drops EXIF (including GPS) and applies the orientation", async () => {
    const withExif = await solid(400, 200)
      .withExif({ IFD0: { Make: "PhoneCo", Model: "X1" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "41/1 18/1 0/1" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    assert.ok((await sharp(withExif).metadata()).exif, "fixture has EXIF");
    const out = await processAvatar(withExif);
    const meta = await sharp(out).metadata();
    assert.equal(meta.exif, undefined);
    assert.equal(meta.orientation, undefined);
    assert.ok(!out.includes(Buffer.from("PhoneCo")));
  });

  it("rejects non-images, empty, oversized, tiny and bomb-shaped files", async () => {
    await assert.rejects(processAvatar(Buffer.from("<svg onload=alert(1)>")), (e: Error) => e instanceof AvatarError && /isn't a picture/.test(e.message));
    await assert.rejects(processAvatar(new Uint8Array()), /Choose a picture/);
    await assert.rejects(processAvatar(new Uint8Array(5 * 1024 * 1024 + 1)), /larger than 5 MB/);
    await assert.rejects(processAvatar(await solid(20, 20).png().toBuffer()), /too small/);
    await assert.rejects(processAvatar(pngClaiming(20000, 20000)), (e: Error) => e instanceof AvatarError && /too large|isn't a picture/.test(e.message));
  });

  it("rejects SVG even though it's an image format", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>');
    await assert.rejects(processAvatar(svg), /isn't a picture/);
  });
});
