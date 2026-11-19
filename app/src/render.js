// The cover renderer: draws the whole poster — panels, photos, grade, caption — onto a 2D
// canvas context at whatever size the caller asks for. The editor preview and the PNG export
// run this exact same code path, so what you see is byte-for-byte what you download.
//
// Drawing order: ink background, each panel (photo cover-fitted with its own pan/zoom, or a
// painted neon-coast backdrop while the panel is empty), the grade's colour wash per panel,
// panel seams, the grade's unifying glow, the caption lettering, and a vignette.

import { gradeById } from './grades.js';
import { layoutById } from './layouts.js';

export const HEADLINE_FONT = "'Anton', 'Arial Narrow', sans-serif";
export const ACCENT_FONT = "'Pacifico', cursive";

const INK = '#150826';
const SEAM = '#0b0518';

/** The photo a panel should show: its own in per-panel mode, the shared one in span mode. */
export function panelPhotoId(state, index) {
  if (state.fill === 'span') return state.spanPhotoId;
  return state.panels[index]?.photoId ?? null;
}

/** Deterministic little random generator so empty-panel backdrops never flicker between draws. */
function seededRandom(seed) {
  let value = seed * 2654435761 % 4294967296;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

/** Paints a stylised neon-coast scene (sunset sky, striped sun, skyline, sea) inside a rect. */
function paintBackdrop(ctx, rect, seed) {
  const rand = seededRandom(seed + 7);
  const sky = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  sky.addColorStop(0, '#2b0a4e');
  sky.addColorStop(0.45, '#a4136e');
  sky.addColorStop(0.72, '#ff5e3a');
  sky.addColorStop(1, '#ffb347');
  ctx.fillStyle = sky;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  // The sun: a warm disc low in the sky, cut by retro horizontal stripes.
  const sunX = rect.x + rect.w * (0.3 + rand() * 0.4);
  const sunY = rect.y + rect.h * 0.66;
  const sunR = Math.min(rect.w, rect.h) * 0.30;
  const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
  sun.addColorStop(0, '#ffe259');
  sun.addColorStop(1, '#ff7518');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(43, 10, 78, 0.55)';
  for (let i = 0; i < 4; i += 1) {
    const stripeY = sunY + sunR * (0.08 + i * 0.2);
    ctx.fillRect(sunX - sunR, stripeY, sunR * 2, sunR * 0.055);
  }

  // A dark skyline along the horizon, heights from the seeded generator.
  const horizon = rect.y + rect.h * 0.78;
  ctx.fillStyle = '#1a0b2e';
  let bx = rect.x;
  while (bx < rect.x + rect.w) {
    const bw = rect.w * (0.05 + rand() * 0.09);
    const bh = rect.h * (0.05 + rand() * 0.13);
    ctx.fillRect(bx, horizon - bh, bw, bh);
    bx += bw + rect.w * 0.012;
  }
  ctx.fillRect(rect.x, horizon, rect.w, rect.y + rect.h - horizon);

  // The sea: deep band with a few light flecks.
  ctx.fillStyle = '#12062b';
  ctx.fillRect(rect.x, rect.y + rect.h * 0.86, rect.w, rect.h * 0.14);
  ctx.fillStyle = 'rgba(255, 179, 71, 0.5)';
  for (let i = 0; i < 7; i += 1) {
    const fy = rect.y + rect.h * (0.875 + rand() * 0.1);
    const fx = rect.x + rand() * rect.w * 0.9;
    ctx.fillRect(fx, fy, rect.w * (0.03 + rand() * 0.07), Math.max(1.5, rect.h * 0.006));
  }
}

/** Draws one photo into a panel rect, cover-fitted then shifted by the panel's pan and zoom. */
function drawPhoto(ctx, img, rect, transform) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * transform.zoom;
  const drawnW = img.naturalWidth * scale;
  const drawnH = img.naturalHeight * scale;
  const centreX = rect.x + rect.w / 2 + transform.panX * rect.w;
  const centreY = rect.y + rect.h / 2 + transform.panY * rect.h;
  ctx.drawImage(img, centreX - drawnW / 2, centreY - drawnH / 2, drawnW, drawnH);
}

/** Washes a rect with the grade's vertical colour stops. */
function washGrade(ctx, rect, stops) {
  const gradient = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  for (const [offset, colour] of stops) gradient.addColorStop(offset, colour);
  ctx.fillStyle = gradient;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}

