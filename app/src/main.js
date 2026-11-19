// Neon Coast Cover Studio — page wiring.
//
// Everything the person touches lives here: loading photos (file picker, drag & drop, the two
// bundled samples), choosing layouts and grades, assigning photos to panels, panning and
// zooming each panel, editing the caption, undo/redo, and exporting the finished cover as a
// PNG at 1080x1080, 1080x1350 or 1920x1080. Photos are read locally and never leave the
// machine; the app makes no network requests.
//
// A `?shot=` query sets up a fixed scene instead of the welcome state, purely so the maker can
// take the entry's screenshots reproducibly:
//   ?shot=cover   — only the cover, at the export size named by `size`
//   ?shot=editor  — the full editor with a sample photo loaded
// Both honour `photo` (sample name), `layout`, `grade`, `caption` and `accent`, and set
// window.__shotReady once the scene has been painted.

import { GRADES } from './grades.js';
import { LAYOUTS, layoutById } from './layouts.js';
import { drawCover } from './render.js';
import { createHistory, initialState } from './state.js';

const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const els = Object.fromEntries(
  ['stage', 'cover', 'fileInput', 'dropZone', 'thumbs', 'layoutGrid', 'gradeGrid', 'panelChips',
   'zoom', 'headline', 'accent', 'sizeSelect', 'exportBtn', 'undoBtn', 'redoBtn', 'status',
   'fillSpan', 'fillPanels', 'resetPanelBtn', 'samplePier', 'sampleBlvd',
  ].map((id) => [id, document.getElementById(id)]),
);

const history = createHistory(initialState());
// The working state is always a private copy: history entries are never mutated in place,
// so live previews (slider drags, typing, panning) cannot corrupt the undo stack.
let state = structuredClone(history.current);
const photos = []; // { id, name, img }
let photoCounter = 0;
let exportSize = '1080x1080';
let cleanShot = false; // true in ?shot=cover scenes: no editor-only outlines on the art

const photosById = () => new Map(photos.map((photo) => [photo.id, photo.img]));

/** Repaints the preview canvas at the current export size, with the selection outline. */
function redraw() {
  const [W, H] = SIZES[exportSize];
  const canvas = els.cover;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, W, H, state, photosById(), { selected: state.fill === 'panels' && !cleanShot ? state.selected : null });
}

/** Applies a finished edit: records it for undo and repaints. */
function commit(mutator) {
  const next = structuredClone(state);
  mutator(next);
  history.commit(next);
  state = structuredClone(history.current);
  syncControls();
  redraw();
}

/** Live edit while a control is still moving: repaints without touching history. */
function preview(mutator) {
  mutator(state);
  redraw();
}

function say(message) {
  els.status.textContent = message;
}

/** Loads an image from a URL (object URL or a bundled sample path) as a promise. */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Adds a loaded image to the photo library and puts it to work in the current fill mode. */
function adoptPhoto(img, name) {
  photoCounter += 1;
  const photo = { id: `photo-${photoCounter}`, name, img };
  photos.push(photo);
  commit((next) => {
    if (next.fill === 'span') {
      next.spanPhotoId = photo.id;
    } else if (!next.panels[next.selected].photoId) {
      next.panels[next.selected].photoId = photo.id;
    }
  });
  renderThumbs();
  say(`${name} loaded — drag on the cover to position it.`);
  return photo;
}

async function addFiles(fileList) {
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      adoptPhoto(await loadImage(url), file.name);
    } catch {
      say(`Skipped ${file.name}: not a readable image.`);
    }
  }
}

async function addSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  return adoptPhoto(img, `${name} (sample)`);
}

