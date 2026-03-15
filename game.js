// ============================================================
//  PENGUIN JUMP — Pixel Art Vertical Scroller
// ============================================================

const CANVAS_W       = 480;
const CANVAS_H       = 720;
const GRAVITY        = 1800;
const JUMP_FORCE     = -900;
const SUPER_JUMP     = -1400;
const DOUBLE_JUMP_F  = -765;
const TERMINAL_VEL   = 1200;
const MOVE_SPEED     = 220;
const SPRITE_SCALE   = 3;
const PLATFORM_H     = 12;
const PLATFORM_MARGIN = 30;
const METERS_PER_PX  = 1 / 60;
const MAGNET_RADIUS  = 120;

// ── Penguin image (loaded from PNG, background removed) ──────
const _ = null; // transparent pixel used in all sprite arrays
let penguinCanvas = null;  // set after image loads

function loadPenguinSprite(callback) {
  const img = new Image();
  img.onload = () => {
    try {
      // Remove the light-blue background via pixel manipulation
      const oc = document.createElement('canvas');
      oc.width  = img.width;
      oc.height = img.height;
      const octx = oc.getContext('2d');
      octx.drawImage(img, 0, 0);

      const imgData = octx.getImageData(0, 0, oc.width, oc.height);
      const d = imgData.data;
      // Sample background color from top-left corner pixel
      const bgR = d[0], bgG = d[1], bgB = d[2];
      const tol = 35;
      for (let i = 0; i < d.length; i += 4) {
        if (Math.abs(d[i]   - bgR) < tol &&
            Math.abs(d[i+1] - bgG) < tol &&
            Math.abs(d[i+2] - bgB) < tol) {
          d[i+3] = 0;
        }
      }
      octx.putImageData(imgData, 0, 0);
      penguinCanvas = oc;
    } catch (e) {
      // getImageData blocked (e.g. local file security) — use raw image
      penguinCanvas = img;
    }
    callback(); // always called regardless of success/failure
  };
  img.onerror = () => { penguinCanvas = null; callback(); };
  img.src = 'penguin%20pixel%20art.png'; // encode space to ensure loading
}

// Power-up orb icons (8×8)
const ORB_INVINC = [
  [_,'#ffd700',_,'#ffd700',_,'#ffd700',_,'#ffd700'],
  [_,_,'#ffd700','#ffd700','#ffd700','#ffd700',_,_],
  ['#ffd700','#ffd700','#fff9c4','#fff9c4','#fff9c4','#fff9c4','#ffd700','#ffd700'],
  ['#ffd700','#fff9c4','#fff9c4','#ffe066','#ffe066','#fff9c4','#fff9c4','#ffd700'],
  ['#ffd700','#fff9c4','#ffe066','#ffd700','#ffd700','#ffe066','#fff9c4','#ffd700'],
  ['#ffd700','#ffd700','#fff9c4','#ffe066','#ffe066','#fff9c4','#ffd700','#ffd700'],
  [_,_,'#ffd700','#ffd700','#ffd700','#ffd700',_,_],
  [_,'#ffd700',_,'#ffd700',_,'#ffd700',_,'#ffd700'],
];
const ORB_DBJUMP = [
  [_,'#00ffff',_,_,_,_,'#00ffff',_],
  ['#00ffff','#00ffff',_,_,_,_,'#00ffff','#00ffff'],
  [_,'#00ffff','#00ffff',_,_,'#00ffff','#00ffff',_],
  [_,_,'#00ffff','#00ffff','#00ffff','#00ffff',_,_],
  [_,'#00e5ff',_,'#00e5ff','#00e5ff',_,'#00e5ff',_],
  ['#00e5ff','#00e5ff',_,'#00e5ff','#00e5ff',_,'#00e5ff','#00e5ff'],
  [_,'#00e5ff','#00e5ff',_,_,'#00e5ff','#00e5ff',_],
  [_,_,'#00e5ff',_,_,'#00e5ff',_,_],
];
const ORB_SJUMP = [
  [_,_,_,'#ff00ff',_,_,_,_],
  [_,_,'#ff00ff','#ff00ff',_,_,_,_],
  [_,'#ff00ff','#ff00ff','#ff66ff',_,_,_,_],
  ['#ff00ff','#ff00ff','#ff66ff','#ff00ff','#ff00ff',_,_,_],
  [_,_,'#ff00ff','#ff66ff','#ff00ff','#ff00ff',_,_],
  [_,_,_,'#ff00ff','#ff66ff','#ff00ff','#ff00ff',_],
  [_,_,_,_,'#ff00ff','#ff66ff','#ff00ff',_],
  [_,_,_,_,_,'#ff00ff','#ff66ff',_],
];
const ORB_MAGNET = [
  [_,'#00ff88','#00ff88','#00ff88','#00ff88','#00ff88',_,_],
  ['#00ff88','#00ff88',_,_,_,_,'#00ff88',_],
  ['#00ff88',_,_,_,_,_,'#00ff88',_],
  ['#00ff88',_,_,_,_,_,_,_],
  ['#00ff88',_,_,_,_,_,_,_],
  ['#00ff88',_,_,_,_,_,'#00ff88',_],
  ['#00ff88','#00ff88',_,_,_,_,'#00ff88',_],
  [_,'#00ff88','#00ff88','#00ff88','#00ff88','#00ff88',_,_],
];

