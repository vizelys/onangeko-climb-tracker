/** Very dark band colours need the inset edge ring to read on the background. */
export function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return false;
  const [r, g, b] = m.slice(1).map((v) => parseInt(v, 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40;
}
