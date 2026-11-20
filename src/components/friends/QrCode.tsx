import { qrMatrix, qrPath } from "./qr";

/** T52: a QR code drawn as one SVG path, black on white with a quiet zone, so a phone camera reads it on any background. */
export function QrCode({ text, label, size = 220 }: { text: string; label: string; size?: number }) {
  const { size: modules, d } = qrPath(qrMatrix(text));
  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${modules} ${modules}`} width={size} height={size} shapeRendering="crispEdges" className="rounded-xl">
      <rect width={modules} height={modules} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}