/** Renders the photo library as clickable thumbnails with remove buttons. */
function renderThumbs() {
  els.thumbs.replaceChildren();
  for (const photo of photos) {
    const item = document.createElement('div');
    item.className = 'thumb';
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    img.title = `${photo.name} — click to use`;
    img.addEventListener('click', () => {
      commit((next) => {
        if (next.fill === 'span') next.spanPhotoId = photo.id;
        else next.panels[next.selected].photoId = photo.id;
      });
      say(state.fill === 'span' ? `${photo.name} now spans the cover.` : `${photo.name} is in panel ${state.selected + 1}.`);
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'thumb-remove';
    remove.textContent = '×';
    remove.title = `Remove ${photo.name}`;
    remove.addEventListener('click', () => {
      const at = photos.indexOf(photo);
      if (at !== -1) photos.splice(at, 1);
      commit((next) => {
        if (next.spanPhotoId === photo.id) next.spanPhotoId = null;
        for (const panel of next.panels) if (panel.photoId === photo.id) panel.photoId = null;
      });
      renderThumbs();
    });
    item.append(img, remove);
    els.thumbs.append(item);
  }
}

/** Builds the layout picker: one button per layout with a tiny panel diagram. */
function buildLayoutGrid() {
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layout-btn';
    button.dataset.layout = layout.id;
    const diagram = document.createElement('span');
    diagram.className = 'layout-diagram';
    for (const panel of layout.panels) {
      const cell = document.createElement('span');
      cell.style.left = `${panel.x * 100}%`;
      cell.style.top = `${panel.y * 100}%`;
      cell.style.width = `${panel.w * 100}%`;
      cell.style.height = `${panel.h * 100}%`;
      diagram.append(cell);
    }
    const label = document.createElement('span');
    label.textContent = layout.name;
    button.append(diagram, label);
    button.addEventListener('click', () => {
      commit((next) => {
        next.layoutId = layout.id;
        if (next.selected >= layout.panels.length) next.selected = 0;
      });
    });
    els.layoutGrid.append(button);
  }
}

/** Builds the grade picker: one swatch button per colour grade. */
function buildGradeGrid() {
  for (const grade of GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'grade-btn';
    button.dataset.grade = grade.id;
    const swatch = document.createElement('span');
    swatch.className = 'grade-swatch';
    swatch.style.background = grade.swatch;
    const label = document.createElement('span');
    label.textContent = grade.name;
    button.append(swatch, label);
    button.addEventListener('click', () => commit((next) => { next.gradeId = grade.id; }));
    els.gradeGrid.append(button);
  }
}

/** Builds the panel selector chips for the current layout. */
function buildPanelChips() {
  els.panelChips.replaceChildren();
  const count = layoutById(state.layoutId).panels.length;
  for (let i = 0; i < count; i += 1) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.panel = String(i);
    chip.textContent = `Panel ${i + 1}`;
    chip.addEventListener('click', () => commit((next) => { next.selected = i; }));
    els.panelChips.append(chip);
  }
}

/** Pushes the current state into every control (after undo/redo and programmatic changes). */
function syncControls() {
  els.headline.value = state.headline;
  els.accent.value = state.accent;
  els.fillSpan.checked = state.fill === 'span';
  els.fillPanels.checked = state.fill === 'panels';
  const panel = state.panels[state.selected];
  els.zoom.value = String(panel ? panel.zoom : 1);
  els.undoBtn.disabled = !history.canUndo;
  els.redoBtn.disabled = !history.canRedo;
  for (const button of els.layoutGrid.querySelectorAll('.layout-btn')) {
    button.classList.toggle('active', button.dataset.layout === state.layoutId);
  }
  for (const button of els.gradeGrid.querySelectorAll('.grade-btn')) {
    button.classList.toggle('active', button.dataset.grade === state.gradeId);
  }
  buildPanelChips();
  for (const chip of els.panelChips.querySelectorAll('.chip')) {
    chip.classList.toggle('active', Number(chip.dataset.panel) === state.selected);
  }
}

