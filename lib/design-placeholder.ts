// Free, zero-cost stand-in for real AI image generation. Produces a branded
// SVG "concept preview" card instead of calling a paid image API. Swap
// DESIGN_IMAGE_PROVIDER to "openai" (see services/design-generator.ts) once
// a paid image API is wired up — this file stays as the free default.

const STYLE_GRADIENTS: Record<string, [string, string, string]> = {
  "Modern Minimalist": ["#e7d3ab", "#c9a15d", "#8f6435"],
  Scandinavian: ["#d9e2d6", "#a9b8a2", "#6b7d63"],
  Industrial: ["#302a24", "#5a4d3f", "#b8874f"],
  Bohemian: ["#e3b79a", "#c1633b", "#7c3a22"],
  "Luxury Contemporary": ["#efe6d8", "#c9a15d", "#1c1815"],
  Coastal: ["#cfe0e8", "#8fb0bd", "#4c6b78"],
};

const FALLBACK_GRADIENT: [string, string, string] = ["#e7ddcc", "#b8874f", "#1c1815"];

function gradientForStyle(style: string): [string, string, string] {
  return STYLE_GRADIENTS[style] ?? FALLBACK_GRADIENT;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildPlaceholderDesignSvg(roomType: string, style: string): string {
  const [from, via, to] = gradientForStyle(style);
  const size = 1024;
  const title = escapeXml(`${style} ${roomType}`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${from}" />
      <stop offset="55%" stop-color="${via}" />
      <stop offset="100%" stop-color="${to}" />
    </linearGradient>
    <linearGradient id="scrim" x1="0%" y1="60%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.55" />
    </linearGradient>
  </defs>

  <rect width="${size}" height="${size}" fill="url(#bg)" />

  <!-- abstract room silhouette: floor line + simple furniture shapes -->
  <rect x="0" y="720" width="${size}" height="304" fill="#000000" opacity="0.08" />
  <rect x="120" y="600" width="300" height="180" rx="18" fill="#ffffff" opacity="0.16" />
  <rect x="470" y="520" width="200" height="260" rx="18" fill="#ffffff" opacity="0.12" />
  <circle cx="820" cy="640" r="90" fill="#ffffff" opacity="0.14" />

  <rect width="${size}" height="${size}" fill="url(#scrim)" />

  <text x="56" y="120" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#ffffff" opacity="0.85">UDesign AI</text>

  <rect x="56" y="${size - 190}" width="420" height="34" rx="17" fill="#ffffff" opacity="0.16" />
  <text x="76" y="${size - 166}" font-family="Georgia, 'Times New Roman', serif" font-size="16" letter-spacing="2" fill="#ffffff">CONCEPT PREVIEW</text>

  <text x="56" y="${size - 100}" font-family="Georgia, 'Times New Roman', serif" font-size="52" fill="#ffffff">${title}</text>
  <text x="56" y="${size - 56}" font-family="Arial, sans-serif" font-size="20" fill="#ffffff" opacity="0.75">A designer will refine this into a full concept.</text>
</svg>`;
}

export function svgToDataBuffer(svg: string): Buffer {
  return Buffer.from(svg, "utf8");
}
