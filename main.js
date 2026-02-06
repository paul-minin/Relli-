// Simple top-down car driving demo
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = canvas.width = innerWidth;
let H = canvas.height = innerHeight;

// World
const world = { w: 2000, h: 1400 };

// Car
const car = {
  x: world.w/2,
  y: world.h/2,
  angle: 0, // radians
  vx: 0,
  vy: 0,
  maxSpeed: 6,
  accel: 0.18,
  brake: 0.35,
  friction: 0.03,
  turnSpeed: 0.035,
  width: 36,
  height: 22,
  radius: 18,
  drifting: false
};

// Controls (Pfeiltasten + WASD + Space für Drift)
const keys = {
  ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false,
  KeyW:false, KeyA:false, KeyS:false, KeyD:false,
  Space:false
};
addEventListener('keydown', e => { if (e.code in keys) { keys[e.code] = true; e.preventDefault(); }});
addEventListener('keyup', e => { if (e.code in keys) { keys[e.code] = false; e.preventDefault(); }});

// Obstacles
const obstacles = [];
function createObstacles(count = 20){
  for(let i=0;i<count;i++){
    const w = 40 + Math.random()*120;
    const h = 40 + Math.random()*120;
    let x = Math.random()*(world.w-w);
    let y = Math.random()*(world.h-h);
    // avoid spawning too close to start
    if (Math.hypot(x - car.x, y - car.y) < 250) { x += 300; y += 150; }
    obstacles.push({x,y,w,h});
  }
}
createObstacles();

// Walls (boundaries) exist at edges; we also draw a visible border.

function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
addEventListener('resize', resize);

function update(dt){
  // inputs
  const forward = keys.ArrowUp || keys.KeyW;
  const backward = keys.ArrowDown || keys.KeyS;
  const left = keys.ArrowLeft || keys.KeyA;
  const right = keys.ArrowRight || keys.KeyD;
  car.drifting = !!keys.Space;

  // acceleration / braking along heading
  if (forward){ car.vx += Math.cos(car.angle) * car.accel; car.vy += Math.sin(car.angle) * car.accel; }
  if (backward){ car.vx -= Math.cos(car.angle) * car.brake; car.vy -= Math.sin(car.angle) * car.brake; }

  // limit speed
  let speed = Math.hypot(car.vx, car.vy);
  if (speed > car.maxSpeed){ const s = car.maxSpeed / speed; car.vx *= s; car.vy *= s; speed = car.maxSpeed; }

  // turning scaled by forward speed projection
  const forwardSpeed = car.vx * Math.cos(car.angle) + car.vy * Math.sin(car.angle);
  const speedFactor = Math.max(0, Math.abs(forwardSpeed) / car.maxSpeed);
  let turn = car.turnSpeed * speedFactor;
  if (car.drifting) turn *= 1.8; // more responsive when drifting
  if (left) car.angle -= turn;
  if (right) car.angle += turn;

  // friction
  car.vx *= (1 - car.friction);
  car.vy *= (1 - car.friction);

  // traction: when not drifting, velocity aligns gradually to heading (less slide)
  const speedNow = Math.hypot(car.vx, car.vy);
  if (speedNow > 0.01){
    const desiredVx = Math.cos(car.angle) * speedNow;
    const desiredVy = Math.sin(car.angle) * speedNow;
    const alignFactor = car.drifting ? 0.02 : 0.12; // small when drifting -> slide
    car.vx += (desiredVx - car.vx) * alignFactor;
    car.vy += (desiredVy - car.vy) * alignFactor;
  }

  // move
  car.x += car.vx;
  car.y += car.vy;

  // collisions: walls
  if (car.x - car.radius < 0) { car.x = car.radius; car.vx *= -0.3; }
  if (car.y - car.radius < 0) { car.y = car.radius; car.vy *= -0.3; }
  if (car.x + car.radius > world.w) { car.x = world.w - car.radius; car.vx *= -0.3; }
  if (car.y + car.radius > world.h) { car.y = world.h - car.radius; car.vy *= -0.3; }

  // collisions: obstacles (circle-rect) - adjust velocity on impact
  for (const o of obstacles){
    const nearestX = clamp(car.x, o.x, o.x + o.w);
    const nearestY = clamp(car.y, o.y, o.y + o.h);
    const dx = car.x - nearestX;
    const dy = car.y - nearestY;
    const dist2 = dx*dx + dy*dy;
    if (dist2 < car.radius*car.radius){
      const dist = Math.sqrt(dist2) || 0.001;
      const overlap = car.radius - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      car.x += nx * overlap;
      car.y += ny * overlap;
      // reflect velocity along normal
      const velAlongNormal = car.vx * nx + car.vy * ny;
      if (velAlongNormal < 0){
        car.vx -= velAlongNormal * nx * 1.5;
        car.vy -= velAlongNormal * ny * 1.5;
      } else {
        car.vx *= -0.3;
        car.vy *= -0.3;
      }
    }
  }
} 

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

