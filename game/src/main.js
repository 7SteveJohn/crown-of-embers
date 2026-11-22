// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between four screens: title, play, paused and game over.
//
// ?seed=N fixes the shuffle. ?shot=start|play|win|lose (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, WINS_KEY } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ATTACK, EVENT_DEATH, EVENT_OVER, EVENT_PLAY, EVENT_TURN } from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_END_TURN,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
} from './input.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readWins() {
  try {
    return Number.parseInt(window.localStorage.getItem(WINS_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveWins(value) {
  try {
    window.localStorage.setItem(WINS_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the count then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world, seed);
  const ui = { selectedHand: null, selectedBoard: null, muted: audio.muted, wins: readWins() };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, ui, 1 / 60);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toLogical(x, y));
  let screen = SCREEN_TITLE;
  let wins = readWins();
  let selectedHand = null;
  let selectedBoard = null;
  let accumulator = 0;
  let last = performance.now();

  function ui() {
    return { selectedHand, selectedBoard, muted: audio.muted, wins };
  }

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset(false);
    selectedHand = null;
    selectedBoard = null;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Your brazier has 30 life. Spend embers, play spirits, burn the rival brazier.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.winner === 'player') {
      wins += 1;
      saveWins(wins);
      audio.win();
      announce(`You win! The Crown of Embers is yours. Crowns won: ${wins}.`);
    } else {
      audio.lose();
      announce('Your brazier dies. Press Enter to play again.');
    }
  }

  function soundFor(events) {
    if (events & EVENT_OVER) return;
    if (events & EVENT_DEATH) audio.death();
    else if (events & EVENT_ATTACK) audio.attack();
    else if (events & EVENT_PLAY) audio.play();
    else if (events & EVENT_TURN) audio.turn();
  }

  function handleEvents(events) {
    if (events === 0) return;
    renderer.spawnFx(world.state.lastFx, world.state);
    soundFor(events);
    if (events & EVENT_OVER) endGame();
  }

  function selectHand(index) {
    const card = world.state.player.hand[index];
    if (!card) return;
    selectedHand = selectedHand === card.id ? null : card.id;
    selectedBoard = null;
    announce(selectedHand ? `${card.name}, ${card.cost} embers, ${card.attack} attack, ${card.health} health. Click it again to play it.` : 'Card deselected.');
  }

  function handleActions() {
    const actions = input.takeActions();
    const cardKey = input.takeCardKey();
    const click = input.takeClick();

    if (actions & ACTION_MUTE) {
      audio.toggleMute();
      announce(audio.muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART) {
      startGame();
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM || click) startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;

    if (cardKey >= 0) selectHand(cardKey);
    if (actions & (ACTION_CONFIRM | ACTION_END_TURN)) {
      if (world.state.phase === 'player') {
        handleEvents(world.endTurn());
        selectedHand = null;
        selectedBoard = null;
      }
      return;
    }
    if (!click) return;
    audio.unlock();
    const hit = renderer.hitTest(click, world.state, screen);
    if (!hit) {
      selectedHand = null;
      selectedBoard = null;
      return;
    }
    if (hit.kind === 'endTurn') {
      if (world.state.phase === 'player') {
        handleEvents(world.endTurn());
        selectedHand = null;
        selectedBoard = null;
      }
    } else if (hit.kind === 'mute') {
      audio.toggleMute();
    } else if (hit.kind === 'restart') {
      startGame();
    } else if (hit.kind === 'hand') {
      const card = world.state.player.hand[hit.index];
      if (card && selectedHand === card.id) {
        handleEvents(world.playCard(world.state.player, hit.index));
        selectedHand = null;
      } else {
        selectHand(hit.index);
      }
    } else if (hit.kind === 'board' && hit.side === 'player') {
      const card = world.state.player.board[hit.index];
      if (card) {
        selectedBoard = selectedBoard === card.id ? null : card.id;
        selectedHand = null;
      }
    } else if (hit.kind === 'board' && hit.side === 'enemy') {
      if (selectedBoard) {
        const boardIndex = world.state.player.board.findIndex((card) => card.id === selectedBoard);
        if (boardIndex >= 0) {
          handleEvents(world.attack(world.state.player, boardIndex, { kind: 'spirit', index: hit.index }));
          selectedBoard = null;
        }
      } else if (selectedHand) {
        const handIndex = world.state.player.hand.findIndex((card) => card.id === selectedHand);
        if (handIndex >= 0) handleEvents(world.playCard(world.state.player, handIndex));
        selectedHand = null;
      }
    } else if (hit.kind === 'brazier' && hit.side === 'enemy') {
      if (selectedBoard) {
        const boardIndex = world.state.player.board.findIndex((card) => card.id === selectedBoard);
        if (boardIndex >= 0) {
          handleEvents(world.attack(world.state.player, boardIndex, { kind: 'brazier' }));
          selectedBoard = null;
        }
      } else if (selectedHand) {
        const handIndex = world.state.player.hand.findIndex((card) => card.id === selectedHand);
        if (handIndex >= 0) handleEvents(world.playCard(world.state.player, handIndex));
        selectedHand = null;
      }
    }
  }

  function step(dt) {
    if (screen === SCREEN_TITLE) return;
    if (screen !== SCREEN_PLAY) return;
    handleEvents(world.step(dt));
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += dt;
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
      step(STEP);
      accumulator -= STEP;
    }
    if (screen !== SCREEN_PLAY && screen !== SCREEN_TITLE) accumulator = 0;
    renderer.draw(world.state, screen, ui(), dt || 1 / 60);
  }

  world.reset(false);
  screen = SCREEN_TITLE;
  announce('Crown of Embers. Press Enter or click to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
