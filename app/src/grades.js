// Colour grades for Neon Coast Cover Studio.
//
// A grade is three things that together fake the printed-poster look of a neon-sunset cover:
//   filter  — a CSS filter string the canvas applies while drawing each panel's photo,
//   overlay — colour stops washed over the panel afterwards (the sunset / neon tint),
//   glow    — a soft colour laid over the whole cover at low alpha to unify the panels.
// Everything is plain data so the renderer stays dumb and the look is easy to tune.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    filter: 'saturate(1.38) contrast(1.09) brightness(1.05) hue-rotate(-8deg)',
    overlay: [
      [0, 'rgba(72, 16, 110, 0.30)'],
      [0.42, 'rgba(255, 62, 130, 0.10)'],
      [0.72, 'rgba(255, 122, 26, 0.16)'],
      [1, 'rgba(38, 6, 54, 0.34)'],
    ],
    glow: 'rgba(255, 92, 138, 0.08)',
    swatch: 'linear-gradient(160deg, #48106e, #ff3e82 55%, #ff7a1a)',
  },
  {
    id: 'neon',
    name: 'Neon Night',
    filter: 'saturate(1.65) contrast(1.16) brightness(0.94)',
    overlay: [
      [0, 'rgba(6, 30, 66, 0.34)'],
      [0.5, 'rgba(120, 0, 140, 0.14)'],
      [1, 'rgba(2, 6, 26, 0.44)'],
    ],
    glow: 'rgba(38, 198, 255, 0.10)',
    swatch: 'linear-gradient(160deg, #061e42, #7a008c 60%, #26c6ff)',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    filter: 'sepia(0.34) saturate(1.28) brightness(1.10) contrast(1.03)',
    overlay: [
      [0, 'rgba(120, 52, 4, 0.16)'],
      [0.55, 'rgba(255, 176, 66, 0.10)'],
      [1, 'rgba(64, 20, 44, 0.26)'],
    ],
    glow: 'rgba(255, 176, 66, 0.10)',
    swatch: 'linear-gradient(160deg, #783404, #ffb042 60%, #40202c)',
  },
  {
    id: 'tealorange',
    name: 'Teal & Orange',
    filter: 'saturate(1.32) contrast(1.13) brightness(1.02) hue-rotate(-10deg)',
    overlay: [
      [0, 'rgba(255, 138, 42, 0.14)'],
      [0.5, 'rgba(0, 0, 0, 0)'],
      [1, 'rgba(0, 66, 78, 0.34)'],
    ],
    glow: 'rgba(0, 128, 140, 0.08)',
    swatch: 'linear-gradient(160deg, #ff8a2a, #7a4a20 55%, #00424e)',
  },
  {
    id: 'noir',
    name: 'Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.03)',
    overlay: [
      [0, 'rgba(0, 0, 0, 0.22)'],
      [0.5, 'rgba(0, 0, 0, 0)'],
      [1, 'rgba(0, 0, 0, 0.42)'],
    ],
    glow: 'rgba(0, 0, 0, 0.12)',
    swatch: 'linear-gradient(160deg, #111, #888 55%, #000)',
  },
  {
    id: 'pastel',
    name: 'Pastel Dawn',
    filter: 'saturate(0.88) brightness(1.13) contrast(0.92)',
    overlay: [
      [0, 'rgba(255, 183, 213, 0.20)'],
      [0.55, 'rgba(168, 216, 255, 0.10)'],
      [1, 'rgba(120, 84, 160, 0.20)'],
    ],
    glow: 'rgba(255, 214, 232, 0.12)',
    swatch: 'linear-gradient(160deg, #ffb7d5, #a8d8ff 60%, #7854a0)',
  },
];

export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}
