// The Poster for a Place That Isn't There — "VELMARA, The Floating Isles".
// Pure Node stdlib: renders a 1024x1024 travel poster to /output/entry.png.
// No network, no dependencies, fully deterministic (fixed seed).

import * as fs from "node:fs";
import * as zlib from "node:zlib";
import * as crypto from "node:crypto";

const W = 1024;
const H = 1024;
const OUT = "/output/entry.png";

// ---------------------------------------------------------------- PRNG
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261121);

// ---------------------------------------------------------------- pixels
const buf = new Uint8Array(W * H * 3);

type RGB = [number, number, number];

function clamp(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function blendPx(x: number, y: number, c: RGB, a: number): void {
  if (x < 0 || x >= W || y < 0 || y >= H || a <= 0) return;
  if (a >= 1) {
    setPx(x, y, c);
    return;
  }
  const i = (y * W + x) * 3;
  buf[i] = clamp(buf[i] + (c[0] - buf[i]) * a);
  buf[i + 1] = clamp(buf[i + 1] + (c[1] - buf[i + 1]) * a);
  buf[i + 2] = clamp(buf[i + 2] + (c[2] - buf[i + 2]) * a);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(c1: RGB, c2: RGB, t: number): RGB {
  return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Vertical gradient over a y-range through colour stops.
function vgrad(y0: number, y1: number, stops: [number, RGB][]): void {
  for (let y = y0; y <= y1 && y < H; y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    let c: RGB = stops[stops.length - 1][1];
    for (let s = 0; s < stops.length - 1; s++) {
      const [t0, c0] = stops[s];
      const [t1, c1] = stops[s + 1];
      if (t >= t0 && t <= t1) {
        c = mix(c0, c1, (t - t0) / Math.max(0.0001, t1 - t0));
        break;
      }
    }
    for (let x = 0; x < W; x++) setPx(x, y, [c[0] | 0, c[1] | 0, c[2] | 0]);
  }
}

function disc(cx: number, cy: number, r: number, c: RGB, a: number): void {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) blendPx(x, y, c, a);
    }
  }
}

function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a: number): void {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) blendPx(x, y, c, a);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, '#' = on.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(text: string, cx: number, y: number, scale: number, c: RGB): void {
  const w = textWidth(text, scale);
  let x = Math.round(cx - w / 2);
  for (const ch of text) {
    const g = FONT[ch] ?? FONT[" "];
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r][col] === "1") {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              setPx(x + col * scale + dx, y + r * scale + dy, c);
            }
          }
        }
      }
    }
    x += 6 * scale;
  }
}

function hline(x0: number, x1: number, y: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let x = x0; x <= x1; x++) setPx(x, yy, c);
  }
}

// ---------------------------------------------------------------- scene
const SKY: [number, RGB][] = [
  [0.0, [23, 18, 56]],
  [0.35, [61, 35, 100]],
  [0.62, [140, 63, 107]],
  [0.85, [214, 96, 74]],
  [1.0, [232, 106, 74]],
];
const SEA: [number, RGB][] = [
  [0.0, [35, 58, 110]],
  [0.5, [22, 38, 82]],
  [1.0, [12, 18, 48]],
];

function drawSky(): void {
  vgrad(0, 640, SKY);
  // Stars in the upper sky.
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * 300);
    const a = 0.25 + rand() * 0.55;
    const s = rand() < 0.15 ? 2 : 1;
    for (let dy = 0; dy < s; dy++)
      for (let dx = 0; dx < s; dx++) blendPx(x + dx, y + dy, [255, 244, 214], a);
  }
  // Sun glow + disc, low on the right, just kissing the central isle.
  const sx = 700;
  const sy = 450;
  for (let r = 260; r > 80; r -= 4) {
    const a = 0.05 * (1 - r / 280);
    disc(sx, sy, r, [255, 170, 90], Math.max(0, a));
  }
  disc(sx, sy, 82, [255, 214, 140], 1);
  disc(sx, sy, 66, [255, 230, 163], 1);
  // Clouds: soft puffs catching the sunset.
  const cloudCols: RGB[] = [
    [247, 201, 168],
    [232, 150, 150],
    [200, 120, 150],
  ];
  for (let i = 0; i < 7; i++) {
    const cx = 60 + rand() * 900;
    const cy = 180 + rand() * 330;
    const base = 26 + rand() * 42;
    const col = cloudCols[i % cloudCols.length];
    const a = 0.16 + rand() * 0.14;
    ellipse(cx, cy, base * 2.2, base * 0.55, col, a);
    ellipse(cx - base, cy + 6, base * 1.1, base * 0.45, col, a);
    ellipse(cx + base, cy + 8, base * 1.2, base * 0.5, col, a);
  }
  // Birds.
  for (let i = 0; i < 7; i++) {
    const bx = 120 + rand() * 700;
    const by = 210 + rand() * 160;
    const s = 6 + rand() * 7;
    for (let d = 0; d < s; d++) {
      setPx(Math.round(bx - d), Math.round(by - d * 0.45), [26, 16, 48]);
      setPx(Math.round(bx + d), Math.round(by - d * 0.45), [26, 16, 48]);
    }
  }
}

