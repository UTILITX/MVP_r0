// Generate a neutral "bubble" SVG data URL with a centered emoji.
// No colors beyond neutral white fill and gray border to avoid utility color confusion.
export function makeBubbleEmojiDataUrl(emoji: string, size = 28): string {
  const s = Math.max(16, Math.min(size, 64))
  const r = s / 2
  // Use dominant-baseline="central" to center text vertically at y={r}
  // Slight font-size tuning for readability.
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <style>
      text { font-family: system-ui, -apple-system, Segoe UI Emoji, Segoe UI Symbol, Apple Color Emoji, Noto Color Emoji, sans-serif; }
    </style>
  </defs>
  <circle cx="${r}" cy="${r}" r="${r - 1}" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" />
  <text x="${r}" y="${r}" text-anchor="middle" dominant-baseline="central" font-size="${Math.round(s * 0.55)}">${emoji}</text>
</svg>`
  // Encode for data URL
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22")
  return `data:image/svg+xml;utf8,${encoded}`
}
