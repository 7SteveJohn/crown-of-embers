// Where everything sits on the 1280x720 table, in one place so the renderer
// and the input agree on exactly the same rectangles.
import { FIELD } from './config.js';

export const HAND_CARD = { width: 148, height: 206 };
export const BOARD_CARD = { width: 118, height: 164 };
export const BRAZIER = { x: 36, width: 190, height: 190 };

/** The player's hand, fanned across the bottom with a slight tilt. The fan
 * never spreads wider than 800 px, so a full seven-card hand still clears
 * the player's brazier at the bottom left. */
export function handCardRect(index, count) {
  const gap = count > 1 ? Math.min(158, (800 - HAND_CARD.width) / (count - 1)) : 0;
  const total = HAND_CARD.width + gap * (count - 1);
  const startX = (FIELD.width - total) / 2;
  const x = startX + index * gap;
  const middle = (count - 1) / 2;
  const tilt = (index - middle) * 0.045;
  const y = FIELD.height - HAND_CARD.height - 14 - Math.abs(index - middle) * -6;
  return { x, y, width: HAND_CARD.width, height: HAND_CARD.height, tilt };
}

/** A spirit on the board. Enemy row sits high, player row low. */
export function boardCardRect(side, index, count) {
  const gap = 132;
  const total = count * gap - 14;
  const x = (FIELD.width - total) / 2 + index * gap;
  const y = side === 'enemy' ? 110 : 320;
  return { x, y, width: BOARD_CARD.width, height: BOARD_CARD.height };
}

/** The brazier: enemy top-left, player bottom-left. */
export function brazierRect(side) {
  return {
    x: BRAZIER.x,
    y: side === 'enemy' ? 18 : FIELD.height - BRAZIER.height - 18,
    width: BRAZIER.width,
    height: BRAZIER.height,
  };
}

/** Opponent's face-down hand, a small row across the top right. */
export function enemyHandRect(index, count) {
  const width = 62;
  const height = 88;
  const gap = 70;
  const total = count * gap - 8;
  const x = FIELD.width - 24 - total + index * gap;
  return { x, y: 14, width, height };
}

export const END_TURN_BUTTON = { x: 1070, y: 330, width: 180, height: 56 };
export const MUTE_BUTTON = { x: 1070, y: 398, width: 86, height: 44 };
export const RESTART_BUTTON = { x: 1164, y: 398, width: 86, height: 44 };