// A floating island: flat grassy top, rocky taper below, warm rim light.
function island(cx: number, topY: number, halfW: number, depth: number): void {
  const top: RGB = [46, 64, 74];
  const rock: RGB = [36, 26, 62];
  const rim: RGB = [255, 179, 107];
  for (let y = topY; y < topY + depth; y++) {
    const t = (y - topY) / depth;
    const w = halfW * (1 - t * 0.92);
    for (let x = Math.floor(cx - w); x <= cx + w; x++) {
      const c = y < topY + 10 ? mix(top, [58, 92, 84], 0.5) : rock;
      // Slight rocky variation, seeded but deterministic per pixel.
      const n = ((x * 31 + y * 17) % 13) / 13;
      const shade = 0.92 + n * 0.16;
      setPx(x, y, [c[0] * shade | 0, c[1] * shade | 0, c[2] * shade | 0]);
    }
    // Warm rim along the top edge.
    if (y < topY + 4) {
      for (let x = Math.floor(cx - halfW); x <= cx + halfW; x++) {
        blendPx(x, y, rim, 0.85);
      }
    }
  }
  // Grassy top line.
  for (let x = Math.floor(cx - halfW); x <= cx + halfW; x++) {
    setPx(x, topY, [96, 150, 110]);
    setPx(x, topY + 1, [80, 132, 100]);
  }
}

function waterfall(x: number, y0: number, y1: number): void {
  for (let y = y0; y < y1; y++) {
    const t = (y - y0) / (y1 - y0);
    const a = 0.85 * (1 - t * 0.7);
    const wob = Math.sin(y * 0.09) * 2;
    for (let dx = -3; dx <= 3; dx++) {
      blendPx(Math.round(x + wob + dx), y, [214, 235, 255], a * (Math.abs(dx) <= 1 ? 1 : 0.5));
    }
  }
}

function drawIslands(): void {
  // Islands float above the sea: rocky points end just over the horizon,
  // falls pour from their undersides down into the water.
  island(512, 520, 260, 110);
  island(170, 565, 130, 65);
  island(872, 550, 150, 80);
  // The Skyfall: twin falls off the central isle into mist.
  waterfall(430, 600, 700);
  waterfall(592, 605, 695);
  waterfall(150, 612, 690);
  waterfall(880, 607, 695);
  // Mist banks where the falls meet the sea: soft overlapping puffs.
  mist(512, 706, 150);
  mist(170, 694, 85);
  mist(880, 698, 100);
}

// A soft mist bank: several faint puffs, never one flat disc.
function mist(cx: number, cy: number, rx: number): void {
  ellipse(cx, cy, rx, 16, [235, 225, 245], 0.16);
  ellipse(cx - rx * 0.45, cy + 4, rx * 0.55, 12, [235, 225, 245], 0.14);
  ellipse(cx + rx * 0.45, cy + 5, rx * 0.6, 12, [235, 225, 245], 0.14);
  ellipse(cx, cy - 6, rx * 0.6, 10, [240, 232, 248], 0.12);
}

function drawSea(): void {
  vgrad(640, H - 1, SEA);
  // Sun path: gold shimmer under the sun.
  for (let i = 0; i < 130; i++) {
    const y = 660 + rand() * 350;
    const spread = 26 + ((y - 660) / 350) * 120;
    const x = 700 + (rand() - 0.5) * 2 * spread;
    const len = 14 + rand() * 46;
    const a = 0.1 + rand() * 0.35;
    for (let dx = 0; dx < len; dx++) {
      blendPx(Math.round(x + dx), Math.round(y), [255, 196, 110], a);
    }
  }
  // Faint wave lines.
  for (let i = 0; i < 70; i++) {
    const y = 660 + rand() * 350;
    const x = rand() * W;
    const len = 20 + rand() * 70;
    for (let dx = 0; dx < len; dx++) {
      blendPx(Math.round(x + dx), Math.round(y), [140, 170, 235], 0.1 + rand() * 0.08);
    }
  }
  // Horizon glow.
  for (let x = 0; x < W; x++) {
    blendPx(x, 640, [255, 150, 90], 0.35);
    blendPx(x, 641, [255, 150, 90], 0.22);
  }
}

// ---------------------------------------------------------------- PNG writer
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function writePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(buf.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- main
function main(): void {
  drawSky();
  drawSea();
  drawIslands(); // after the sea: isles, falls and mist float above the water

  // Title block: name first, then the place's promise, gold rule beneath.
  const cream: RGB = [255, 242, 207];
  const shadow: RGB = [18, 10, 40];
  const gold: RGB = [255, 196, 110];
  drawText("VELMARA", 512 + 5, 72 + 5, 13, shadow);
  drawText("VELMARA", 512, 72, 13, cream);
  drawText("THE FLOATING ISLES", 512 + 3, 192 + 3, 4, shadow);
  drawText("THE FLOATING ISLES", 512, 192, 4, gold);
  hline(312, 712, 244, 3, gold);

  const png = writePng();
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync(OUT, png);
  const sha = crypto.createHash("sha256").update(png).digest("hex");
  console.log(`wrote ${OUT} ${png.length} bytes sha256 ${sha}`);
}

main();
