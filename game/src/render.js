// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 table is scaled to fit the window and centred. All art is drawn
// in code — braziers, spirit cards, a phoenix — and all sparks are particles.
import { ELEMENTS, FIELD, FONT, PALETTE, START_LIFE } from './config.js';
import {
  BOARD_CARD,
  END_TURN_BUTTON,
  HAND_CARD,
  MUTE_BUTTON,
  RESTART_BUTTON,
  boardCardRect,
  brazierRect,
  enemyHandRect,
  handCardRect,
} from './layout.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

/** The element's mark: shape AND colour, so no element is told by text alone. */
function drawElementMark(context, shape, x, y, size, color) {
  context.fillStyle = color;
  context.beginPath();
  if (shape === 'triangle') {
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.9, y + size * 0.7);
    context.lineTo(x - size * 0.9, y + size * 0.7);
  } else if (shape === 'diamond') {
    context.moveTo(x, y - size);
    context.lineTo(x + size * 0.8, y);
    context.lineTo(x, y + size);
    context.lineTo(x - size * 0.8, y);
  } else if (shape === 'hexagon') {
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI / 3) * index - Math.PI / 2;
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
  } else if (shape === 'square') {
    context.fillRect(x - size * 0.8, y - size * 0.8, size * 1.6, size * 1.6);
    context.fill();
    return;
  } else {
    context.arc(x, y, size * 0.85, 0, Math.PI * 2);
  }
  context.closePath();
  context.fill();
}

/** A flame tongue: stacked teardrops, the same shape at any size. */
function drawFlame(context, x, y, width, height, time) {
  const wobble = Math.sin(time * 3 + x) * width * 0.05;
  const gradient = context.createLinearGradient(0, y, 0, y - height);
  gradient.addColorStop(0, '#ff5a1f');
  gradient.addColorStop(0.55, '#ff9a2e');
  gradient.addColorStop(1, '#ffe27a');
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(x - width / 2, y);
  context.bezierCurveTo(x - width * 0.7, y - height * 0.45, x - width * 0.2 + wobble, y - height * 0.7, x + wobble, y - height);
  context.bezierCurveTo(x + width * 0.2 + wobble, y - height * 0.7, x + width * 0.7, y - height * 0.45, x + width / 2, y);
  context.closePath();
  context.fill();
}