// Coin (7×7)
const Y = '#ffe066';
const YL = '#fff9c4';
const COIN_SPRITE = [
  [_,Y,Y,Y,Y,Y,_],
  [Y,Y,YL,YL,YL,Y,Y],
  [Y,YL,YL,Y,YL,YL,Y],
  [Y,YL,Y,YL,Y,YL,Y],
  [Y,YL,YL,Y,YL,YL,Y],
  [Y,Y,YL,YL,YL,Y,Y],
  [_,Y,Y,Y,Y,Y,_],
];

// ── Renderer ─────────────────────────────────────────────────
class Renderer {
  constructor(ctx) { this.ctx = ctx; }

  clear(color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  rect(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  sprite(data, x, y, scale = SPRITE_SCALE) {
    const ox = Math.round(x);
    const oy = Math.round(y);
    for (let row = 0; row < data.length; row++) {
      for (let col = 0; col < data[row].length; col++) {
        const c = data[row][col];
        if (c) {
          this.ctx.fillStyle = c;
          this.ctx.fillRect(ox + col * scale, oy + row * scale, scale, scale);
        }
      }
    }
  }

  text(str, x, y, size, color, align = 'left') {
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${size}px monospace`;
    this.ctx.textAlign = align;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(str, Math.round(x), Math.round(y));
  }

  // pixel font text (big blocky)
  bigText(str, x, y, scale, color) {
    // Use canvas font but large and pixelated
    this.ctx.fillStyle = color;
    this.ctx.font = `bold ${scale * 8}px monospace`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(str, Math.round(x), Math.round(y));
  }
}

// ── InputHandler ─────────────────────────────────────────────
class InputHandler {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    window.addEventListener('keydown', e => {
      if (!this.keys[e.code]) this.justPressed[e.code] = true;
      this.keys[e.code] = true;
      // Prevent arrow key scrolling
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }
  isDown(code) { return !!this.keys[code]; }
  wasJustPressed(code) {
    const v = !!this.justPressed[code];
    if (v) delete this.justPressed[code];
    return v;
  }
  consumeAll() { this.justPressed = {}; }
}

// ── Camera ───────────────────────────────────────────────────
class Camera {
  constructor() {
    this.y = 0;       // world Y of top of screen
    this.minY = 0;    // lowest (highest up) camera.y ever
  }
  reset() { this.y = 0; this.minY = 0; }
  update(penguinWorldY) {
    const target = penguinWorldY - CANVAS_H * 0.65;
    if (target < this.y) {
      this.y += (target - this.y) * 0.12;
    }
    if (this.y < this.minY) this.minY = this.y;
  }
  toScreen(worldY) { return worldY - this.y; }
  getHeightM() { return Math.abs(this.minY) * METERS_PER_PX; }
}

// ── DifficultyManager ─────────────────────────────────────────
class DifficultyManager {
  getParams(heightM) {
    const t = Math.min(heightM / 200, 1.0);
    const easeIn = t * t;
    return {
      minGapY:              lerp(60,  110, t),
      maxGapY:              lerp(100, 200, t),
      deadlyChance:         lerp(0.0, 0.35, easeIn),
      movingChance:         lerp(0.1, 0.50, t),
      movingSpeed:          lerp(60,  200, t),
      platformMinW:         lerp(80,  48,  t),
      platformMaxW:         lerp(110, 65,  t),
      coinChance:           lerp(0.4, 0.15, t),
      powerUpChance:        0.06,
    };
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

// ── Particle ──────────────────────────────────────────────────
class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = rand(2, 5);
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += 400 * dt;
    this.life -= dt;
  }
  render(r, camY) {
    const alpha = this.life / this.maxLife;
    const s = Math.round(this.size * alpha);
    if (s < 1) return;
    r.ctx.globalAlpha = alpha;
    r.rect(this.x - s / 2, this.y - camY - s / 2, s, s, this.color);
    r.ctx.globalAlpha = 1;
  }
}

function spawnParticles(arr, wx, wy, color, count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + rand(-0.3, 0.3);
    const speed = rand(60, 200);
    arr.push(new Particle(wx, wy, Math.cos(angle) * speed, Math.sin(angle) * speed, color, rand(0.4, 0.9)));
  }
}

// ── Coin ──────────────────────────────────────────────────────
class Coin {
  constructor(wx, wy) {
    this.wx = wx; this.wy = wy;
    this.vx = 0; this.vy = 0;
    this.alive = true;
    this.w = 7 * 2; this.h = 7 * 2;
  }
  update(dt, penguinCX, penguinCY, hasMagnet) {
    if (hasMagnet) {
      const dx = penguinCX - (this.wx + this.w / 2);
      const dy = penguinCY - (this.wy + this.h / 2);
      const d = Math.hypot(dx, dy);
      if (d < MAGNET_RADIUS) {
        this.vx += (dx / d) * 600 * dt;
        this.vy += (dy / d) * 600 * dt;
        // cap speed
        const spd = Math.hypot(this.vx, this.vy);
        if (spd > 400) { this.vx = (this.vx / spd) * 400; this.vy = (this.vy / spd) * 400; }
      }
    }
    this.wx += this.vx * dt;
    this.wy += this.vy * dt;
  }
  render(r, camY) {
    r.sprite(COIN_SPRITE, this.wx, this.wy - camY, 2);
  }
  bounds() { return { x: this.wx, y: this.wy, w: this.w, h: this.h }; }
}

// ── PowerUpOrb ────────────────────────────────────────────────
const ORB_TYPES = ['invincibility', 'doubleJump', 'superJump', 'magnet'];
const ORB_SPRITES = {
  invincibility: ORB_INVINC,
  doubleJump: ORB_DBJUMP,
  superJump: ORB_SJUMP,
  magnet: ORB_MAGNET,
};
const ORB_COLORS = {
  invincibility: '#ffd700',
  doubleJump: '#00ffff',
  superJump: '#ff00ff',
  magnet: '#00ff88',
};

class PowerUpOrb {
  constructor(wx, wy, type) {
    this.wx = wx; this.wy = wy;
    this.baseY = wy;
    this.type = type;
    this.alive = true;
    this.w = 8 * 2; this.h = 8 * 2;
  }
  update(t) {
    this.wy = this.baseY + Math.sin(t * 2.5) * 5;
  }
  render(r, camY) {
    const sy = this.wy - camY;
    // glow ring
    r.ctx.globalAlpha = 0.3;
    r.ctx.strokeStyle = ORB_COLORS[this.type];
    r.ctx.lineWidth = 3;
    r.ctx.beginPath();
    r.ctx.arc(this.wx + this.w / 2, sy + this.h / 2, this.w / 2 + 4, 0, Math.PI * 2);
    r.ctx.stroke();
    r.ctx.globalAlpha = 1;
    r.sprite(ORB_SPRITES[this.type], this.wx, sy, 2);
  }
  bounds() { return { x: this.wx, y: this.wy, w: this.w, h: this.h }; }
}

// ── Platform ──────────────────────────────────────────────────
class Platform {
  constructor(x, y, w, type, moveSpeed = 0) {
    this.x = x; this.y = y;
    this.w = w; this.h = PLATFORM_H;
    this.type = type; // 'static' | 'moving' | 'deadly'
    this.vx = moveSpeed;
    this.minX = x - 80;
    this.maxX = x + 80;
    this.alive = true;
  }
  update(dt) {
    if (this.type === 'moving') {
      this.x += this.vx * dt;
      if (this.x <= this.minX || this.x + this.w >= this.maxX + this.w) this.vx *= -1;
      this.x = Math.max(PLATFORM_MARGIN, Math.min(CANVAS_W - this.w - PLATFORM_MARGIN, this.x));
    }
  }
  render(r, camY) {
    const sy = this.y - camY;
    if (this.type === 'static') {
      r.rect(this.x, sy, this.w, this.h, '#4ecca3');
      r.rect(this.x, sy, this.w, 3, '#2d9a78');
      // pixel noise
      for (let i = 0; i < this.w; i += 8) {
        r.rect(this.x + i + 2, sy + 5, 2, 2, '#2d9a78');
      }
    } else if (this.type === 'moving') {
      r.rect(this.x, sy, this.w, this.h, '#f7b731');
      r.rect(this.x, sy, this.w, 3, '#e5a520');
      for (let i = 0; i < this.w; i += 10) {
        r.rect(this.x + i, sy + 3, 5, this.h - 3, '#e5a520');
      }
    } else { // deadly
      r.rect(this.x, sy, this.w, this.h, '#c0392b');
      r.rect(this.x, sy, this.w, 3, '#7b241c');
      // spikes above
      const spikeW = 10;
      const spikeH = 8;
      for (let sx2 = this.x; sx2 < this.x + this.w - spikeW / 2; sx2 += spikeW + 2) {
        for (let row = 0; row < spikeH; row++) {
          const halfW = Math.max(1, Math.round(((spikeH - row) / spikeH) * (spikeW / 2)));
          r.rect(sx2 + spikeW / 2 - halfW, sy - spikeH + row, halfW * 2, 1, '#e74c3c');
        }
      }
    }
  }
  bounds() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

// ── Penguin ───────────────────────────────────────────────────
class Penguin {
  constructor() { this.reset(); }
  reset() {
    this.w = 48;
    this.h = 54;
    this.wx = CANVAS_W / 2 - this.w / 2;
    // Spawn seated on the first platform (CANVAS_H - 180), then launch upward
    this.wy = CANVAS_H - 180 - this.h - 2;
    this.vx = 0;
    this.vy = JUMP_FORCE; // initial bounce so player lands on platforms immediately
    this.onGround = false;
    this.facing = 1; // 1=right, -1=left
    this.activePowerUp = null;
    this.powerUpTimer = 0;
    this.doubleJumpAvailable = false;
    this.superJumpReady = false;
    this.dead = false;
    this.deathTimer = 0;
    this.frameCount = 0;
  }
  bounds() {
    return { x: this.wx + 8, y: this.wy + 4, w: this.w - 16, h: this.h - 6 };
  }
  cx() { return this.wx + this.w / 2; }
  cy() { return this.wy + this.h / 2; }
  isInvincible() { return this.activePowerUp === 'invincibility'; }

  collectPowerUp(type) {
    this.activePowerUp = type;
    if (type === 'invincibility')  this.powerUpTimer = 8;
    else if (type === 'doubleJump') { this.powerUpTimer = 12; this.doubleJumpAvailable = true; }
    else if (type === 'superJump') { this.powerUpTimer = 1; this.superJumpReady = true; }
    else if (type === 'magnet')    this.powerUpTimer = 10;
  }

  update(dt, input) {
    if (this.dead) { this.deathTimer -= dt; return; }
    this.frameCount++;

    // Power-up timer
    if (this.activePowerUp && this.activePowerUp !== 'superJump') {
      this.powerUpTimer -= dt;
      if (this.powerUpTimer <= 0) {
        this.activePowerUp = null;
        this.powerUpTimer = 0;
        this.doubleJumpAvailable = false;
      }
    }

    // Horizontal movement
    const left  = input.isDown('ArrowLeft')  || input.isDown('KeyA');
    const right = input.isDown('ArrowRight') || input.isDown('KeyD');
    if (left)  { this.vx = -MOVE_SPEED; this.facing = -1; }
    else if (right) { this.vx = MOVE_SPEED;  this.facing = 1; }
    else             this.vx = 0;

    // Double jump
    if (!this.onGround && this.activePowerUp === 'doubleJump' && this.doubleJumpAvailable) {
      const jumped = input.wasJustPressed('ArrowUp') || input.wasJustPressed('Space') || input.wasJustPressed('KeyW');
      if (jumped) {
        this.vy = DOUBLE_JUMP_F;
        this.doubleJumpAvailable = false;
        spawnParticles([], this.cx(), this.wy + this.h, '#00ffff', 0); // no particles arr here; handled in World
        this._doubleJumpEffect = true;
      }
    }

    // Gravity & integration
    this.vy += GRAVITY * dt;
    if (this.vy > TERMINAL_VEL) this.vy = TERMINAL_VEL;
    this.wx += this.vx * dt;
    this.wy += this.vy * dt;

    // Screen wrap
    if (this.wx + this.w < 0) this.wx = CANVAS_W;
    if (this.wx > CANVAS_W)   this.wx = -this.w;

    this.onGround = false;
  }

  bounce(jumpForce) {
    this.vy = jumpForce;
    this.onGround = true;
    // Reset double jump on landing
    if (this.activePowerUp === 'doubleJump') this.doubleJumpAvailable = true;
    if (this.superJumpReady) {
      this.vy = SUPER_JUMP;
      this.superJumpReady = false;
      this.activePowerUp = null;
      this.powerUpTimer = 0;
    }
  }

  die() {
    if (this.isInvincible()) return false;
    this.dead = true;
    this.deathTimer = 1.5;
    this.vy = -600;
    return true;
  }

  render(r, camY) {
    const sy = this.wy - camY;

    if (this.dead) {
      r.ctx.save();
      r.ctx.translate(this.wx + this.w / 2, sy + this.h / 2);
      r.ctx.rotate(this.frameCount * 0.2);
      if (penguinCanvas) {
        r.ctx.drawImage(penguinCanvas, -this.w / 2, -this.h / 2, this.w, this.h);
      }
      r.ctx.restore();
      return;
    }

    // Invincibility blink
    if (this.isInvincible() && Math.floor(this.frameCount / 5) % 2 === 0) return;

    if (penguinCanvas) {
      r.ctx.save();
      if (this.facing < 0) {
        // Mirror horizontally
        r.ctx.translate(this.wx + this.w, sy);
        r.ctx.scale(-1, 1);
        r.ctx.drawImage(penguinCanvas, 0, 0, this.w, this.h);
      } else {
        r.ctx.drawImage(penguinCanvas, this.wx, sy, this.w, this.h);
      }
      r.ctx.restore();
    }

    // Super jump trail
    if (this.superJumpReady) {
      r.ctx.globalAlpha = 0.5;
      for (let i = 1; i <= 3; i++) {
        r.rect(this.wx + rand(-3, 3), sy + this.h + i * 4, 4, 4, '#ff00ff');
      }
      r.ctx.globalAlpha = 1;
    }

    // Double jump wing hint
    if (this.activePowerUp === 'doubleJump' && !this.onGround) {
      r.rect(this.wx - 6, sy + 18, 6, 10, '#00ffff');
      r.rect(this.wx + this.w, sy + 18, 6, 10, '#00ffff');
    }

    // Magnet ring
    if (this.activePowerUp === 'magnet') {
      r.ctx.globalAlpha = 0.25 + 0.15 * Math.sin(this.frameCount * 0.15);
      r.ctx.strokeStyle = '#00ff88';
      r.ctx.lineWidth = 2;
      r.ctx.beginPath();
      r.ctx.arc(this.wx + this.w / 2, sy + this.h / 2, MAGNET_RADIUS, 0, Math.PI * 2);
      r.ctx.stroke();
      r.ctx.globalAlpha = 1;
    }
  }
}

// ── Stars (background) ────────────────────────────────────────
const STARS = [];
for (let i = 0; i < 200; i++) {
  STARS.push({ x: rand(0, CANVAS_W), y: rand(0, 12000), size: Math.random() < 0.7 ? 1 : 2 });
}

// ── World ─────────────────────────────────────────────────────
class World {
  constructor() {
    this.platforms   = [];
    this.orbs        = [];
    this.coins       = [];
    this.particles   = [];
    this.generatedUpTo = 0;
    this.difficulty  = new DifficultyManager();
    this.lastDeadlyCount = 0;
    this._init();
  }

  _init() {
    // First platform — penguin spawns on this
    this.platforms.push(new Platform(CANVAS_W / 2 - 55, CANVAS_H - 180, 110, 'static'));
    this.generatedUpTo = CANVAS_H - 180;
    // 10 guaranteed safe platforms as tutorial zone (no deadly, no moving)
    for (let i = 0; i < 10; i++) {
      const y = this.generatedUpTo - rand(65, 95);
      const x = rand(PLATFORM_MARGIN, CANVAS_W - 100 - PLATFORM_MARGIN);
      this.platforms.push(new Platform(x, y, 100, 'static'));
      this.generatedUpTo = y;
    }
  }

  reset() {
    this.platforms   = [];
    this.orbs        = [];
    this.coins       = [];
    this.particles   = [];
    this.generatedUpTo = 0;
    this.lastDeadlyCount = 0;
    this._init();
  }

  _generate(cameraY, heightM) {
    const params = this.difficulty.getParams(heightM);
    while (this.generatedUpTo > cameraY - CANVAS_H * 1.5) {
      const gapY = rand(params.minGapY, params.maxGapY);
      const y    = this.generatedUpTo - gapY;
      const w    = rand(params.platformMinW, params.platformMaxW);
      const x    = rand(PLATFORM_MARGIN, CANVAS_W - w - PLATFORM_MARGIN);

      // Pick type
      let type;
      const r = Math.random();
      // Safety: force static if last 3 were deadly
      if (this.lastDeadlyCount >= 3) {
        type = 'static';
        this.lastDeadlyCount = 0;
      } else if (r < params.deadlyChance) {
        type = 'deadly';
        this.lastDeadlyCount++;
      } else if (r < params.deadlyChance + params.movingChance) {
        type = 'moving';
        this.lastDeadlyCount = 0;
      } else {
        type = 'static';
        this.lastDeadlyCount = 0;
      }

      const moveSpeed = type === 'moving' ? (Math.random() < 0.5 ? 1 : -1) * params.movingSpeed : 0;
      const plat = new Platform(x, y, w, type, moveSpeed);
      this.platforms.push(plat);

      // Coins
      if (type !== 'deadly' && Math.random() < params.coinChance) {
        const count = randInt(1, 4);
        for (let i = 0; i < count; i++) {
          this.coins.push(new Coin(x + w / 2 - (count * 16) / 2 + i * 16, y - 24));
        }
      }

      // Power-up orb (only on safe platforms)
      if (type !== 'deadly' && Math.random() < params.powerUpChance) {
        const orbType = ORB_TYPES[randInt(0, ORB_TYPES.length - 1)];
        this.orbs.push(new PowerUpOrb(x + w / 2 - 8, y - 26, orbType));
      }

      this.generatedUpTo = y;
    }
  }

  _cull(cameraY) {
    const cutoff = cameraY + CANVAS_H + 200;
    this.platforms = this.platforms.filter(p => p.y < cutoff && p.alive);
    this.orbs      = this.orbs.filter(o => o.wy < cutoff && o.alive);
    this.coins     = this.coins.filter(c => c.wy < cutoff && c.alive);
    this.particles = this.particles.filter(p => p.life > 0);
  }

  _checkCollisions(penguin) {
    if (penguin.dead) return 0;

    const pb = penguin.bounds();
    const prevFeetY = pb.y + pb.h - penguin.vy * (1 / 60);
    const currFeetY = pb.y + pb.h;
    const pcx = penguin.cx();
    const pcy = penguin.cy();

    for (const plat of this.platforms) {
      const pl = plat.bounds();
      const overlapX = pb.x < pl.x + pl.w && pb.x + pb.w > pl.x;

      if (plat.type === 'deadly') {
        // Full AABB
        const overlapY = pb.y < pl.y + pl.h && pb.y + pb.h > pl.y;
        if (overlapX && overlapY) {
          const died = penguin.die();
          if (died) {
            spawnParticles(this.particles, pcx, pcy, '#ff4466', 12);
            spawnParticles(this.particles, pcx, pcy, '#ff9900', 8);
          }
        }
      } else {
        // Top-surface only, falling down
        if (overlapX && penguin.vy > 0 && prevFeetY <= pl.y && currFeetY >= pl.y) {
          penguin.wy = pl.y - penguin.h - 2;
          const jumpForce = penguin.superJumpReady ? SUPER_JUMP : JUMP_FORCE;
          penguin.bounce(jumpForce);
          spawnParticles(this.particles, pcx, pb.y + pb.h, '#4ecca3', 5);
        }
      }
    }

    // Orbs
    for (const orb of this.orbs) {
      if (!orb.alive) continue;
      const ob = orb.bounds();
      if (pb.x < ob.x + ob.w && pb.x + pb.w > ob.x &&
          pb.y < ob.y + ob.h && pb.y + pb.h > ob.y) {
        orb.alive = false;
        penguin.collectPowerUp(orb.type);
        spawnParticles(this.particles, pcx, pcy, ORB_COLORS[orb.type], 10);
      }
    }

    // Coins
    for (const coin of this.coins) {
      if (!coin.alive) continue;
      const d = dist(pcx, pcy, coin.wx + coin.w / 2, coin.wy + coin.h / 2);
      if (d < 20) {
        coin.alive = false;
        spawnParticles(this.particles, coin.wx, coin.wy, '#ffe066', 5);
        return 1; // collected 1 coin
      }
    }
    return 0;
  }

  update(dt, penguin, cameraY, heightM) {
    this._generate(cameraY, heightM);
    for (const p of this.platforms) p.update(dt);
    const hasMagnet = penguin.activePowerUp === 'magnet';
    for (const c of this.coins) c.update(dt, penguin.cx(), penguin.cy(), hasMagnet);
    for (const o of this.orbs) o.update(performance.now() / 1000);
    for (const p of this.particles) p.update(dt);
    const coinScore = this._checkCollisions(penguin);
    this._cull(cameraY);
    return coinScore;
  }

  render(r, cameraY) {
    // coins
    for (const c of this.coins) if (c.wy - cameraY < CANVAS_H + 20 && c.wy - cameraY > -20) c.render(r, cameraY);
    // orbs
    for (const o of this.orbs)  if (o.wy - cameraY < CANVAS_H + 20 && o.wy - cameraY > -20) o.render(r, cameraY);
    // platforms
    for (const p of this.platforms) {
      const sy = p.y - cameraY;
      if (sy > -30 && sy < CANVAS_H + 30) p.render(r, cameraY);
    }
    // particles
    for (const p of this.particles) p.render(r, cameraY);
  }
}

// ── HUD ───────────────────────────────────────────────────────
class HUD {
  render(r, heightM, score, highScore, activePowerUp, powerUpTimer) {
    // Score
    r.text(`${Math.floor(heightM)}m`, 12, 12, 18, '#f0f0f0');
    r.text(`HI: ${Math.floor(highScore)}m`, 12, 34, 14, '#aaaacc');
    r.text(`Monedas: ${score}`, 12, 54, 14, '#ffe066');

    // Power-up indicator
    if (activePowerUp) {
      const colors = ORB_COLORS;
      const c = colors[activePowerUp] || '#fff';
      const label = {
        invincibility: 'INVENCIBLE',
        doubleJump:    'DOBLE SALTO',
        superJump:     'SUPER SALTO',
        magnet:        'IMAN',
      }[activePowerUp];

      r.rect(CANVAS_W - 130, 8, 120, 28, 'rgba(0,0,0,0.5)');
      r.text(label, CANVAS_W - 70, 12, 13, c, 'center');

      if (activePowerUp !== 'superJump') {
        // timer bar
        const maxTime = { invincibility: 8, doubleJump: 12, magnet: 10 }[activePowerUp] || 1;
        const pct = Math.max(0, powerUpTimer / maxTime);
        r.rect(CANVAS_W - 128, 30, 116, 5, '#333');
        r.rect(CANVAS_W - 128, 30, Math.round(116 * pct), 5, c);
      } else {
        r.text('LISTO!', CANVAS_W - 70, 30, 12, c, 'center');
      }
    }
  }
}

// ── Background ────────────────────────────────────────────────
function renderBackground(r, cameraY) {
  // Stars (parallax 0.1)
  for (const s of STARS) {
    const sy = ((s.y - cameraY * 0.1) % (CANVAS_H * 2) + CANVAS_H * 2) % (CANVAS_H * 2);
    if (sy >= 0 && sy <= CANVAS_H) {
      r.rect(s.x, sy, s.size, s.size, 'rgba(255,255,255,0.8)');
    }
  }
  // Distant city strips (parallax 0.3)
  const buildingColors = ['#1a2040', '#1e2848', '#222e50'];
  for (let i = 0; i < 8; i++) {
    const bx   = (i * 70 + 10);
    const bh   = 40 + (i * 37) % 60;
    const rawY = 800 + i * 200;
    const sy   = ((rawY - cameraY * 0.3) % (CANVAS_H * 3) + CANVAS_H * 3) % (CANVAS_H * 3) - bh;
    if (sy < CANVAS_H && sy > -bh) {
      r.rect(bx, sy, 40, bh, buildingColors[i % 3]);
      // windows
      for (let wy2 = sy + 5; wy2 < sy + bh - 5; wy2 += 12) {
        for (let wx2 = bx + 5; wx2 < bx + 35; wx2 += 12) {
          if (Math.random() < 0.4) r.rect(wx2, wy2, 6, 7, '#ffe08060');
        }
      }
    }
  }
}

// ── ScreenManager ─────────────────────────────────────────────
class ScreenManager {
  constructor() { this.state = 'start'; }
  goTo(s) { this.state = s; }
}

// ── Game ──────────────────────────────────────────────────────
class Game {
  constructor() {
    this.canvas   = document.getElementById('gameCanvas');
    this.ctx      = this.canvas.getContext('2d');
    this.r        = new Renderer(this.ctx);
    this.input    = new InputHandler();
    this.camera   = new Camera();
    this.penguin  = new Penguin();
    this.world    = new World();
    this.hud      = new HUD();
    this.screens  = new ScreenManager();
    this.score    = 0;  // coins
    this.highScore = 0;
    this.heightHigh = 0;
    this.lastTime = 0;
    this.deathPending = false;
    this._loadHigh();
  }

  _loadHigh() {
    try {
      this.heightHigh = parseFloat(localStorage.getItem('pjHighHeight') || '0');
    } catch(e) {}
  }
  _saveHigh() {
    try {
      localStorage.setItem('pjHighHeight', String(this.heightHigh));
    } catch(e) {}
  }

  _resetGame() {
    this.camera.reset();
    this.penguin.reset();
    this.world.reset();
    this.score = 0;
    this.deathPending = false;
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(this._loop.bind(this));
  }

  _loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 1 / 30);
    this.lastTime = timestamp;
    this._update(dt);
    this._render();
    requestAnimationFrame(this._loop.bind(this));
  }

  _update(dt) {
    const { state } = this.screens;

    if (state === 'start') {
      if (this.input.wasJustPressed('Enter') || this.input.wasJustPressed('Space')) {
        this._resetGame();
        this.screens.goTo('playing');
      }
      return;
    }

    if (state === 'gameOver') {
      if (this.input.wasJustPressed('Enter') || this.input.wasJustPressed('Space')) {
        this.screens.goTo('start');
      }
      return;
    }

    // PLAYING
    this.penguin.update(dt, this.input);
    this.camera.update(this.penguin.wy);

    const heightM = this.camera.getHeightM();
    const coinsGot = this.world.update(dt, this.penguin, this.camera.y, heightM);
    this.score += coinsGot;

    if (heightM > this.heightHigh) {
      this.heightHigh = heightM;
      this._saveHigh();
    }

    // Death by falling
    if (!this.penguin.dead && this.penguin.wy - this.camera.y > CANVAS_H + 100) {
      this.penguin.dead = true;
      this.penguin.deathTimer = 1.0;
      spawnParticles(this.world.particles, this.penguin.cx(), this.penguin.cy(), '#f0f0f0', 14);
    }

    // Transition to game over
    if (this.penguin.dead && this.penguin.deathTimer <= 0) {
      this.screens.goTo('gameOver');
    }
  }

  _render() {
    const r = this.r;
    r.clear('#0a0a1a');
    renderBackground(r, this.camera.y);

    if (this.screens.state === 'start') {
      this._renderStart();
      return;
    }

    this.world.render(r, this.camera.y);
    this.penguin.render(r, this.camera.y);

    if (this.screens.state === 'playing') {
      this.hud.render(r,
        this.camera.getHeightM(),
        this.score,
        this.heightHigh,
        this.penguin.activePowerUp,
        this.penguin.powerUpTimer
      );
    }

    if (this.screens.state === 'gameOver') {
      this._renderGameOver();
    }
  }

  _renderStart() {
    const r = this.r;
    // Title
    r.ctx.fillStyle = 'rgba(0,0,0,0.4)';
    r.ctx.fillRect(60, 80, CANVAS_W - 120, 100);
    r.bigText('PENGUIN', CANVAS_W / 2, 115, 5, '#f0f0f0');
    r.bigText('JUMP!', CANVAS_W / 2, 155, 5, '#4ecca3');

    // Demo penguin
    const t = performance.now() / 1000;
    const demoY = 300 + Math.sin(t * 3) * 20;
    if (penguinCanvas) r.ctx.drawImage(penguinCanvas, CANVAS_W / 2 - 24, demoY, 48, 54);

    // Platform under demo
    r.rect(CANVAS_W / 2 - 50, 330, 100, PLATFORM_H, '#4ecca3');
    r.rect(CANVAS_W / 2 - 50, 330, 100, 3, '#2d9a78');

    // Instructions
    r.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    r.ctx.fillRect(40, 380, CANVAS_W - 80, 220);
    r.text('Controles:', CANVAS_W / 2, 395, 16, '#f0f0f0', 'center');
    r.text('← → / A D  =  Mover', CANVAS_W / 2, 420, 14, '#aaaacc', 'center');
    r.text('ESPACIO / ↑  =  Doble salto (power-up)', CANVAS_W / 2, 442, 12, '#aaaacc', 'center');

    r.text('Power-ups:', CANVAS_W / 2, 472, 16, '#f0f0f0', 'center');
    r.sprite(ORB_INVINC, CANVAS_W / 2 - 100, 490, 2); r.text('Invencible 8s', CANVAS_W / 2 - 78, 493, 12, '#ffd700');
    r.sprite(ORB_DBJUMP, CANVAS_W / 2 + 20,  490, 2); r.text('Doble salto', CANVAS_W / 2 + 42, 493, 12, '#00ffff');
    r.sprite(ORB_SJUMP,  CANVAS_W / 2 - 100, 516, 2); r.text('Super salto', CANVAS_W / 2 - 78, 519, 12, '#ff00ff');
    r.sprite(ORB_MAGNET, CANVAS_W / 2 + 20,  516, 2); r.text('Iman monedas', CANVAS_W / 2 + 42, 519, 12, '#00ff88');

    // Blink "press enter"
    if (Math.floor(performance.now() / 500) % 2 === 0) {
      r.text('ENTER / ESPACIO para jugar', CANVAS_W / 2, 572, 15, '#ffe066', 'center');
    }

    r.text(`Record: ${Math.floor(this.heightHigh)}m`, CANVAS_W / 2, 610, 14, '#aaaacc', 'center');
  }

  _renderGameOver() {
    const r = this.r;
    r.ctx.fillStyle = 'rgba(0,0,0,0.65)';
    r.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    r.bigText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 80, 4, '#ff4466');
    r.text(`Altura: ${Math.floor(this.camera.getHeightM())}m`, CANVAS_W / 2, CANVAS_H / 2 - 20, 20, '#f0f0f0', 'center');
    r.text(`Monedas: ${this.score}`, CANVAS_W / 2, CANVAS_H / 2 + 12, 18, '#ffe066', 'center');
    r.text(`Record: ${Math.floor(this.heightHigh)}m`, CANVAS_W / 2, CANVAS_H / 2 + 42, 16, '#aaaacc', 'center');

    if (Math.floor(performance.now() / 500) % 2 === 0) {
      r.text('ENTER / ESPACIO para continuar', CANVAS_W / 2, CANVAS_H / 2 + 90, 14, '#ffe066', 'center');
    }
  }
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadPenguinSprite(() => {
    new Game().start();
  });
});
