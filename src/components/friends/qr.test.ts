import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { qrMatrix, qrPath } from "./qr";

/** Draws the modules as pixels (with a quiet zone) and reads them back with a QR decoder, as a phone camera would. */
function decode(matrix: boolean[][], scale = 6, margin = 4): string | null {
  const size = (matrix.length + 2 * margin) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((cells, row) =>
    cells.forEach((dark, col) => {
      if (!dark) return;
      for (let y = 0; y < scale; y++)
        for (let x = 0; x < scale; x++) {
          const i = (((row + margin) * scale + y) * size + (col + margin) * scale + x) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
    }),
  );
  return jsQR(pixels, size, size)?.data ?? null;
}

describe("the QR code for a friend link (T52)", () => {
  it("scans back to the link", () => {
    const url = "https://kindred.example/f/Ab3dEf6hIj9kLm2nOp5qRs";
    expect(decode(qrMatrix(url))).toBe(url);
  });
  it("draws one path inside a four-module quiet zone", () => {
    const matrix = qrMatrix("https://kindred.example/f/x");
    const { size, d } = qrPath(matrix);
    expect(size).toBe(matrix.length + 8);
    expect(d.startsWith("M4 4h1v1h-1z")).toBe(true); // the top-left finder pattern starts at the quiet zone's edge
  });
});