/** The script accent line: pink, slightly tilted, sitting above the headline. */
function drawAccent(ctx, W, H, text) {
  if (!text.trim()) return;
  const size = H * 0.082;
  ctx.save();
  ctx.translate(W / 2, H * 0.135);
  ctx.rotate(-0.055);
  ctx.font = `${size}px ${ACCENT_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(10, 2, 24, 0.65)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.14;
  ctx.strokeStyle = '#2a0a3e';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = '#ff5da2';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** The condensed headline: auto-shrunk until it fits, white with a heavy ink outline. */
function drawHeadline(ctx, W, H, text) {
  const words = text.trim().toUpperCase();
  if (!words) return;
  let size = H * 0.175;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const fits = () => {
    ctx.font = `${size}px ${HEADLINE_FONT}`;
    return ctx.measureText(words).width <= W * 0.94;
  };
  while (!fits() && size > H * 0.045) size *= 0.94;
  ctx.font = `${size}px ${HEADLINE_FONT}`;
  const baseline = H * 0.945;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.17;
  ctx.strokeStyle = '#160a24';
  ctx.shadowColor = 'rgba(8, 2, 18, 0.55)';
  ctx.shadowBlur = size * 0.10;
  ctx.shadowOffsetY = size * 0.05;
  ctx.strokeText(words, W / 2, baseline);
  ctx.shadowColor = 'transparent';
  const fill = ctx.createLinearGradient(0, baseline - size, 0, baseline);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, '#ffd9ec');
  ctx.fillStyle = fill;
  ctx.fillText(words, W / 2, baseline);
  ctx.restore();
}

/** The studio tag in the top-left corner — our own name on our own art. */
function drawTag(ctx, W, H) {
  const size = H * 0.026;
  ctx.save();
  ctx.font = `${size}px ${HEADLINE_FONT}`;
  try { ctx.letterSpacing = `${Math.round(W * 0.004)}px`; } catch { /* older engines */ }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.shadowColor = 'rgba(8, 2, 18, 0.7)';
  ctx.shadowBlur = size * 0.3;
  ctx.fillText('NEON COAST COVER STUDIO', W * 0.028, H * 0.024);
  ctx.restore();
}

/**
 * Draws the complete cover described by `state` onto `ctx` at W x H.
 * `photosById` maps photo ids to loaded Image objects. `options.selected`, when a number,
 * outlines that panel with a dashed editor-only highlight (never used for exports).
 */
export function drawCover(ctx, W, H, state, photosById, options = {}) {
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  const gutter = Math.max(2, W * 0.005);

  ctx.save();
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  layout.panels.forEach((panel, index) => {
    const rect = {
      x: panel.x * W + gutter,
      y: panel.y * H + gutter,
      w: panel.w * W - gutter * 2,
      h: panel.h * H - gutter * 2,
    };
    const transform = state.panels[index] ?? { zoom: 1, panX: 0, panY: 0 };
    const img = photosById.get(panelPhotoId(state, index));

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (img) {
      ctx.filter = grade.filter;
      drawPhoto(ctx, img, rect, transform);
      ctx.filter = 'none';
    } else {
      paintBackdrop(ctx, rect, index * 13 + layout.panels.length);
    }
    washGrade(ctx, rect, grade.overlay);
    ctx.restore();

    ctx.strokeStyle = SEAM;
    ctx.lineWidth = Math.max(2, W * 0.004);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

    if (options.selected === index) {
      ctx.save();
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = Math.max(2, W * 0.0035);
      ctx.setLineDash([W * 0.014, W * 0.009]);
      ctx.strokeRect(rect.x + ctx.lineWidth, rect.y + ctx.lineWidth, rect.w - ctx.lineWidth * 2, rect.h - ctx.lineWidth * 2);
      ctx.restore();
    }
  });

  // One unifying glow and a vignette over everything, under the lettering.
  ctx.fillStyle = grade.glow;
  ctx.fillRect(0, 0, W, H);
  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vignette.addColorStop(0, 'rgba(8, 2, 18, 0)');
  vignette.addColorStop(1, 'rgba(8, 2, 18, 0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  drawTag(ctx, W, H);
  drawAccent(ctx, W, H, state.accent);
  drawHeadline(ctx, W, H, state.headline);
  ctx.restore();
}
