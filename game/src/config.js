// Crown of Embers — every tuning number, colour and card in one place.
// The table is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** Fixed simulation step, seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

export const START_LIFE = 30;
export const MAX_HAND = 7;
export const MAX_BOARD = 5;
export const MAX_EMBERS = 8;
export const START_HAND = 4;
export const DECK_SIZE = 24;

/** Five elements, told apart by colour AND shape, never by text alone. */
export const ELEMENTS = {
  flame: { name: 'Flame', color: '#ff7a3c', dark: '#c33d12', shape: 'triangle', glyph: '▲' },
  gale: { name: 'Gale', color: '#4fd8c7', dark: '#1d7a6e', shape: 'diamond', glyph: '◆' },
  frost: { name: 'Frost', color: '#7cc4ff', dark: '#2f6fb2', shape: 'hexagon', glyph: '⬢' },
  stone: { name: 'Stone', color: '#d9a45b', dark: '#8a5f22', shape: 'square', glyph: '■' },
  bloom: { name: 'Bloom', color: '#8fd45e', dark: '#4a7d24', shape: 'circle', glyph: '●' },
};

/**
 * The spirit pool. Each entry: name, element, ember cost, attack, health.
 * The phoenix is the one legendary — cost 5, the biggest numbers on the table.
 */
export const SPIRITS = [
  { name: 'Emberling', element: 'flame', cost: 1, attack: 1, health: 2 },
  { name: 'Ash Imp', element: 'flame', cost: 1, attack: 2, health: 1 },
  { name: 'Cinder Fox', element: 'flame', cost: 2, attack: 3, health: 2 },
  { name: 'Flame Dancer', element: 'flame', cost: 3, attack: 4, health: 3 },
  { name: 'Phoenix', element: 'flame', cost: 5, attack: 6, health: 7, legendary: true },
  { name: 'Breeze Mote', element: 'gale', cost: 1, attack: 1, health: 1 },
  { name: 'Gale Hawk', element: 'gale', cost: 2, attack: 2, health: 3 },
  { name: 'Storm Kite', element: 'gale', cost: 3, attack: 4, health: 2 },
  { name: 'Tempest Roc', element: 'gale', cost: 4, attack: 5, health: 4 },
  { name: 'Frost Wisp', element: 'frost', cost: 1, attack: 1, health: 2 },
  { name: 'Snow Hare', element: 'frost', cost: 2, attack: 2, health: 2 },
  { name: 'Glacier Elk', element: 'frost', cost: 3, attack: 3, health: 5 },
  { name: 'Pebble Pup', element: 'stone', cost: 1, attack: 1, health: 3 },
  { name: 'Stone Golem', element: 'stone', cost: 3, attack: 3, health: 6 },
  { name: 'Ember Tortoise', element: 'stone', cost: 4, attack: 4, health: 6 },
  { name: 'Sproutling', element: 'bloom', cost: 1, attack: 1, health: 2 },
  { name: 'Bloom Sprite', element: 'bloom', cost: 2, attack: 2, health: 3 },
  { name: 'Thorn Vine', element: 'bloom', cost: 3, attack: 5, health: 2 },
];

export const PALETTE = {
  backdrop: '#0d0a24',
  table: '#171238',
  tableEdge: '#241b52',
  felt: '#1d1547',
  gold: '#f2b544',
  goldBright: '#ffd97a',
  cardFace: '#f7e3b0',
  cardBack: '#7a2d1e',
  ink: '#2a1a08',
  text: '#f5eeda',
  muted: '#a89ec9',
  enemy: '#e5534b',
  player: '#4fd8c7',
  panel: '#221a4d',
  panelEdge: '#453a7d',
  button: '#b3541e',
  buttonEdge: '#f2b544',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the win count is kept between visits (this browser only). */
export const WINS_KEY = 'crown-of-embers.wins';