/** Exports the cover at the chosen size: the same draw, without the editor outline. */
function exportPng() {
  const [W, H] = SIZES[exportSize];
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  drawCover(canvas.getContext('2d'), W, H, state, photosById(), {});
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `neon-coast-cover-${W}x${H}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    say(`Saved neon-coast-cover-${W}x${H}.png`);
  }, 'image/png');
}

/** Pointer panning on the preview: drag moves the selected (or spanning) panel's photo. */
function wirePan() {
  const canvas = els.cover;
  let drag = null;
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const [W, H] = SIZES[exportSize];
    const px = (event.clientX - rect.left) / rect.width * W;
    const py = (event.clientY - rect.top) / rect.height * H;
    const layout = layoutById(state.layoutId);
    const hit = layout.panels.findIndex((p) => px >= p.x * W && px < (p.x + p.w) * W && py >= p.y * H && py < (p.y + p.h) * H);
    const index = hit !== -1 ? hit : state.selected;
    if (state.fill === 'panels' && state.selected !== index) {
      commit((next) => { next.selected = index; });
    }
    drag = {
      index,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      base: { ...state.panels[index] },
    };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect();
    const panel = layoutById(state.layoutId).panels[drag.index];
    const dx = (event.clientX - drag.startX) / rect.width / panel.w;
    const dy = (event.clientY - drag.startY) / rect.height / panel.h;
    if (Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY) > 2) drag.moved = true;
    preview((live) => {
      live.panels[drag.index].panX = clamp(drag.base.panX + dx, -0.9, 0.9);
      live.panels[drag.index].panY = clamp(drag.base.panY + dy, -0.9, 0.9);
    });
  });
  const finish = () => {
    if (drag && drag.moved) {
      history.commit(structuredClone(state));
      syncControls();
    }
    drag = null;
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

/** All the ordinary editor events. */
function wireControls() {
  els.fileInput.addEventListener('change', () => {
    addFiles(els.fileInput.files);
    els.fileInput.value = '';
  });
  els.dropZone.addEventListener('click', () => els.fileInput.click());
  for (const target of [els.dropZone, els.stage]) {
    target.addEventListener('dragover', (event) => {
      event.preventDefault();
      target.classList.add('dragging');
    });
    target.addEventListener('dragleave', () => target.classList.remove('dragging'));
    target.addEventListener('drop', (event) => {
      event.preventDefault();
      target.classList.remove('dragging');
      addFiles(event.dataTransfer.files);
    });
  }
  els.samplePier.addEventListener('click', () => addSample('pier'));
  els.sampleBlvd.addEventListener('click', () => addSample('boulevard'));
  els.fillSpan.addEventListener('change', () => commit((next) => { next.fill = 'span'; }));
  els.fillPanels.addEventListener('change', () => commit((next) => { next.fill = 'panels'; }));
  els.zoom.addEventListener('input', () => {
    const value = Number(els.zoom.value);
    preview((live) => { live.panels[live.selected].zoom = value; });
  });
  els.zoom.addEventListener('change', () => {
    history.commit(structuredClone(state));
    syncControls();
  });
  els.resetPanelBtn.addEventListener('click', () => commit((next) => {
    const panel = next.panels[next.selected];
    panel.zoom = 1;
    panel.panX = 0;
    panel.panY = 0;
  }));
  els.headline.addEventListener('input', () => preview((live) => { live.headline = els.headline.value; }));
  els.headline.addEventListener('change', () => {
    history.commit(structuredClone(state));
    syncControls();
  });
  els.accent.addEventListener('input', () => preview((live) => { live.accent = els.accent.value; }));
  els.accent.addEventListener('change', () => {
    history.commit(structuredClone(state));
    syncControls();
  });
  els.sizeSelect.addEventListener('change', () => {
    exportSize = els.sizeSelect.value;
    redraw();
  });
  els.exportBtn.addEventListener('click', exportPng);
  els.undoBtn.addEventListener('click', () => {
    state = structuredClone(history.undo());
    syncControls();
    redraw();
  });
  els.redoBtn.addEventListener('click', () => {
    state = structuredClone(history.redo());
    syncControls();
    redraw();
  });
  document.addEventListener('keydown', (event) => {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod || event.key.toLowerCase() !== 'z') return;
    if (event.target instanceof HTMLInputElement && event.target.type === 'text') return;
    event.preventDefault();
    state = structuredClone(event.shiftKey ? history.redo() : history.undo());
    syncControls();
    redraw();
  });
}

/** Fixed scenes for the maker's screenshots; see the file header. */
async function runShotMode(query) {
  const shot = query.get('shot');
  const sampleName = query.get('photo') ?? 'pier';
  const size = query.get('size');
  if (size && SIZES[size]) {
    exportSize = size;
    els.sizeSelect.value = size;
  }
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    cleanShot = true;
  }
  const img = await loadImage(`samples/${sampleName}.jpg`);
  photoCounter += 1;
  const photo = { id: `photo-${photoCounter}`, name: `${sampleName} (sample)`, img };
  photos.push(photo);

  const setup = structuredClone(state);
  setup.spanPhotoId = photo.id;
  setup.headline = query.get('caption') ?? setup.headline;
  setup.accent = query.get('accent') ?? setup.accent;
  if (query.get('layout')) setup.layoutId = query.get('layout');
  if (query.get('grade')) setup.gradeId = query.get('grade');
  if (query.get('fill')) setup.fill = query.get('fill');
  // A composed cover, not four identical crops: nudge each panel's framing.
  const framings = [
    { zoom: 1.18, panX: -0.10, panY: -0.06 },
    { zoom: 1.34, panX: 0.13, panY: -0.04 },
    { zoom: 1.24, panX: -0.04, panY: 0.11 },
    { zoom: 1.42, panX: 0.10, panY: 0.10 },
    { zoom: 1.28, panX: 0, panY: 0 },
    { zoom: 1.5, panX: -0.12, panY: 0.05 },
  ];
  setup.panels = setup.panels.map((panel, i) => ({ ...panel, ...framings[i] }));
  if (setup.fill === 'panels') {
    const second = query.get('photo2');
    if (second) {
      const img2 = await loadImage(`samples/${second}.jpg`);
      photoCounter += 1;
      const photo2 = { id: `photo-${photoCounter}`, name: `${second} (sample)`, img: img2 };
      photos.push(photo2);
      setup.panels = setup.panels.map((panel, i) => ({ ...panel, photoId: i % 2 ? photo2.id : photo.id }));
    } else {
      setup.panels = setup.panels.map((panel) => ({ ...panel, photoId: photo.id }));
    }
  }
  history.commit(setup);
  state = structuredClone(history.current);
  renderThumbs();
  syncControls();
  redraw();
  await document.fonts.ready;
  redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

/** Welcome state: the pier sample already loaded, so the studio works out of the box. */
async function welcome() {
  try {
    const img = await loadImage('samples/pier.jpg');
    photoCounter += 1;
    const photo = { id: `photo-${photoCounter}`, name: 'pier (sample)', img };
    photos.push(photo);
    commit((next) => { next.spanPhotoId = photo.id; });
    renderThumbs();
    say('Sample loaded. Add your own photos, pick a layout and grade, then export.');
  } catch {
    say('Add a photo to begin.');
  }
}

buildLayoutGrid();
buildGradeGrid();
wireControls();
wirePan();
syncControls();
redraw();

// Fonts change the lettering's metrics, so repaint once they are in.
if (document.fonts?.ready) document.fonts.ready.then(() => redraw());

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShotMode(query);
} else {
  welcome();
}
