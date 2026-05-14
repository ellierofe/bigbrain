// ---------------------------------------------------------------------------
// Stable per-string hue selector for the DS-02 tag palette (1..8).
// djb2 hash, mod 8, +1. Same input → same hue across renders and reloads.
// Used wherever a free-form tag list wants visual variety without a category map.
// ---------------------------------------------------------------------------

export type TagHue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export function tagHue(label: string): TagHue {
  let h = 5381
  for (let i = 0; i < label.length; i++) {
    h = ((h << 5) + h + label.charCodeAt(i)) | 0
  }
  return (((Math.abs(h) % 8) + 1) as TagHue)
}
