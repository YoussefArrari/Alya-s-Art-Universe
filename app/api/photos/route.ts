import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";

type PhotoEntry = {
  /** Public URL path, e.g. /photos/Art/Analog%20photography/x.jpg */
  src: string;
  /** Relative directory from /public/photos, e.g. Art/Analog photography */
  dir: string;
  /** Last folder name only, e.g. Analog photography */
  folder: string;
  /** 1-based index within its directory, sorted by filename */
  order: number;
  /** Filename only */
  file: string;
  /** Pixel width (from file header) */
  width: number | null;
  /** Pixel height (from file header) */
  height: number | null;
};

const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

type ImageSize = { width: number; height: number };

function readUInt24LE(buf: Buffer, offset: number) {
  return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16);
}

function parsePngSize(buf: Buffer): ImageSize | null {
  // PNG signature + IHDR chunk.
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null; // \x89PNG
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (!width || !height) return null;
  return { width, height };
}

function parseGifSize(buf: Buffer): ImageSize | null {
  if (buf.length < 10) return null;
  const sig = buf.toString("ascii", 0, 6);
  if (sig !== "GIF87a" && sig !== "GIF89a") return null;
  const width = buf.readUInt16LE(6);
  const height = buf.readUInt16LE(8);
  if (!width || !height) return null;
  return { width, height };
}

function parseJpegSize(buf: Buffer): ImageSize | null {
  // Minimal JPEG SOF marker scan.
  if (buf.length < 4) return null;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null; // SOI
  let i = 2;
  while (i + 9 < buf.length) {
    // Find marker 0xFF ??
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    // Skip fill 0xFF bytes
    while (i < buf.length && buf[i] === 0xff) i++;
    if (i >= buf.length) break;
    const marker = buf[i]!;
    i++;

    // Standalone markers, no length
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue;
    if (i + 1 >= buf.length) break;
    const len = buf.readUInt16BE(i);
    if (len < 2) return null;

    // SOF markers that contain size (baseline/progressive/etc.)
    const isSOF =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSOF) {
      if (i + 7 >= buf.length) break;
      const height = buf.readUInt16BE(i + 3);
      const width = buf.readUInt16BE(i + 5);
      if (!width || !height) return null;
      return { width, height };
    }

    i += len;
  }
  return null;
}

function parseWebpSize(buf: Buffer): ImageSize | null {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);

  if (chunk === "VP8X") {
    // Extended WebP: width-1 and height-1 are 24-bit little-endian.
    if (buf.length < 30) return null;
    const width = readUInt24LE(buf, 24) + 1;
    const height = readUInt24LE(buf, 27) + 1;
    if (!width || !height) return null;
    return { width, height };
  }

  if (chunk === "VP8 ") {
    // Lossy: start code 0x9D 0x01 0x2A then 16-bit little-endian width/height.
    const start = 20;
    for (let i = start; i + 9 < buf.length; i++) {
      if (buf[i] === 0x9d && buf[i + 1] === 0x01 && buf[i + 2] === 0x2a) {
        const w = buf.readUInt16LE(i + 3) & 0x3fff;
        const h = buf.readUInt16LE(i + 5) & 0x3fff;
        if (!w || !h) return null;
        return { width: w, height: h };
      }
    }
    return null;
  }

  if (chunk === "VP8L") {
    // Lossless: signature byte 0x2f then 4 bytes packed dims.
    // https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification
    const sig = buf[20];
    if (sig !== 0x2f) return null;
    if (buf.length < 25) return null;
    const b0 = buf[21]!;
    const b1 = buf[22]!;
    const b2 = buf[23]!;
    const b3 = buf[24]!;
    const width = (((b1 & 0x3f) << 8) | b0) + 1;
    const height = (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) + 1;
    if (!width || !height) return null;
    return { width, height };
  }

  return null;
}

