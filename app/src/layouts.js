// Cover layouts for Neon Coast Cover Studio.
//
// Each layout is a list of panels in fractions of the cover (x, y, w, h all in 0..1), so the
// same layout works at every export size. The renderer insets each panel by a small gutter and
// strokes the gaps, which is what gives the finished art its multi-panel poster feel. Panel
// order matters: panel 1 is the first entry, and the editor's panel chips follow this order.

export const LAYOUTS = [
  {
    id: 'hero',
    name: 'Single Hero',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: 'duo',
    name: 'Vertical Duo',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 1 },
      { x: 0.5, y: 0, w: 0.5, h: 1 },
    ],
  },
  {
    id: 'trio',
    name: 'Trio Strip',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 1 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
    ],
  },
  {
    id: 'grid4',
    name: 'Classic Four',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0, w: 0.5, h: 0.5 },
      { x: 0, y: 0.5, w: 0.5, h: 0.5 },
      { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    ],
  },
  {
    id: 'sidestrip',
    name: 'Hero + Side Strip',
    panels: [
      { x: 0, y: 0, w: 0.68, h: 1 },
      { x: 0.68, y: 0, w: 0.32, h: 0.5 },
      { x: 0.68, y: 0.5, w: 0.32, h: 0.5 },
    ],
  },
  {
    id: 'collage6',
    name: 'Six Collage',
    panels: [
      { x: 0, y: 0, w: 1 / 3, h: 0.5 },
      { x: 1 / 3, y: 0, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0, w: 1 / 3, h: 0.5 },
      { x: 0, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 1 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
      { x: 2 / 3, y: 0.5, w: 1 / 3, h: 0.5 },
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[3];
}
