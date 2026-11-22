// Keyboard and pointer input. One-shot presses (confirm, pause, mute,
// restart, end turn, card keys) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost or counted twice. Pointer
// clicks are reported with logical table coordinates — the renderer tells the
// main loop where the click landed.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;
export const ACTION_END_TURN = 16;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CARD_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7'];

export function createInput(canvas, toLogical) {
  let actions = 0;
  let cardKey = -1;
  let click = null;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyM') {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (event.code === 'KeyR') {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (event.code === 'KeyE') {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (CARD_KEYS.includes(event.code)) {
      if (!event.repeat) cardKey = CARD_KEYS.indexOf(event.code);
    } else {
      return;
    }
    event.preventDefault();
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    click = toLogical(event.clientX - rect.left, event.clientY - rect.top);
  });

  return {
    /** The one-shot action flags since the last call. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The hand index (0-based) of a 1-7 key pressed since the last call, else -1. */
    takeCardKey() {
      const taken = cardKey;
      cardKey = -1;
      return taken;
    },
    /** The logical coordinates of a click since the last call, else null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}