function parseJpegExifOrientation(buf: Buffer): number | null {
  // Returns EXIF orientation (1..8) if present.
  // We scan APP1 Exif segment and parse TIFF IFD0 orientation tag (0x0112).
  if (buf.length < 4) return null;
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  let i = 2;
  while (i + 4 < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    while (i < buf.length && buf[i] === 0xff) i++;
    if (i >= buf.length) break;
    const marker = buf[i]!;
    i++;

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) continue;
    if (i + 1 >= buf.length) break;
    const len = buf.readUInt16BE(i);
    if (len < 2) return null;

    // APP1
    if (marker === 0xe1) {
      const start = i + 2;
      const end = start + (len - 2);
      if (end <= buf.length && end - start >= 14) {
        if (buf.toString("ascii", start, start + 6) === "Exif\u0000\u0000") {
          const tiff = start + 6;
          const endian = buf.toString("ascii", tiff, tiff + 2);
          const le = endian === "II";
          const be = endian === "MM";
          if (!le && !be) return null;

          const readU16 = (off: number) => (le ? buf.readUInt16LE(off) : buf.readUInt16BE(off));
          const readU32 = (off: number) => (le ? buf.readUInt32LE(off) : buf.readUInt32BE(off));

          // Validate TIFF magic 42
          const magic = readU16(tiff + 2);
          if (magic !== 42) return null;

          const ifd0Offset = readU32(tiff + 4);
          const ifd0 = tiff + ifd0Offset;
          if (ifd0 + 2 > end) return null;
          const numDir = readU16(ifd0);
          const entry = ifd0 + 2;
          for (let n = 0; n < numDir; n++) {
            const eoff = entry + n * 12;
            if (eoff + 12 > end) break;
            const tag = readU16(eoff);
            if (tag !== 0x0112) continue; // Orientation
            const type = readU16(eoff + 2);
            const count = readU32(eoff + 4);
            if (type !== 3 || count < 1) return null; // SHORT
            const valueOff = eoff + 8;
            const value = le ? buf.readUInt16LE(valueOff) : buf.readUInt16BE(valueOff);
            if (value >= 1 && value <= 8) return value;
            return null;
          }
        }
      }
    }

    i += len;
  }

  return null;
}

async function getImageSize(absPath: string): Promise<ImageSize | null> {
  // Read a small prefix; enough for PNG/GIF/WEBP and usually for JPEG SOF.
  const fh = await fs.open(absPath, "r");
  try {
    const { size } = await fh.stat();
    const readLen = Math.min(size, 512 * 1024);
    const buf = Buffer.alloc(readLen);
    await fh.read(buf, 0, readLen, 0);

    const png = parsePngSize(buf);
    if (png) return png;
    const gif = parseGifSize(buf);
    if (gif) return gif;
    const webp = parseWebpSize(buf);
    if (webp) return webp;
    const jpeg = parseJpegSize(buf);
    if (!jpeg) return null;

    // Account for EXIF orientation: browsers auto-rotate, changing displayed aspect ratio.
    const o = parseJpegExifOrientation(buf);
    const swap = o === 5 || o === 6 || o === 7 || o === 8; // 90/270 rotations
    return swap ? { width: jpeg.height, height: jpeg.width } : jpeg;
  } catch {
    return null;
  } finally {
    await fh.close();
  }
}

async function walk(dirAbs: string, baseAbs: string, out: Array<{ rel: string; dirRel: string; file: string }>) {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      await walk(abs, baseAbs, out);
      continue;
    }
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) continue;

    const rel = path.relative(baseAbs, abs);
    const dirRel = path.dirname(rel);
    out.push({ rel, dirRel, file: ent.name });
  }
}

export async function GET() {
  const photosRootAbs = path.join(process.cwd(), "public", "photos");

  const found: Array<{ rel: string; dirRel: string; file: string }> = [];
  try {
    await walk(photosRootAbs, photosRootAbs, found);
  } catch {
    // If the folder doesn't exist or isn't readable, return empty list.
    return NextResponse.json<PhotoEntry[]>([]);
  }

  // Sort by directory then filename (stable deterministic ordering).
  found.sort((a, b) => {
    const da = a.dirRel.toLowerCase();
    const db = b.dirRel.toLowerCase();
    if (da < db) return -1;
    if (da > db) return 1;
    const fa = a.file.toLowerCase();
    const fb = b.file.toLowerCase();
    if (fa < fb) return -1;
    if (fa > fb) return 1;
    return 0;
  });

  const orderByDir = new Map<string, number>();
  const photos: PhotoEntry[] = await Promise.all(found.map(async ({ rel, dirRel, file }) => {
    const dir = (dirRel === "." ? "" : dirRel).replaceAll("\\", "/");
    const folder = dir ? dir.split("/").at(-1)! : "Photos";
    const nextOrder = (orderByDir.get(dir) ?? 0) + 1;
    orderByDir.set(dir, nextOrder);

    const abs = path.join(photosRootAbs, rel);
    const size = await getImageSize(abs);
    const src = `/photos/${rel.replaceAll("\\", "/")}`;
    return { src, dir, folder, order: nextOrder, file, width: size?.width ?? null, height: size?.height ?? null };
  }));

  return NextResponse.json<PhotoEntry[]>(photos, {
    headers: {
      // Cache a bit; files in public change infrequently.
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}