function draw(){
  // center camera on car
  ctx.save();
  ctx.clearRect(0,0,W,H);
  const camX = clamp(car.x - W/2, 0, world.w - W);
  const camY = clamp(car.y - H/2, 0, world.h - H);
  ctx.translate(-camX, -camY);

  // background grid
  drawGrid(camX, camY);

  // draw world border
  ctx.strokeStyle = '#222'; ctx.lineWidth = 6; ctx.strokeRect(0,0,world.w, world.h);

  // obstacles
  for (const o of obstacles){
    ctx.fillStyle = '#885'; ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeStyle = '#663'; ctx.lineWidth = 2; ctx.strokeRect(o.x, o.y, o.w, o.h);
  }

  // draw car (rotated rectangle)
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // body
  ctx.fillStyle = '#0b6'; ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
  // roof/stripe
  ctx.fillStyle = '#063'; ctx.fillRect(-car.width/4, -car.height/4, car.width/2, car.height/2);
  // front indicator
  ctx.fillStyle = '#ff3'; ctx.fillRect(car.width/2 - 6, -6, 6, 12);
  ctx.restore();

  ctx.restore();

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(10,10,190,48);
  ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
  const speedV = Math.hypot(car.vx, car.vy);
  ctx.fillText(`Speed: ${ speedV.toFixed(2) }`, 18, 32);
  ctx.fillText(`Pos: ${ Math.round(car.x) }, ${ Math.round(car.y) }`, 18, 48);

  // instructions
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(W-260, 10, 250, 70);
  ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
  ctx.fillText('Controls: Pfeiltasten / WASD', W-240, 32);
  ctx.fillText('Drift: Leertaste | Ziel: Fahre ohne Hindernisse', W-240, 52);
}

let last = performance.now();
function loop(now){
  const dt = (now - last) / 1000; last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// small helper: draw grid
function drawGrid(camX, camY){
  const size = 80;
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x=0; x<=world.w; x += size){ ctx.moveTo(x,0); ctx.lineTo(x, world.h); }
  for (let y=0; y<=world.h; y += size){ ctx.moveTo(0,y); ctx.lineTo(world.w, y); }
  ctx.stroke();
}

// friendly helper: center camera on start
// (already handled in draw via clamp)

// touch support: optional simple touch steering (not required for keyboard demo)
let touchState = null;
canvas.addEventListener('touchstart', function(e){
  // simple: accelerate on touch
  keys.ArrowUp = true;
}, {passive:true});
canvas.addEventListener('touchend', function(e){ keys.ArrowUp = false; }, {passive:true});

// allow restarting with R
addEventListener('keydown', e => { if (e.key === 'r' || e.key === 'R'){ reset(); }});
function reset(){ car.x = world.w/2; car.y = world.h/2; car.vx = 0; car.vy = 0; car.angle = 0; car.drifting = false; }
