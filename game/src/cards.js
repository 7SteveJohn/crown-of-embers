// The deck and the spirits in it. A deck is 24 cards: every spirit in the pool
// once, then the cheap ones a second time so early turns always have something
// to play, with the Phoenix dealt on top for the staged screenshot scenes.
import { DECK_SIZE, SPIRITS } from './config.js';
import { shuffle } from './random.js';

let nextId = 1;

/** A fresh spirit card: its own id, full health, ready to attack when played. */
export function makeCard(template) {
  return {
    id: nextId++,
    name: template.name,
    element: template.element,
    cost: template.cost,
    attack: template.attack,
    health: template.health,
    maxHealth: template.health,
    legendary: Boolean(template.legendary),
    exhausted: false,
  };
}

/**
 * Build a 24-card deck. `phoenixFirst` puts the Phoenix on top of the shuffled
 * deck, so a staged scene can draw it in the opening hand.
 */
export function buildDeck(random, phoenixFirst) {
  const pool = SPIRITS.slice();
  const cheap = SPIRITS.filter((spirit) => spirit.cost <= 2);
  const templates = pool.concat(cheap).slice(0, DECK_SIZE);
  let deck = shuffle(templates, random).map(makeCard);
  if (phoenixFirst) {
    const phoenixIndex = deck.findIndex((card) => card.name === 'Phoenix');
    if (phoenixIndex > 0) {
      const phoenix = deck.splice(phoenixIndex, 1)[0];
      deck.unshift(phoenix);
    }
  }
  return deck;
}
