// Crown of Embers — the duel itself. Two flame spirits' braziers, 20 life each.
// A turn: draw a card, embers refill to the turn's cap, play spirits by paying
// their ember cost, then send spirits at the enemy brazier or the enemy spirits.
// A spirit that attacks is exhausted until its owner's next turn. The enemy is
// a real AI: it plays what it can afford and attacks sensibly. A brazier at 0
// life ends the duel.
import {
  MAX_BOARD,
  MAX_EMBERS,
  MAX_HAND,
  START_HAND,
  START_LIFE,
} from './config.js';
import { buildDeck } from './cards.js';

export const EVENT_NONE = 0;
export const EVENT_PLAY = 1;
export const EVENT_ATTACK = 2;
export const EVENT_DEATH = 4;
export const EVENT_TURN = 8;
export const EVENT_OVER = 16;

const AI_STEP_DELAY = 0.55;

function freshSide(random, phoenixFirst) {
  return {
    life: START_LIFE,
    embers: 0,
    maxEmbers: 0,
    deck: buildDeck(random, phoenixFirst),
    hand: [],
    board: [],
  };
}

export function createWorld(random) {
  const state = {
    random,
    turn: 0,
    phase: 'player',
    player: null,
    enemy: null,
    winner: null,
    log: 'The braziers are lit. Your move.',
    lastFx: null,
    aiQueue: [],
    aiTimer: 0,
  };

  function drawCard(side) {
    if (side.deck.length === 0 || side.hand.length >= MAX_HAND) return null;
    const card = side.deck.shift();
    side.hand.push(card);
    return card;
  }

  /** Start a side's turn: turn counter, ember refill, spirits ready, one card drawn. */
  function beginTurn(side, other, isPlayer) {
    if (isPlayer) state.turn += 1;
    side.maxEmbers = Math.min(state.turn, MAX_EMBERS);
    side.embers = side.maxEmbers;
    for (const spirit of side.board) spirit.exhausted = false;
    const drawn = drawCard(side);
    state.log = isPlayer
      ? `Turn ${state.turn} — you draw${drawn ? ` ${drawn.name}` : ' nothing; the deck is empty'} and gain ${side.maxEmbers} embers.`
      : `The rival kindles ${side.maxEmbers} embers.`;
    return drawn;
  }

  function checkEnd() {
    if (state.player.life <= 0) {
      state.winner = 'enemy';
      state.phase = 'over';
      state.log = 'Your brazier dies. The rival takes the crown.';
      return EVENT_OVER;
    }
    if (state.enemy.life <= 0) {
      state.winner = 'player';
      state.phase = 'over';
      state.log = 'The rival brazier dies. You take the Crown of Embers!';
      return EVENT_OVER;
    }
    return EVENT_NONE;
  }

  function world() {
    return {
      state,

      /** Swap in a fresh seeded generator (used by the screenshot staging to retry a scene). */
      reseed(nextRandom) {
        random = nextRandom;
        state.random = nextRandom;
      },

      reset(phoenixFirst) {
        state.turn = 0;
        state.phase = 'player';
        state.winner = null;
        state.aiQueue = [];
        state.aiTimer = 0;
        state.lastFx = null;
        state.player = freshSide(random, phoenixFirst);
        state.enemy = freshSide(random, false);
        for (let index = 0; index < START_HAND; index += 1) {
          drawCard(state.player);
          drawCard(state.enemy);
        }
        beginTurn(state.player, state.enemy, true);
        state.log = 'The braziers are lit. Your move.';
      },

      /** Can this hand card be played right now? */
      canPlay(side, handIndex) {
        const card = side.hand[handIndex];
        return (
          state.phase === 'player' &&
          side === state.player &&
          Boolean(card) &&
          side.board.length < MAX_BOARD &&
          side.embers >= card.cost
        );
      },

      playCard(side, handIndex) {
        if (!this.canPlay(side, handIndex)) return EVENT_NONE;
        const card = side.hand.splice(handIndex, 1)[0];
        side.embers -= card.cost;
        // Summoning sickness: a spirit just played cannot attack until its
        // owner's next turn, when beginTurn readies it.
        card.exhausted = true;
        side.board.push(card);
        state.lastFx = { kind: 'play', side: side === state.player ? 'player' : 'enemy', index: side.board.length - 1 };
        state.log = `${side === state.player ? 'You play' : 'The rival plays'} ${card.name} (${card.attack}/${card.health}).`;
        return EVENT_PLAY;
      },

      canAttack(side, boardIndex) {
        const spirit = side.board[boardIndex];
        return (
          state.phase === 'player' &&
          side === state.player &&
          Boolean(spirit) &&
          !spirit.exhausted
        );
      },

      /**
       * A board spirit attacks. Target is { kind: 'brazier' } or
       * { kind: 'spirit', index }. Spirits trade blows; a brazier just burns.
       */
      attack(side, boardIndex, target) {
        const spirit = side.board[boardIndex];
        if (!spirit || spirit.exhausted || state.phase === 'over') return EVENT_NONE;
        const foe = side === state.player ? state.enemy : state.player;
        spirit.exhausted = true;
        let events = EVENT_ATTACK;
        state.lastFx = {
          kind: 'attack',
          side: side === state.player ? 'player' : 'enemy',
          index: boardIndex,
          target,
        };
        if (target.kind === 'brazier') {
          foe.life = Math.max(0, foe.life - spirit.attack);
          state.log = `${spirit.name} strikes the ${foe === state.enemy ? 'rival' : 'your'} brazier for ${spirit.attack}.`;
        } else {
          const defender = foe.board[target.index];
          if (!defender) return EVENT_NONE;
          defender.health -= spirit.attack;
          spirit.health -= defender.attack;
          state.log = `${spirit.name} clashes with ${defender.name} (${spirit.attack} vs ${defender.attack}).`;
          if (defender.health <= 0) {
            foe.board.splice(target.index, 1);
            events |= EVENT_DEATH;
            state.log += ` ${defender.name} burns out.`;
          }
          if (spirit.health <= 0) {
            side.board.splice(boardIndex, 1);
            events |= EVENT_DEATH;
            state.log += ` ${spirit.name} burns out.`;
          }
        }
        return events | checkEnd();
      },

      /** End the player's turn; the rival's moves are queued and played out over time. */
      endTurn() {
        if (state.phase !== 'player') return EVENT_NONE;
        state.phase = 'ai';
        state.aiQueue = planAiTurn();
        state.aiTimer = 0.4;
        state.log = 'You end your turn. The rival stirs…';
        return EVENT_TURN;
      },

      /**
       * Advance the world. The rival's queued moves run one at a time so the
       * player can watch them; nothing else here needs a clock.
       */
      step(dt) {
        if (state.phase !== 'ai' || state.winner) return EVENT_NONE;
        state.aiTimer -= dt;
        if (state.aiTimer > 0 || state.aiQueue.length === 0) {
          if (state.aiQueue.length === 0 && state.aiTimer <= 0) {
            state.phase = 'player';
            beginTurn(state.player, state.enemy, true);
            return EVENT_TURN;
          }
          return EVENT_NONE;
        }
        state.aiTimer = AI_STEP_DELAY;
        const move = state.aiQueue.shift();
        let events = EVENT_NONE;
        if (move.kind === 'play') {
          const handIndex = state.enemy.hand.findIndex((card) => card.id === move.cardId);
          if (handIndex >= 0) {
            const card = state.enemy.hand.splice(handIndex, 1)[0];
            state.enemy.embers -= card.cost;
            card.exhausted = true;
            state.enemy.board.push(card);
            state.lastFx = { kind: 'play', side: 'enemy', index: state.enemy.board.length - 1 };
            state.log = `The rival plays ${card.name} (${card.attack}/${card.health}).`;
            events |= EVENT_PLAY;
          }
        } else if (move.kind === 'attack') {
          const boardIndex = state.enemy.board.findIndex((card) => card.id === move.cardId);
          if (boardIndex >= 0) {
            let target = move.target;
            if (target.kind === 'spirit') {
              const defenderIndex = state.player.board.findIndex((card) => card.id === target.defenderId);
              target = defenderIndex >= 0
                ? { kind: 'spirit', index: defenderIndex }
                : { kind: 'brazier' };
            }
            events |= this.attack(state.enemy, boardIndex, target);
          }
        }
        if (state.winner) return events | EVENT_OVER;
        if (state.aiQueue.length === 0) state.aiTimer = 0.6;
        return events;
      },
    };
  }

  /**
   * The rival's plan for its turn, made once when the turn starts: play the
   * strongest spirits it can afford, then send each ready spirit at the
   * player's brazier — unless a player spirit out-hits it, in which case it
   * duels that spirit instead. Planning never mutates the table; the queued
   * moves do the playing when they run, and targets are found by card id so
   * a spirit that already burned out is never attacked.
   */
  function planAiTurn() {
    const enemy = state.enemy;
    const player = state.player;
    beginTurn(enemy, player, false);
    const moves = [];
    let embers = enemy.embers;
    let boardCount = enemy.board.length;
    const played = [];
    const affordable = enemy.hand
      .filter((card) => card.cost <= embers)
      .sort((a, b) => b.attack - a.attack || a.cost - b.cost);
    for (const card of affordable) {
      if (boardCount >= MAX_BOARD) break;
      if (card.cost > embers) continue;
      embers -= card.cost;
      boardCount += 1;
      played.push(card);
      moves.push({ kind: 'play', cardId: card.id });
    }
    const attackers = enemy.board.concat(played).filter((spirit) => !spirit.exhausted);
    for (const spirit of attackers) {
      // Duel only a dangerous spirit it can actually kill; otherwise every
      // flame goes at the player's brazier.
      const killable = player.board
        .filter((defender) => defender.attack >= 3 && spirit.attack >= defender.health)
        .sort((a, b) => b.attack - a.attack)[0];
      if (killable) {
        moves.push({ kind: 'attack', cardId: spirit.id, target: { kind: 'spirit', defenderId: killable.id } });
      } else {
        moves.push({ kind: 'attack', cardId: spirit.id, target: { kind: 'brazier' } });
      }
    }
    return moves;
  }

  return world();
}
