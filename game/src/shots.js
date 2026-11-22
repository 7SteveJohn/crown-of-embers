// The screenshot scenes behind ?shot=start|play|win|lose. Each one plays the
// real rules forward from a fresh world, steered by a simple autopilot, so the
// frame is what a short game really looks like and the same seed always gives
// the same frame.
//
// The pilot fights hard — Phoenix as soon as it can afford it, a full board,
// dangerous rival spirits traded away, the rest of the flames at the brazier.
// Once the rival brazier is down to 12 it closes: it stops playing cards and
// lets the hand draw back up while the board finishes the job. The play scene
// is captured the moment the attacks leave the rival brazier nearly dead with
// the Phoenix on the table and five cards in hand — before the rival's reply.
// A duel is a close race, so if one shuffle never gets there the staging
// replays the same pilot on the next shuffle (seed + 7919, and so on, up to
// five tries): the frame is still deterministic for a given ?seed=, and it is
// always a position the rules really reached. The win scene's pilot fights
// the same way until the brazier dies; the lose scene's pilot never plays a
// card, so the rival burns the player's brazier down.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createRandom } from './random.js';

/** Run the rival's queued moves until the player's turn comes back. */
function driveAi(world) {
  for (let index = 0; index < 400 && world.state.phase === 'ai' && !world.state.winner; index += 1) {
    world.step(0.6);
  }
}

function hasPhoenix(state) {
  return state.player.board.some((card) => card.name === 'Phoenix');
}

/** A plain-data copy of the position, so the scene can fall back to it. */
function takeSnapshot(world) {
  const state = world.state;
  return {
    turn: state.turn,
    phase: state.phase,
    winner: state.winner,
    log: state.log,
    player: structuredClone(state.player),
    enemy: structuredClone(state.enemy),
    aiQueue: state.aiQueue.slice(),
    aiTimer: state.aiTimer,
    lastFx: state.lastFx ? { ...state.lastFx } : null,
  };
}

function restoreSnapshot(world, snapshot) {
  const state = world.state;
  state.turn = snapshot.turn;
  state.phase = snapshot.phase;
  state.winner = snapshot.winner;
  state.log = snapshot.log;
  state.player = snapshot.player;
  state.enemy = snapshot.enemy;
  state.aiQueue = snapshot.aiQueue;
  state.aiTimer = snapshot.aiTimer;
  state.lastFx = snapshot.lastFx;
}

/**
 * The player's half of one turn: play cards, then attack. It never ends the
 * turn — the caller decides whether the rival replies yet, so a scene can be
 * captured the moment the attacks land. `spareLife` stops brazier attacks
 * once the rival is that low; `keepHand` is how many cards the pilot holds
 * back while fighting (the play scene keeps three, so the hand is nearly full
 * when the closing starts).
 */
function playerPhase(world, spareLife, keepHand) {
  const state = world.state;
  const player = state.player;
  const closing = spareLife !== undefined && state.enemy.life <= 12;
  if (!closing) {
    const phoenixIndex = player.hand.findIndex((card) => card.name === 'Phoenix');
    if (phoenixIndex >= 0 && world.canPlay(player, phoenixIndex)) {
      world.playCard(player, phoenixIndex);
    }
    let guard = 0;
    while (player.board.length < 5 && guard < 10) {
      guard += 1;
      if (player.hand.length <= keepHand) break;
      let best = -1;
      for (let index = 0; index < player.hand.length; index += 1) {
        const card = player.hand[index];
        if (card.name === 'Phoenix' || player.embers < card.cost) continue;
        if (best < 0 || card.attack > player.hand[best].attack) best = index;
      }
      if (best < 0 || !world.canPlay(player, best)) break;
      world.playCard(player, best);
    }
  }
  for (let index = player.board.length - 1; index >= 0; index -= 1) {
    if (world.state.winner) break;
    const spirit = player.board[index];
    if (!spirit || !world.canAttack(player, index)) continue;
    const threat = world.state.enemy.board.sort((a, b) => b.attack - a.attack)[0];
    // When the player's own brazier is burning low, survival comes first:
    // every spirit piles onto the most dangerous rival spirit.
    const defending = player.life <= 15 && threat;
    if (defending && (spirit.name !== 'Phoenix' || player.life <= 8)) {
      world.attack(player, index, { kind: 'spirit', index: world.state.enemy.board.indexOf(threat) });
    } else if (spirit.name !== 'Phoenix' && threat && spirit.attack >= threat.health) {
      world.attack(player, index, { kind: 'spirit', index: world.state.enemy.board.indexOf(threat) });
    } else if (spareLife === undefined || world.state.enemy.life > spareLife) {
      // In a staged play scene, never land the killing blow on the brazier:
      // chip it down to at least 1 life, or take a rival spirit instead.
      if (spareLife !== undefined && world.state.enemy.life - spirit.attack < 1) {
        if (threat) {
          world.attack(player, index, { kind: 'spirit', index: world.state.enemy.board.indexOf(threat) });
        }
      } else {
        world.attack(player, index, { kind: 'brazier' });
      }
    }
  }
}

/** One attempt at the named scene on the world's current shuffle. */
function attemptShot(name, world) {
  world.reset(true);
  const spareLife = name === 'play' ? 5 : undefined;
  const keepHand = name === 'play' ? 3 : 0;
  let best = null;
  let bestHand = 0;
  for (let turn = 0; turn < 60 && !world.state.winner; turn += 1) {
    playerPhase(world, spareLife, keepHand);
    if (world.state.winner) break;
    if (name === 'play') {
      const state = world.state;
      if (state.enemy.life <= 5 && hasPhoenix(state) && state.player.life >= 8 && state.player.hand.length > bestHand) {
        best = takeSnapshot(world);
        bestHand = state.player.hand.length;
        if (bestHand >= 5) break;
      }
    }
    world.endTurn();
    driveAi(world);
  }
  if (name === 'play' && best && (world.state.winner || world.state.enemy.life > 5 || !hasPhoenix(world.state) || world.state.player.hand.length < 5)) {
    restoreSnapshot(world, best);
  }
  return { screen: world.state.winner ? SCREEN_OVER : SCREEN_PLAY };
}

/** Whether the staged position is the scene that was asked for. */
function sceneIsGood(name, world) {
  const state = world.state;
  if (name === 'win') return state.winner === 'player';
  if (name === 'lose') return state.winner === 'enemy';
  return (
    state.winner === null &&
    state.enemy.life > 0 &&
    state.enemy.life <= 5 &&
    state.player.life >= 10 &&
    state.player.hand.length >= 5 &&
    hasPhoenix(state)
  );
}

/**
 * Set `world` to the named scene (start, play, win or lose; any other name is
 * start) and return the screen to draw over it. `seed` is the shuffle the
 * page loaded with; a scene that never lands replays on the next shuffles.
 */
export function stageShot(name, world, seed) {
  if (name !== 'play' && name !== 'win' && name !== 'lose') {
    world.reset(false);
    return { screen: SCREEN_TITLE };
  }
  if (name === 'lose') {
    world.reset(true);
    for (let turn = 0; turn < 40 && !world.state.winner; turn += 1) {
      world.endTurn();
      driveAi(world);
    }
    return { screen: SCREEN_OVER };
  }
  const baseSeed = Number.isInteger(seed) ? seed : 0;
  let scene = null;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    world.reseed(createRandom(baseSeed + attempt * 7919));
    scene = attemptShot(name, world);
    if (sceneIsGood(name, world)) break;
  }
  return scene;
}
