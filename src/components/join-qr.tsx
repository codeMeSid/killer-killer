import { encode } from "uqr";

/**
 * The join link as a QR code: obsidian modules on an orange field. Dark-on-light keeps the
 * standard polarity, so every phone camera reads it; the orange is the palette's own.
 */
export function JoinQr({ url, className = "" }: { url: string; className?: string }) {
  const { data, size } = encode(url, { ecc: "M", border: 2 });
  let d = "";
  data.forEach((row, y) => row.forEach((dark, x) => dark && (d += `M${x} ${y}h1v1h-1z`)));
  return (
    <svg
      data-ui
      role="img"
      aria-label="QR code to join this case"
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`block aspect-square ${className}`}
    >
      <rect width={size} height={size} className="fill-orange" />
      <path d={d} className="fill-background" />
    </svg>
  );
}