/** The phoenix, drawn in code: body, raised swept wings, flowing tail feathers, crowned head. */
function drawPhoenix(context, x, y, scale, time) {
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  const flap = Math.sin(time * 2.2) * 0.08;
  const body = context.createLinearGradient(0, -40, 0, 60);
  body.addColorStop(0, '#ffd97a');
  body.addColorStop(0.5, '#ff7a3c');
  body.addColorStop(1, '#c33d12');
  // Tail feathers, flowing down and out behind the body, tipped with embers.
  context.lineCap = 'round';
  for (let feather = -2; feather <= 2; feather += 1) {
    const sway = Math.sin(time * 3 + feather * 1.3) * 5;
    context.strokeStyle = feather % 2 === 0 ? '#ff9a2e' : '#e5534b';
    context.lineWidth = 6 - Math.abs(feather);
    context.beginPath();
    context.moveTo(feather * 8, 26);
    context.quadraticCurveTo(feather * 22 + sway, 70, feather * 30 + sway, 104 + feather * feather * 5);
    context.stroke();
    context.fillStyle = '#ffd97a';
    context.beginPath();
    context.arc(feather * 30 + sway, 104 + feather * feather * 5, 3.5, 0, Math.PI * 2);
    context.fill();
  }
  // Wings, raised and swept upward, with scalloped trailing edges.
  for (const side of [-1, 1]) {
    context.save();
    context.translate(side * 8, -10);
    context.rotate(-side * (0.8 + flap));
    const wing = context.createLinearGradient(0, 0, side * 120, 0);
    wing.addColorStop(0, '#ff7a3c');
    wing.addColorStop(1, '#c33d12');
    context.fillStyle = wing;
    context.beginPath();
    context.moveTo(0, 0);
    context.quadraticCurveTo(side * 60, -58, side * 118, -52);
    context.quadraticCurveTo(side * 96, -30, side * 104, -18);
    context.quadraticCurveTo(side * 78, -14, side * 84, -2);
    context.quadraticCurveTo(side * 52, 2, side * 56, 12);
    context.quadraticCurveTo(side * 24, 14, 0, 16);
    context.closePath();
    context.fill();
    context.restore();
  }
  // Body and head.
  context.fillStyle = body;
  context.beginPath();
  context.ellipse(0, 0, 26, 44, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(0, -48, 17, 0, Math.PI * 2);
  context.fill();
  // Beak and swept-back crest.
  context.fillStyle = '#f2b544';
  context.beginPath();
  context.moveTo(12, -52);
  context.lineTo(30, -46);
  context.lineTo(12, -42);
  context.closePath();
  context.fill();
  context.strokeStyle = '#ffd97a';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(-4, -62);
  context.quadraticCurveTo(-18, -80, -32, -82);
  context.moveTo(2, -64);
  context.quadraticCurveTo(0, -86, -8, -94);
  context.moveTo(8, -62);
  context.quadraticCurveTo(16, -80, 14, -92);
  context.stroke();
  context.fillStyle = '#1a0e08';
  context.beginPath();
  context.arc(6, -52, 3, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();
  let particles = [];
  let time = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function burst(x, y, color, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (0.4 + Math.random() * 0.6) * speed;
      particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 40,
        life: 0.5 + Math.random() * 0.5,
        age: 0,
        size: 2 + Math.random() * 4,
        color,
      });
    }
  }

  function stepParticles(dt) {
    time += dt;
    // Ambient embers drift up off the table, always.
    if (Math.random() < 0.35) {
      particles.push({
        x: Math.random() * FIELD.width,
        y: FIELD.height + 6,
        vx: (Math.random() - 0.5) * 12,
        vy: -28 - Math.random() * 30,
        life: 3 + Math.random() * 2,
        age: 0,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() < 0.5 ? '#ff9a2e' : '#ffd97a',
      });
    }
    particles = particles.filter((particle) => {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy -= 12 * dt;
      return particle.age < particle.life && particle.y > -10;
    });
  }

  function drawParticles() {
    for (const particle of particles) {
      context.globalAlpha = Math.max(0, 1 - particle.age / particle.life);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawTable() {
    context.fillStyle = PALETTE.table;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.felt;
    context.beginPath();
    context.ellipse(FIELD.width / 2, FIELD.height / 2, 560, 300, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.tableEdge;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(FIELD.width / 2, FIELD.height / 2, 560, 300, 0, 0, Math.PI * 2);
    context.stroke();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(260, 312);
    context.lineTo(FIELD.width - 260, 312);
    context.stroke();
  }

  /** A brazier: bowl, flame scaled to life, and the life total in big numerals. */
  function drawBrazier(side, life) {
    const rect = brazierRect(side);
    const cx = rect.x + rect.width / 2;
    const bowlY = rect.y + rect.height - 52;
    const flameHeight = 26 + (life / START_LIFE) * 92;
    const dim = life <= 5;
    context.globalAlpha = dim ? 0.75 : 1;
    if (life > 0) {
      drawFlame(context, cx, bowlY - 6, 74, flameHeight, time);
      drawFlame(context, cx, bowlY - 6, 34, flameHeight * 0.6, time + 2);
    }
    context.fillStyle = '#3a2a1a';
    context.beginPath();
    context.moveTo(cx - 62, bowlY);
    context.quadraticCurveTo(cx, bowlY + 46, cx + 62, bowlY);
    context.quadraticCurveTo(cx + 44, bowlY + 18, cx - 44, bowlY + 18);
    context.closePath();
    context.fill();
    context.fillStyle = '#6b4423';
    context.fillRect(cx - 8, bowlY + 40, 16, 26);
    context.globalAlpha = 1;
    text(String(life), cx, rect.y + 34, 54, life <= 5 ? '#ff6b5e' : '#ffd97a', 'center');
    text(side === 'enemy' ? 'RIVAL BRAZIER' : 'YOUR BRAZIER', cx, rect.y + 58, 15, PALETTE.muted, 'center');
    if (dim && life > 0) text('DYING', cx, bowlY - flameHeight - 12, 18, '#ff6b5e', 'center');
  }

  function drawCardFace(card, x, y, width, height, selected, playable) {
    const element = ELEMENTS[card.element];
    context.save();
    if (selected) {
      context.shadowColor = '#ffd97a';
      context.shadowBlur = 26;
    }
    roundRect(context, x, y, width, height, 12);
    context.fillStyle = PALETTE.cardFace;
    context.fill();
    context.shadowBlur = 0;
    context.lineWidth = selected ? 4 : 2;
    context.strokeStyle = selected ? '#ffd97a' : element.dark;
    context.stroke();
    // Element banner across the top.
    context.fillStyle = element.color;
    roundRect(context, x + 6, y + 6, width - 12, 30, 8);
    context.fill();
    text(card.name.toUpperCase(), x + width / 2, y + 28, card.name.length > 10 ? 15 : 18, '#fff', 'center');
    // Spirit art: the element mark, big in the middle.
    drawElementMark(context, element.shape, x + width / 2, y + height * 0.48, width * 0.26, element.color);
    if (card.legendary) drawPhoenix(context, x + width / 2, y + height * 0.48, 0.42, time);
    text(element.name, x + width / 2, y + height * 0.68, 15, PALETTE.muted, 'center');
    // Cost: ember circle, top left. Attack bottom left, health bottom right.
    context.fillStyle = '#b3541e';
    context.beginPath();
    context.arc(x + 24, y + 52, 20, 0, Math.PI * 2);
    context.fill();
    text(String(card.cost), x + 24, y + 60, 26, '#fff', 'center');
    context.fillStyle = '#c33d12';
    context.beginPath();
    context.arc(x + 26, y + height - 26, 22, 0, Math.PI * 2);
    context.fill();
    text(String(card.attack), x + 26, y + height - 17, 28, '#fff', 'center');
    context.fillStyle = '#2f6fb2';
    context.beginPath();
    context.arc(x + width - 26, y + height - 26, 22, 0, Math.PI * 2);
    context.fill();
    text(String(card.health), x + width - 26, y + height - 17, 28, '#fff', 'center');
    if (!playable) {
      context.fillStyle = 'rgba(20, 12, 40, 0.35)';
      roundRect(context, x, y, width, height, 12);
      context.fill();
    }
    if (card.exhausted) {
      text('TIRED', x + width / 2, y + height - 52, 14, '#8a5f22', 'center');
    }
    context.restore();
  }

  function drawCardBack(x, y, width, height) {
    roundRect(context, x, y, width, height, 8);
    context.fillStyle = PALETTE.cardBack;
    context.fill();
    context.strokeStyle = '#f2b544';
    context.lineWidth = 2;
    context.stroke();
    drawFlame(context, x + width / 2, y + height * 0.62, width * 0.4, height * 0.32, time + x);
  }

  function drawButton(rect, label, enabled) {
    context.globalAlpha = enabled ? 1 : 0.45;
    roundRect(context, rect.x, rect.y, rect.width, rect.height, 10);
    context.fillStyle = PALETTE.button;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = PALETTE.buttonEdge;
    context.stroke();
    text(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 7, 20, '#fff', 'center');
    context.globalAlpha = 1;
  }

  function drawHud(state, ui) {
    const player = state.player;
    const enemy = state.enemy;
    // Turn and embers, top centre.
    text(`TURN ${state.turn}`, FIELD.width / 2, 34, 24, PALETTE.text, 'center');
    text(`🔥 ${player.embers}/${player.maxEmbers} embers`, FIELD.width / 2, 62, 20, PALETTE.goldBright, 'center');
    text(`Rival embers ${enemy.embers}`, FIELD.width / 2, 88, 16, PALETTE.muted, 'center');
    // Log line, between the two boards.
    text(state.log, FIELD.width / 2, 298, 17, PALETTE.text, 'center');
    // Buttons, right of the player board.
    drawButton(END_TURN_BUTTON, state.phase === 'player' ? 'END TURN ⏎' : 'RIVAL…', state.phase === 'player');
    drawButton(MUTE_BUTTON, ui.muted ? 'UNMUTE' : 'MUTE', true);
    drawButton(RESTART_BUTTON, 'RESTART', true);
    // Wins, under the rival brazier.
    if (ui.wins > 0) text(`Crowns won: ${ui.wins}`, 36, 244, 16, PALETTE.goldBright, 'left');
  }

  function drawPlay(state, ui) {
    drawTable();
    drawBrazier('enemy', state.enemy.life);
    drawBrazier('player', state.player.life);
    // Rival hand, face down.
    for (let index = 0; index < state.enemy.hand.length; index += 1) {
      const rect = enemyHandRect(index, state.enemy.hand.length);
      drawCardBack(rect.x, rect.y, rect.width, rect.height);
    }
    // Boards.
    for (const [side, list] of [['enemy', state.enemy.board], ['player', state.player.board]]) {
      for (let index = 0; index < list.length; index += 1) {
        const rect = boardCardRect(side, index, list.length);
        const card = list[index];
        const selected = ui.selectedBoard === card.id;
        drawCardFace(card, rect.x, rect.y, rect.width, rect.height, selected, true);
      }
    }
    // Player hand, fanned.
    for (let index = 0; index < state.player.hand.length; index += 1) {
      const card = state.player.hand[index];
      const rect = handCardRect(index, state.player.hand.length);
      const selected = ui.selectedHand === card.id;
      context.save();
      context.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
      context.rotate(rect.tilt);
      context.translate(-rect.width / 2, -rect.height / 2);
      drawCardFace(card, 0, selected ? -26 : 0, rect.width, rect.height, selected, state.player.embers >= card.cost);
      context.restore();
    }
    drawHud(state, ui);
    drawParticles();
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 36;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(10, 6, 30, 0.72)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    roundRect(context, x, y, width, height, 16);
    context.fillStyle = PALETTE.panel;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = accent;
    context.stroke();
    text(title, FIELD.width / 2, y + 62, 44, accent, 'center');
    lines.forEach((line, index) => {
      text(line, FIELD.width / 2, y + 112 + index * 36, 20, PALETTE.text, 'center');
    });
    text(prompt, FIELD.width / 2, y + height - 30, 18, PALETTE.muted, 'center');
  }

  function drawTitle(state, ui) {
    drawTable();
    drawPhoenix(context, FIELD.width / 2, 250, 1.5, time);
    drawFlame(context, 240, 650, 80, 120, time);
    drawFlame(context, 1040, 650, 80, 120, time + 3);
    text('CROWN OF EMBERS', FIELD.width / 2, 470, 58, PALETTE.goldBright, 'center');
    text('A duel of flame spirits — your life is your brazier.', FIELD.width / 2, 512, 22, PALETTE.text, 'center');
    text('Spend embers to play spirits. Send them at the rival brazier.', FIELD.width / 2, 544, 20, PALETTE.muted, 'center');
    text('Click or press Enter to begin  ·  1-7 select a card  ·  E end turn', FIELD.width / 2, 600, 18, PALETTE.gold, 'center');
    if (ui.wins > 0) text(`Crowns won: ${ui.wins}`, FIELD.width / 2, 640, 18, PALETTE.goldBright, 'center');
    drawParticles();
  }

  function drawOver(state, ui) {
    drawPlay(state, ui);
    const won = state.winner === 'player';
    drawPanel(
      won ? '👑 YOU TAKE THE CROWN' : 'YOUR BRAZIER DIES',
      won
        ? ['The rival brazier is cold ash.', `The duel lasted ${state.turn} turns.`, 'The Crown of Embers is yours.']
        : ['The rival spirit takes the crown.', `You held out ${state.turn} turns.`, 'Kindle the brazier and try again.'],
      'Press Enter or click to play again  ·  R restart',
      won ? PALETTE.goldBright : '#e5534b',
    );
  }

  return {
    /** Logical table coordinates of a point given in canvas CSS pixels. */
    toLogical(clientX, clientY) {
      return {
        x: (clientX * (window.devicePixelRatio || 1) - view.x) / view.scale,
        y: (clientY * (window.devicePixelRatio || 1) - view.y) / view.scale,
      };
    },

    /** What a click at logical coordinates lands on, or null. */
    hitTest(point, state, screen) {
      if (screen !== SCREEN_PLAY) return null;
      const inside = (rect) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
      if (inside(END_TURN_BUTTON)) return { kind: 'endTurn' };
      if (inside(MUTE_BUTTON)) return { kind: 'mute' };
      if (inside(RESTART_BUTTON)) return { kind: 'restart' };
      if (inside(brazierRect('enemy'))) return { kind: 'brazier', side: 'enemy' };
      if (inside(brazierRect('player'))) return { kind: 'brazier', side: 'player' };
      for (let index = state.enemy.board.length - 1; index >= 0; index -= 1) {
        if (inside(boardCardRect('enemy', index, state.enemy.board.length))) return { kind: 'board', side: 'enemy', index };
      }
      for (let index = state.player.board.length - 1; index >= 0; index -= 1) {
        if (inside(boardCardRect('player', index, state.player.board.length))) return { kind: 'board', side: 'player', index };
      }
      for (let index = state.player.hand.length - 1; index >= 0; index -= 1) {
        const rect = handCardRect(index, state.player.hand.length);
        if (inside({ x: rect.x, y: rect.y - 26, width: rect.width, height: rect.height + 26 })) return { kind: 'hand', index };
      }
      return null;
    },

    /** A burst of sparks where the world's last effect happened. */
    spawnFx(fx, state) {
      if (!fx) return;
      if (fx.kind === 'play') {
        const list = fx.side === 'player' ? state.player.board : state.enemy.board;
        if (list[fx.index]) {
          const rect = boardCardRect(fx.side, fx.index, list.length);
          burst(rect.x + rect.width / 2, rect.y + rect.height / 2, '#ffd97a', 22, 260);
        }
      } else if (fx.kind === 'attack') {
        let x = FIELD.width / 2;
        let y = FIELD.height / 2;
        if (fx.target.kind === 'brazier') {
          const rect = brazierRect(fx.side === 'player' ? 'enemy' : 'player');
          x = rect.x + rect.width / 2;
          y = rect.y + rect.height / 2;
        } else {
          const foe = fx.side === 'player' ? state.enemy : state.player;
          if (foe.board[fx.target.index]) {
            const rect = boardCardRect(foe === state.enemy ? 'enemy' : 'player', fx.target.index, foe.board.length);
            x = rect.x + rect.width / 2;
            y = rect.y + rect.height / 2;
          }
        }
        burst(x, y, '#ff7a3c', 30, 320);
      }
    },

    draw(state, screen, ui, dt) {
      stepParticles(dt);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = PALETTE.backdrop;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
      if (screen === SCREEN_TITLE) drawTitle(state, ui);
      else if (screen === SCREEN_OVER) drawOver(state, ui);
      else if (screen === SCREEN_PAUSED) {
        drawPlay(state, ui);
        drawPanel('PAUSED', ['The braziers wait, embers banked.'], 'Press Esc, P or Enter to keep playing', PALETTE.gold);
      } else drawPlay(state, ui);
      context.setTransform(1, 0, 0, 1, 0, 0);
    },
  };
}
