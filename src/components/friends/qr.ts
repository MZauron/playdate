// T52: the QR code for a Kindred friend link, as a grid of dark and light modules (qrcode-generator, no dependencies). Pure.
import qrcode from "qrcode-generator";

/** The modules of a QR code for `text`, row by row (true = dark). Medium error correction, the smallest size that fits. */
export function qrMatrix(text: string): boolean[][] {
  const code = qrcode(0, "M");
  code.addData(text);
  code.make();
  const n = code.getModuleCount();
  return Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, col) => code.isDark(row, col)));
}

/** One SVG path drawing every dark module, inside a quiet zone of `margin` modules (the size is n + 2 × margin). */
export function qrPath(matrix: readonly (readonly boolean[])[], margin = 4): { size: number; d: string } {
  let d = "";
  matrix.forEach((cells, row) =>
    cells.forEach((dark, col) => {
      if (dark) d += `M${col + margin} ${row + margin}h1v1h-1z`;
    }),
  );
  return { size: matrix.length + 2 * margin, d };
}
