// Editor state and its undo/redo history for Neon Coast Cover Studio.
//
// The state is one plain object — layout, grade, caption words, fill mode, and one transform
// (photo, zoom, pan) per panel slot — so history is just a stack of deep copies. Photos
// themselves live outside the state (they are loaded Image objects); the state only holds
// their ids, which keeps snapshots tiny and undo instant.

export const MAX_PANELS = 6;

function blankPanel() {
  return { photoId: null, zoom: 1, panX: 0, panY: 0 };
}

export function initialState() {
  return {
    layoutId: 'grid4',
    gradeId: 'vice',
    headline: 'NEON COAST',
    accent: 'welcome to the',
    fill: 'span',
    spanPhotoId: null,
    panels: Array.from({ length: MAX_PANELS }, blankPanel),
    selected: 0,
  };
}

/** A tiny undo/redo stack over state snapshots. `commit` is called after each finished edit. */
export function createHistory(start) {
  let stack = [structuredClone(start)];
  let cursor = 0;
  return {
    get current() {
      return stack[cursor];
    },
    get canUndo() {
      return cursor > 0;
    },
    get canRedo() {
      return cursor < stack.length - 1;
    },
    commit(next) {
      stack = stack.slice(0, cursor + 1);
      stack.push(structuredClone(next));
      if (stack.length > 120) stack.shift();
      cursor = stack.length - 1;
    },
    undo() {
      if (cursor > 0) cursor -= 1;
      return stack[cursor];
    },
    redo() {
      if (cursor < stack.length - 1) cursor += 1;
      return stack[cursor];
    },
  };
}
