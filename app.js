import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  PX_PER_UV_HI, PX_PER_UV_LO, SHIRT_WINDOW, M_PER_UV, COLOURS, DAMASK, ASSETS, TIER_COLOURS, TIERS,
  SLOTS, RAGLAN, JERSEYS, BODY, SHORTS_DECALS, PARTNERS, STATS, STAT_PLACEHOLDERS, CONTACT, MODEL_CREDIT,
} from './kit.js';

const $ = (id) => document.getElementById(id);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const thb = (n) => 'THB ' + n.toLocaleString('en-US');
const tierName = (id) => TIERS.find((t) => t.id === id).name;

const loadImg = (src) => new Promise((res, rej) => {
  const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image ' + src)); i.src = src;
});

// ---------- page content that comes from kit.js ----------
const statusLabel = { taken: 'Partner', open: 'Available' };
const priceText = (s) => (s.price == null ? '' : thb(s.price) + ' ' + (s.priceNote || 'per spot'));

function buildPage(onPick) {
  $('slot-table').innerHTML = SLOTS.map((s, i) => `
    <button class="row" data-id="${s.id}">
      <span class="lab"><i class="num">${i + 1}</i>${s.label}</span>
      <span class="who">${s.sponsor || 'Available'}</span>
      <span class="tier">${s.tier ? `<i class="tdot" style="background:${TIER_COLOURS[s.tier]}"></i>${tierName(s.tier)}` : '—'}</span>
      <span class="pr">${s.price == null ? '—' : thb(s.price)}</span>
    </button>`).join('');
  $('slot-table').addEventListener('click', (e) => {
    const b = e.target.closest('.row'); if (!b) return;
    $('stage').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    onPick(b.dataset.id);
  });
  $('partner-list').innerHTML = PARTNERS.map((p) =>
    `<div class="partner"><img src="${p.logo}" alt="${p.name}"><span>${p.name}<br>${p.slot}</span></div>`).join('');
  $('tier-list').innerHTML = TIERS.map((t) => `
    <article class="tier-card" style="--tier:${TIER_COLOURS[t.id]}">
      <h3>${t.name}</h3>
      <p class="tp">${thb(t.price)} <small>per spot</small></p>
      <ul>${t.perks.map((x) => `<li>${x}</li>`).join('')}</ul>
    </article>`).join('');
  $('stat-list').innerHTML = STATS.map((s) => `<div class="stat"><b>${s.value}</b><span>${s.label}</span></div>`).join('') +
    STAT_PLACEHOLDERS.map((l) => `<div class="stat"><span class="ph">Placeholder</span><b>—</b><span>${l}</span></div>`).join('');
  $('contact-row').innerHTML = `
    <div><b>${CONTACT.name}</b><span lang="th">${CONTACT.thai}</span></div>
    <div><b>Email</b><a href="mailto:${CONTACT.email}">${CONTACT.email}</a></div>
    <div><b>Phone</b><a href="tel:${CONTACT.phone.replace(/-/g, '')}">${CONTACT.phone}</a></div>`;
  const c = MODEL_CREDIT;
  $('credit').innerHTML = `3D kit model: <a href="${c.modelUrl}" rel="noopener">${c.title}</a> by <a href="${c.authorUrl}" rel="noopener">${c.author}</a>, licensed <a href="${c.licenceUrl}" rel="noopener">${c.licence}</a>. Adapted: simplified and re-textured.`;
}

// ---------- renderer / scene ----------
const host = $('three');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
host.appendChild(renderer.domElement);
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
// big textures only where the device can carry them: a fine pointer on a large screen, 4096+ textures, not a low-memory device
const HI_RES = !new URLSearchParams(location.search).has('lo') &&   // ?lo=1 forces the phone-size texture, for testing
  renderer.capabilities.maxTextureSize >= 4096 && matchMedia('(pointer: fine)').matches &&
  Math.max(screen.width, screen.height) >= 1100 && (navigator.deviceMemory || 8) >= 4;
const PX_PER_UV = HI_RES ? PX_PER_UV_HI : PX_PER_UV_LO;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const key = new THREE.DirectionalLight(0xfff1e4, 1.75); key.position.set(1.9, 2.4, 3.0);   // low, raking from the wearer's left so the folds throw soft shade
const fill = new THREE.DirectionalLight(0xffeef0, 0.9); fill.position.set(-2.2, 1.0, 3.0); scene.add(fill); scene.add(key);
const rim = new THREE.DirectionalLight(0xdfe8ff, 1.1); rim.position.set(-2.4, 1.6, -2.6); scene.add(rim);

const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 30);
const FOCUS = new THREE.Vector3(0, 1.18, 0);
const KIT_H = 1.24;              // framed height in metres (collar top to shorts hem plus air)
// ---------- view: whole-kit framing, zoom, vertical pan (the camera slides up and down, it never tilts or orbits) ----------
const V = { z: 1, y: FOCUS.y, x: 0, zT: 1, yT: FOCUS.y, xT: 0, dist: 3, visH0: 1.3, zMax: 4 };
const KIT_Y0 = 0.65, KIT_Y1 = 1.71;
function clampView() {
  V.zT = THREE.MathUtils.clamp(V.zT, 1, V.zMax);
  const half = V.visH0 / (2 * V.zT), lo = KIT_Y0 + half, hi = KIT_Y1 - half;
  V.yT = lo > hi ? FOCUS.y : THREE.MathUtils.clamp(V.yT, lo, hi);
  const xl = 0.3 * (1 - 1 / V.zT);                 // sideways slide only to centre a logo; none at the whole-kit framing
  V.xT = THREE.MathUtils.clamp(V.xT, -xl, xl);
}
function syncTouch() { renderer.domElement.style.touchAction = V.zT > 1.02 ? 'none' : 'pan-y'; }   // zoomed in: one finger pans the kit; whole kit: vertical swipes scroll the page
function setView(z, y, x = 0, instant) {
  V.zT = z; V.yT = y; V.xT = x; clampView();
  if (instant || reduceMotion) { V.z = V.zT; V.y = V.yT; V.x = V.xT; }
  syncTouch();
}
function zoomBy(f, py = 0.5, px = 0.5) {
  // keep the point of the kit under the pointer (px, py = 0..1 across the stage) where it is
  const before = V.zT, wy = V.yT + (0.5 - py) * V.visH0 / before, wx = V.xT + (px - 0.5) * V.visH0 * camera.aspect / before;
  V.zT = THREE.MathUtils.clamp(before * f, 1, V.zMax);
  V.yT = wy - (0.5 - py) * V.visH0 / V.zT;
  V.xT = wx - (px - 0.5) * V.visH0 * camera.aspect / V.zT;
  clampView(); syncTouch();
  if (reduceMotion) { V.z = V.zT; V.y = V.yT; V.x = V.xT; }
}
function applyView() {
  camera.zoom = V.z; camera.position.set(V.x, V.y, V.dist); camera.lookAt(V.x, V.y, 0); camera.updateProjectionMatrix();
}
function resize(w = host.clientWidth, h = host.clientHeight) {
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  V.dist = Math.max((KIT_H / 2) / t, (0.62 / 2) / (t * camera.aspect));   // fit height, and fit the sleeves on narrow screens
  V.visH0 = 2 * V.dist * t;
  // never zoom past what the painted texture can resolve (canvas pixels per metre vs screen pixels per metre at the whole-kit framing)
  const texPxPerM = PX_PER_UV / M_PER_UV, screenPxPerM = (h / V.visH0) * Math.min(devicePixelRatio, 2);
  V.zMax = THREE.MathUtils.clamp((texPxPerM / screenPxPerM) * 1.15, 1.8, 5.5);
  clampView(); applyView();
}
addEventListener('resize', () => resize());      // (resize takes optional w, h for __kit.shot: never pass it the event)

// ---------- procedural fabric normal map (knit / mesh dimples) ----------
function knitNormalMap() {
  const N = 128, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'), img = c.createImageData(N, N);
  const hgt = (x, y) => {
    const p = 16, a = Math.sin((x / p) * Math.PI * 2), b = Math.sin((y / p) * Math.PI * 2);
    const brick = Math.sin(((x + (Math.floor(y / p) % 2) * p / 2) / p) * Math.PI * 2);
    return 0.55 * a * b + 0.45 * brick * Math.cos((y / p) * Math.PI);
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = hgt((x + 1) % N, y) - hgt((x - 1 + N) % N, y), dy = hgt(x, (y + 1) % N) - hgt(x, (y - 1 + N) % N);
    const n = new THREE.Vector3(-dx * 0.9, -dy * 0.9, 1).normalize(), o = (y * N + x) * 4;
    img.data[o] = (n.x * 0.5 + 0.5) * 255; img.data[o + 1] = (n.y * 0.5 + 0.5) * 255; img.data[o + 2] = (n.z * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 36);
  t.anisotropy = MAX_ANISO;
  return t;
}

// ---------- kit texture painting ----------
// quiet dashed outline, drawn only for the spot the visitor selects
function drawPlaceholder(ctx, w, h, tier) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h * 0.14); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = Math.max(3, h * 0.04);
  ctx.setLineDash([h * 0.14, h * 0.1]); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const f = Math.min(h * 0.2, w * 0.1);
  ctx.font = `600 ${f}px Inter, sans-serif`;
  ctx.fillText('YOUR LOGO HERE', 0, -f * 0.1);
  ctx.globalAlpha = 0.75; ctx.font = `500 ${f * 0.78}px Inter, sans-serif`;
  ctx.fillText(tier.toUpperCase(), 0, f * 1.15);
  ctx.restore();
}

function fitText(ctx, text, w, font, weight = 700) {
  let size = 100; ctx.font = `${weight} ${size}px ${font}`;
  size *= w / ctx.measureText(text).width; ctx.font = `${weight} ${size}px ${font}`;
  return size;
}

function paintSlot(ctx, s, imgs, k, X, Y) {
  const w = s.w * k, h = (s.h || s.w * 0.3) * k;
  ctx.save();
  ctx.translate(X(s.uv[0]), Y(s.uv[1]));
  if (s.m) ctx.transform(...s.m);   // affine pre-correction (a, b, c, d, e, f): the shoulder yoke's UV is turned ~12 deg and sheared on the 3D model; this is the inverse of the mesh's UV->screen map there, so the logo stands upright (see MAP.md Draft 8)
  if (s.kind === 'logo') {
    const im = imgs[s.logo], r = im.width / im.height;
    let dw = w, dh = w / r; if (s.h && dh > h) { dh = h; dw = h * r; }
    ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
  } else if (s.kind === 'text') {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitText(ctx, s.text, w, 'Inter, sans-serif', 600); ctx.fillText(s.text, 0, 0);
  } else if (s.kind === 'name') {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sz = fitText(ctx, s.text, w, 'Cinzel, serif'); ctx.fillText(s.text, 0, -w * 0.46);
    ctx.font = `700 ${w * 0.78}px Cinzel, serif`; ctx.fillText(s.number, 0, w * 0.2);
  }
  ctx.restore();
}

// centripetal Catmull-Rom through the anchor points -> dense polyline (smooth, no overshoot on uneven spacing)
function smooth(pts, n = 16) {
  const n0 = pts.length, ext = (a, b) => [2 * a[0] - b[0], 2 * a[1] - b[1]];      // mirrored end points, so the end segments are not degenerate
  const P = [ext(pts[0], pts[1]), ...pts, ext(pts[n0 - 1], pts[n0 - 2])], out = [];
  const t = (a, b) => Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1]));
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const t0 = 0, t1 = t0 + t(p0, p1), t2 = t1 + t(p1, p2), t3 = t2 + t(p2, p3);
    for (let k = 0; k < n; k++) {
      const x = t1 + ((t2 - t1) * k) / n, q = [0, 1].map((d) => {
        const A1 = ((t1 - x) * p0[d] + (x - t0) * p1[d]) / (t1 - t0), A2 = ((t2 - x) * p1[d] + (x - t1) * p2[d]) / (t2 - t1), A3 = ((t3 - x) * p2[d] + (x - t2) * p3[d]) / (t3 - t2);
        const B1 = ((t2 - x) * A1 + (x - t0) * A2) / (t2 - t0), B2 = ((t3 - x) * A2 + (x - t1) * A3) / (t3 - t1);
        return ((t2 - x) * B1 + (x - t1) * B2) / (t2 - t1);
      });
      out.push(q);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Draft 10: at the finer repeat the tile's own row/column brightness drift (a few dark horizontal and vertical bands per tile, ~12 % darker, mirror axes) shows as
// a plaid grid across the shirt. Normalise every row and every column of the tile to the tile's mean brightness (a gain, so the motif keeps its contrast and the
// base red keeps its hue), and trim the dark 6 px line along the tile edge first (the tile is mirror-symmetric, so the trimmed tile stays seamless).
function flattenTile(full, trim = 18) {
  const w = full.width - 2 * trim, h = full.height - 2 * trim, c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(full, -trim, -trim);
  const D = x.getImageData(0, 0, w, h), d = D.data, lum = (i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
  const rm = new Float64Array(h), cm = new Float64Array(w); let m = 0;
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const l = lum((y * w + xx) * 4); rm[y] += l / w; cm[xx] += l / h; m += l / (w * h); }
  const sm = (a, r) => a.map((_, i) => { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const j = (i + k + a.length) % a.length; s += a[j]; n++; } return s / n; });
  const rs = sm(rm, 40), cs = sm(cm, 40);                       // the wide trend only: keep the motif's own row-to-row structure
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const i = (y * w + xx) * 4, g = (m / rs[y]) * (m / cs[xx]); for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * g); }
  x.putImageData(D, 0, 0);
  return c;
}

// damask: one continuous pattern across the whole UV sheet, scaled to a real-world repeat size, so pieces never stretch
function paintDamask(ctx, imgs, k, w, h) {
  const pat = ctx.createPattern(imgs.damask, 'repeat');
  const s = ((DAMASK.tileCm / 100 / M_PER_UV) * k) / imgs.damask.width;
  pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = COLOURS.tone; ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

// the damask as a neutral grey tile (mean 128), used to carry the fabric texture into the blue so it is printed into the cloth like the maroon
function greyDamask(imgs) {
  if (imgs.damaskGrey) return imgs.damaskGrey;
  const c = document.createElement('canvas'); c.width = imgs.damask.width; c.height = imgs.damask.height;
  const x = c.getContext('2d'); x.drawImage(imgs.damask, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), px = d.data; let sum = 0;
  for (let i = 0; i < px.length; i += 4) { px[i] = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; sum += px[i]; }
  const gain = 128 / (sum / (px.length / 4));
  for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = Math.min(255, px[i] * gain);
  x.putImageData(d, 0, 0);
  return (imgs.damaskGrey = c);
}
// solid blue with the damask relief laid over it (soft-light), so it matches everywhere it is used
function paintBlue(ctx, imgs, k, x, y, w, h, colour = COLOURS.blue, clipPath) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (clipPath) { clipPath(); ctx.clip(); }
  ctx.fillStyle = colour; ctx.fillRect(x, y, w, h);
  const pat = ctx.createPattern(greyDamask(imgs), 'repeat'), s = ((DAMASK.tileCm / 100 / M_PER_UV) * k) / imgs.damask.width;
  pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
  ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = colour === COLOURS.blue ? 0.85 : 0.4; ctx.fillStyle = pat; ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function buildCollarTexture(imgs, J) {
  const COLLAR = J.collar;
  const W = COLLAR.window, du = W.u1 - W.u0, dv = W.v1 - W.v0, k = PX_PER_UV;
  const cv = document.createElement('canvas'); cv.width = Math.round(du * k); cv.height = Math.round(dv * k);
  const ctx = cv.getContext('2d');
  paintDamask(ctx, imgs, k, cv.width, cv.height);
  for (const [v0, v1] of COLLAR.strips) paintBlue(ctx, imgs, k, 0, (W.v1 - (v1 - (v1 - v0) * COLLAR.band[0])) * k, cv.width, (v1 - v0) * (COLLAR.band[1] - COLLAR.band[0]) * k, COLLAR.bandColour);
  if (COLLAR.rim) for (const [v0, v1] of COLLAR.strips) {   // Jersey 2: thin darker maroon rim next to the blue band
    ctx.fillStyle = COLLAR.rim.colour;
    ctx.fillRect(0, (W.v1 - (v1 - (v1 - v0) * COLLAR.rim.range[0])) * k, cv.width, (v1 - v0) * (COLLAR.rim.range[1] - COLLAR.rim.range[0]) * k);
  }
  if (COLLAR.stripe) {                                      // Jersey 1: the centre stripe runs on across the front of the collar
    const [s0, s1] = COLLAR.strips[COLLAR.stripe.strip];
    paintBlue(ctx, imgs, k, (COLLAR.stripe.u0 - W.u0) * k, (W.v1 - s1) * k, (COLLAR.stripe.u1 - COLLAR.stripe.u0) * k, (s1 - s0) * k);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = MAX_ANISO;
  tex.repeat.set(1 / du, 1 / dv); tex.offset.set(-W.u0 / du, -W.v0 / dv);
  return tex;
}

const slotsFor = (J) => SLOTS.map((s) => ({ ...s, ...(J.slots[s.id] || {}) }));   // Jersey 2 moves some UV rects; ids, tiers and prices are shared
let curSlots = SLOTS;
let showSponsors = true;                       // Draft 11: the Sponsors toggle; off = the kit is painted without the taken-sponsor logos (club marks stay)

function buildShirtTexture(imgs, trim, J) {
  const STRIPE = J.stripe, slots = slotsFor(J);
  const W = SHIRT_WINDOW, du = W.u1 - W.u0, dv = W.v1 - W.v0, k = PX_PER_UV, sc = k / 2800;
  const cv = document.createElement('canvas'); cv.width = Math.round(du * k); cv.height = Math.round(dv * k);
  const ctx = cv.getContext('2d');
  const X = (u) => (u - W.u0) * k, Y = (v) => (W.v1 - v) * k;

  paintDamask(ctx, imgs, k, cv.width, cv.height);

  const path = (pts) => { ctx.beginPath(); pts.forEach(([u, v], i) => (i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v)))); };
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // centre stripe: collar to hem, fading out behind the big front logo. A trapezoid between two reference heights (vA, vB), extended up to vTop.
  const st = { uA: STRIPE.u, wA: STRIPE.w, vA: STRIPE.vTop, uB: STRIPE.u, wB: STRIPE.w, vB: STRIPE.vBottom, min: 0, ...STRIPE };
  const lerpV = (f, v) => { const t = (v - st.vA) / (st.vB - st.vA); return st[f + 'A'] + (st[f + 'B'] - st[f + 'A']) * t; };
  const sa = (v) => Math.max(st.min, STRIPE.alpha * Math.max(smoothstep(STRIPE.clear0, STRIPE.solidAbove, v), smoothstep(STRIPE.clear1, STRIPE.solidBelow, v)));
  const uL = Math.min(lerpV('u', STRIPE.vTop) - lerpV('w', STRIPE.vTop) / 2, lerpV('u', STRIPE.vBottom) - lerpV('w', STRIPE.vBottom) / 2);
  const uR = Math.max(lerpV('u', STRIPE.vTop) + lerpV('w', STRIPE.vTop) / 2, lerpV('u', STRIPE.vBottom) + lerpV('w', STRIPE.vBottom) / 2);
  const sw = Math.round((uR - uL) * k), sh = Math.round((STRIPE.vTop - STRIPE.vBottom) * k), so = document.createElement('canvas');
  so.width = sw; so.height = sh;
  const sx = so.getContext('2d');
  const trap = () => { sx.beginPath();
    const top = STRIPE.vTop, bot = STRIPE.vBottom;
    sx.moveTo((lerpV('u', top) - lerpV('w', top) / 2 - uL) * k, 0); sx.lineTo((lerpV('u', top) + lerpV('w', top) / 2 - uL) * k, 0);
    sx.lineTo((lerpV('u', bot) + lerpV('w', bot) / 2 - uL) * k, sh); sx.lineTo((lerpV('u', bot) - lerpV('w', bot) / 2 - uL) * k, sh); sx.closePath(); };
  if (STRIPE.pins) {                                                // Jersey 2: a dark wash with n thin black pinstripes, maroon showing between them
    sx.fillStyle = STRIPE.wash; sx.fillRect(0, 0, sw, sh);
    const per = sw / STRIPE.pins.n, pw = per * STRIPE.pins.fill;
    for (let i = 0; i < STRIPE.pins.n; i++) paintBlue(sx, imgs, k, i * per + (per - pw) / 2, 0, pw, sh, STRIPE.colour);
  } else paintBlue(sx, imgs, k, 0, 0, sw, sh, STRIPE.colour, trap);
  const g = sx.createLinearGradient(0, 0, 0, sh);                   // alpha mask: solid, fading out behind the logo, slowly back in
  for (let i = 0; i <= 160; i++) { const f = i / 160; g.addColorStop(f, `rgba(0,0,0,${sa(STRIPE.vTop + (STRIPE.vBottom - STRIPE.vTop) * f).toFixed(4)})`); }
  sx.globalCompositeOperation = 'destination-in'; sx.fillStyle = g; sx.fillRect(0, 0, sw, sh);
  // composite in linear light: a plain sRGB alpha blend of maroon into blue passes through a dark, muddy purple; blending light gives a clean gradient
  const bx = Math.round(X(uL)), by = Math.round(Y(STRIPE.vTop)), base = ctx.getImageData(bx, by, sw, sh), top = sx.getImageData(0, 0, sw, sh);
  const lin = new Float32Array(256).map((_, i) => Math.pow(i / 255, 2.2));
  for (let i = 0; i < base.data.length; i += 4) {
    const al = top.data[i + 3] / 255; if (al === 0) continue;
    for (let c = 0; c < 3; c++) base.data[i + c] = 255 * Math.pow((1 - al) * lin[base.data[i + c]] + al * lin[top.data[i + c]], 1 / 2.2);
  }
  ctx.putImageData(base, bx, by);

  // raglan piping and mesh side panels, front and back, left and right (mirrored about each panel's centre line)
  const mirror = (c) => (pts) => pts.map(([u, v]) => [2 * c - u, v]);
  const panels = [];
  if (J.panels) for (const r of RAGLAN) {
    const line = smooth(r.line), top = line.findIndex(([, v]) => v <= r.apex), end = line.findIndex(([, v]) => v <= r.tip);
    // taper: quadratic curve from the end of the inner line back out to the side seam; the control point is level with the seam end, so the curve leaves the line vertically and meets the seam horizontally: front and back tapers join into one smooth curve round the side
    const E = line[end], S = r.seam, C = [(E[0] + S[0]) / 2, (E[1] + S[1]) / 2], taper = [];   // straight diagonal: the black ends in a point on the side seam (front and back diagonals meet there)
    
    for (let t = 1; t <= 12; t++) { const q = t / 12; taper.push([0, 1].map((d) => (1 - q) ** 2 * E[d] + 2 * (1 - q) * q * C[d] + q * q * S[d])); }
    const far = r.seam[0] - 0.04, head = []; for (let t = 0; t <= 10; t++) { const q = t / 10, A = [r.seam[0], r.apex - 0.10], H = line[top], Cc = [H[0], A[1] + 0.02]; head.push([0, 1].map((d) => (1 - q) ** 2 * A[d] + 2 * (1 - q) * q * Cc[d] + q * q * H[d])); }   // pointed top: curve from the side seam into the line
    const poly = [[far, r.apex - 0.10], ...head, ...line.slice(top + 1, end + 1), ...taper, [far, r.seam[1]]];   // `far` = well outside the side seam, clipped by the geometry
    for (const m of [(p) => p, mirror(r.centre)]) panels.push({ poly: m(poly), line: m(line), diag: m([E, ...taper]), head: m(head), y0: Y(r.apex), y1: Y(r.seam[1]) });
  }
  const MS = J.mesh;                                         // Jersey 2: solid black with a very subtle tone shift; no `grid` = no pattern. Jersey 3: `noFill`, the panel area stays damask
  const paintMesh = (y0, y1) => {
    const step = (MS ? MS.step : 4.8) * sc;
    let fill = COLOURS.mesh, grid = 'rgba(190,190,200,0.24)';
    if (MS) {
      fill = ctx.createLinearGradient(0, y0, 0, y1); fill.addColorStop(0, MS.top); fill.addColorStop(1, MS.bottom);
      if (MS.grid) { grid = ctx.createLinearGradient(0, y0, 0, y1); grid.addColorStop(0, `rgba(235,235,240,${MS.grid[0]})`); grid.addColorStop(1, `rgba(235,235,240,${MS.grid[1]})`); }
    }
    ctx.fillStyle = fill; ctx.fillRect(0, 0, cv.width, cv.height);
    if (MS && !MS.grid) return;
    ctx.strokeStyle = grid; ctx.lineWidth = (MS ? MS.line : 1.0) * sc; ctx.beginPath();
    for (let x = 0; x < cv.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); }
    for (let y = 0; y < cv.height; y += step) { ctx.moveTo(0, y); ctx.lineTo(cv.width, y); }
    ctx.stroke();
  };
  for (const p of panels) {
    if (!J.noFill) { ctx.save(); path(p.poly); ctx.closePath(); ctx.clip(); paintMesh(p.y0, p.y1); ctx.restore(); }
    ctx.strokeStyle = COLOURS.piping; ctx.lineWidth = (J.pipe || 14) * sc; path(p.line); ctx.stroke(); path(p.diag); ctx.stroke(); path(p.head); ctx.stroke();
  }

  // sleeve cuffs (Jersey 2 only): two thin stripes above the hem; Jersey 1 cuffs are plain shirt cloth
  const cf = J.cuffs;
  if (cf.colour) for (const sl of trim.sleeves) for (let i = 0; i < (cf.n || 2); i++) paintBlue(ctx, imgs, k, X(sl.u0 - 0.01), Y(sl.hem + cf.y0 + cf.h + i * (cf.h + (cf.gap || 0))), (sl.u1 - sl.u0 + 0.02) * k, cf.h * k, cf.colour);

  for (const m of J.marks) paintSlot(ctx, m, imgs, k, X, Y);
  if (showSponsors) for (const sl of slots) if (sl.status === 'taken') paintSlot(ctx, sl, imgs, k, X, Y);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = MAX_ANISO;
  tex.repeat.set(1 / du, 1 / dv); tex.offset.set(-W.u0 / du, -W.v0 / dv);   // crop the UV tile to the window painted above
  // placeholders live on a separate, lighter overlay canvas (same UV window) that the shader blends in, so selecting a spot
  // re-uploads 16 MB instead of the whole kit texture
  const ko = 2048 / dv, ov = document.createElement('canvas'); ov.width = Math.round(du * ko); ov.height = Math.round(dv * ko);
  const octx = ov.getContext('2d'), overlay = new THREE.CanvasTexture(ov);
  overlay.colorSpace = THREE.SRGBColorSpace; overlay.anisotropy = MAX_ANISO;
  const select = (slot) => {
    octx.clearRect(0, 0, ov.width, ov.height);
    if (slot && slot.status === 'open') {
      octx.save(); octx.translate((slot.uv[0] - W.u0) * ko, (W.v1 - slot.uv[1]) * ko);
      drawPlaceholder(octx, slot.w * ko, slot.h * ko, slot.tier); octx.restore();
    }
    overlay.needsUpdate = true;
  };
  tex.userData.canvas = cv;
  const dispose = () => { tex.dispose(); overlay.dispose(); cv.width = cv.height = ov.width = ov.height = 1; };   // frees the 4096 px canvas before the next kit is painted
  return { tex, overlay, select, dispose };
}

function buildShortsTexture(imgs) {
  const S = HI_RES ? 3072 : 1536, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = COLOURS.shorts; ctx.fillRect(0, 0, S, S);
  const X = (u) => u * S, Y = (v) => (1 - v) * S;
  for (const d of SHORTS_DECALS) {
    ctx.save(); ctx.translate(X(d.uv[0]), Y(d.uv[1]));
    if (d.kind === 'text') {
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 ${d.size * S}px Cinzel, serif`; ctx.fillText(d.text, 0, 0);
    } else {
      const im = imgs[d.logo], w = d.w * S; ctx.drawImage(im, -w / 2, -w * im.height / im.width / 2, w, w * im.height / im.width);
    }
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(ctx.canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = MAX_ANISO;
  return tex;
}

// ---------- fabric sway: vertex-shader displacement, no cloth sim ----------
// The garment's loose parts lag behind the spin and settle with a damped spring (state lives in JS: `lag`, one scalar).
const swayU = { uLag: { value: 0 } };
function addSway(mat, top, bottom, sleeveX, strength, overlay) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uLag = swayU.uLag;
    sh.uniforms.uSway = { value: new THREE.Vector4(top, bottom, sleeveX, strength) };
    sh.uniforms.uAxis = { value: axis };
    if (overlay) sh.uniforms.uOver = overlay;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLag; uniform vec4 uSway; uniform vec2 uAxis; varying float vOutSgn; varying vec3 vRadV; varying float vMid;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float swH = clamp((uSway.x - position.y) / (uSway.x - uSway.y), 0.0, 1.0);        // 0 at the shoulder, 1 at the hem
        float swS = smoothstep(uSway.z, uSway.z + 0.09, abs(position.x - uAxis.x));        // sleeves: distance from the body
        float swW = clamp(pow(swH, 1.5) + swS * 0.8, 0.0, 1.0) * uSway.w;
        vec2 swR = position.xz - uAxis;
        transformed.xz += -uLag * swW * vec2(swR.y, -swR.x);                                // trail behind the spin
        transformed.xz += normalize(swR + 1e-5) * abs(uLag) * 0.18 * swW;                   // and flare a touch outward
        // is the stored normal pointing away from the body axis? (the source mixes inward and outward shells)
        vec2 swN = normalize(normal.xz + 1e-5); float swRad = dot(swN, normalize(swR + 1e-5)) * length(normal.xz);
        vOutSgn = abs(swRad) > 0.4 ? sign(swRad) : 0.0;
        vRadV = normalize(normalMatrix * vec3(swR.x, 0.0, swR.y)); vMid = abs(swR.x) < 0.09 ? 1.0 : 0.0;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vOutSgn; varying vec3 vRadV; varying float vMid;' + (overlay ? '\nuniform sampler2D uOver;' : ''))
      .replace('#include <map_fragment>', `#include <map_fragment>
        ${overlay ? 'vec4 ovl = texture2D(uOver, vMapUv); diffuseColor.rgb = mix(diffuseColor.rgb, ovl.rgb, ovl.a);' : ''}
        // the inside of the garment (seen through the neck and hem) is plain, dark lining, not the printed outside
        float swIn = vOutSgn * (gl_FrontFacing ? 1.0 : -1.0);
        // the stored normals are unreliable near the neck: in the middle of the torso also treat anything on the far side of the body axis from the camera as inside (not the sleeves)
        if (vMid > 0.5 && dot(normalize(vRadV), normalize(vViewPosition)) < -0.15) swIn = -1.0;
        if (swIn < 0.0) diffuseColor.rgb = vec3(0.02);   // plain dark lining: no printed pattern shows through`);
  };
  mat.customProgramCacheKey = () => (overlay ? 'sway-ov' : 'sway-v1');
}
const axis = new THREE.Vector2();

// ---------- athletic torso: smooth vertex deformation of the shirt (UVs untouched) ----------
// Radial push from the body axis, front-weighted: chest (two pec lobes) forward, abdomen sunk, slight waist taper (see BODY in kit.js).
function torsoField(P, x, y, z, out) {
  const dx = x - axis.x, dz = z - axis.y, r = Math.hypot(dx, dz);
  if (r < 1e-4) { out[0] = x; out[1] = y; out[2] = z; return; }
  const ex = dx / r, ez = dz / r, ax = Math.abs(dx), wf = Math.max(0, ez) ** 2, g = (c, s) => Math.exp(-0.5 * ((y - c) / s) ** 2);
  const plate = smoothstep(P.chestLo, P.chestHi, y) * (1 - smoothstep(P.chestTop, P.chestEnd, y)) * (1 - smoothstep(P.chestW0, P.chestW1, ax));   // broad flat chest plate
  const fl = smoothstep(P.floorY, P.floorY + P.floorW, y);                                       // no change at the hem (the waistband sits right under it)
  const dr = fl * (wf * (P.chest * plate + P.belly * (1 - smoothstep(0.14, 0.19, ax)) * g(P.bellyY, P.bellyS))
           + ex * ex * P.waist * (1 - smoothstep(0.19, 0.24, ax)) * g(P.waistY, P.waistS));
  out[0] = x + dr * ex; out[1] = y; out[2] = z + dr * ez;
}
// Re-shape a mesh from its saved original (P = null restores it). Positions move by the field; the stored normals (whose in/out orientation the
// lining shader relies on) are carried through the field's Jacobian (cofactor matrix), so they stay consistent and keep their sign.
function reshapeTorso(mesh, P) {
  const g = mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal;
  if (!g.userData.p0) {                              // the normals are an interleaved, normalised Int8 attribute: read and write them through the attribute API
    g.userData.p0 = pos.array.slice(); g.userData.n0 = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { g.userData.n0[3 * i] = nor.getX(i); g.userData.n0[3 * i + 1] = nor.getY(i); g.userData.n0[3 * i + 2] = nor.getZ(i); }
  }
  const p0 = g.userData.p0, n0 = g.userData.n0, h = 1e-3, a = [0, 0, 0], b = [0, 0, 0], c = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < pos.count; i++) {
    const x = p0[3 * i], y = p0[3 * i + 1], z = p0[3 * i + 2];
    if (!P) { pos.array.set(p0.subarray(3 * i, 3 * i + 3), 3 * i); nor.setXYZ(i, n0[3 * i], n0[3 * i + 1], n0[3 * i + 2]); continue; }
    torsoField(P, x, y, z, a); pos.array[3 * i] = a[0]; pos.array[3 * i + 1] = a[1]; pos.array[3 * i + 2] = a[2];
    for (let k = 0; k < 3; k++) {                    // column k of the Jacobian = d(field)/d(x, y, z)[k]
      const q = [x, y, z], r = [x, y, z]; q[k] += h; r[k] -= h;
      torsoField(P, q[0], q[1], q[2], a); torsoField(P, r[0], r[1], r[2], b);
      for (let m = 0; m < 3; m++) c[m][k] = (a[m] - b[m]) / (2 * h);
    }
    const [[j00, j01, j02], [j10, j11, j12], [j20, j21, j22]] = c, nx = n0[3 * i], ny = n0[3 * i + 1], nz = n0[3 * i + 2];
    const cx = (j11 * j22 - j12 * j21) * nx - (j10 * j22 - j12 * j20) * ny + (j10 * j21 - j11 * j20) * nz;   // cofactor(J) . n  (= det * J^-T n)
    const cy = -(j01 * j22 - j02 * j21) * nx + (j00 * j22 - j02 * j20) * ny - (j00 * j21 - j01 * j20) * nz;
    const cz = (j01 * j12 - j02 * j11) * nx - (j00 * j12 - j02 * j10) * ny + (j00 * j11 - j01 * j10) * nz;
    const l = Math.hypot(cx, cy, cz) || 1; nor.setXYZ(i, cx / l, cy / l, cz / l);
  }
  pos.needsUpdate = true; (nor.data || nor).needsUpdate = true; g.computeBoundingBox(); g.computeBoundingSphere();
}

// ---------- model ----------
const spin = new THREE.Group(), kit = new THREE.Group();
spin.add(kit); scene.add(spin);

function uvToSurface(meshes, u, v) {
  // find the triangle containing (u,v); return its point and outward normal in spin space
  for (const mesh of meshes) {
    const geo = mesh.geometry, uv = geo.attributes.uv, pos = geo.attributes.position, nor = geo.attributes.normal, idx = geo.index;
    for (let t = 0; t < idx.count; t += 3) {
      const i = [idx.getX(t), idx.getX(t + 1), idx.getX(t + 2)];
      const [x1, y1, x2, y2, x3, y3] = [uv.getX(i[0]), uv.getY(i[0]), uv.getX(i[1]), uv.getY(i[1]), uv.getX(i[2]), uv.getY(i[2])];
      if (u < Math.min(x1, x2, x3) || u > Math.max(x1, x2, x3) || v < Math.min(y1, y2, y3) || v > Math.max(y1, y2, y3)) continue;
      const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3); if (Math.abs(d) < 1e-12) continue;
      const l1 = ((y2 - y3) * (u - x3) + (x3 - x2) * (v - y3)) / d;
      const l2 = ((y3 - y1) * (u - x3) + (x1 - x3) * (v - y3)) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const p = new THREE.Vector3(), n = new THREE.Vector3();
      [l1, l2, l3].forEach((l, q) => { p.x += l * pos.getX(i[q]); p.y += l * pos.getY(i[q]); p.z += l * pos.getZ(i[q]); n.x += l * nor.getX(i[q]); n.y += l * nor.getY(i[q]); n.z += l * nor.getZ(i[q]); });
      p.x -= axis.x; p.z -= axis.y;
      n.normalize();
      const core = new THREE.Vector3(0, p.y, 0);
      if (n.dot(p.clone().sub(core)) < 0) n.negate();   // the source normals point inward; markers need the outward side
      return { p, n };
    }
  }
  return null;
}

// ---------- hotspots + card ----------
const hotspots = [];
let activeId = null;
let setPlaceholder = () => {};

function addHotspot(slot, p, n, i) {
  const b = document.createElement('button');
  b.className = 'hs'; b.dataset.status = slot.status; b.dataset.id = slot.id;
  b.textContent = i + 1; b.setAttribute('aria-label', slot.label);
  b.addEventListener('click', () => openCard(slot.id));
  $('hotspots').appendChild(b);
  hotspots.push({ slot, p, n, az: 0, el: b });
}

// marker position in UV: logo spots (taken) put it just outside the right edge, level with the logo's middle, so it never covers lettering;
// open spots draw nothing until selected, so theirs stays on the bottom-right corner
const MARK_GAP = 0.04;
const markerUV = (s) => (s.markAt ? s.markAt : s.mark === 'below' ? [s.uv[0], s.uv[1] - (s.h || s.w * 0.3) / 2 - 0.03] : s.mark === 'above' ? [s.uv[0], s.uv[1] + (s.h || s.w * 0.3) / 2 + 0.02] : s.kind === 'logo' ? [s.uv[0] + s.w / 2 + MARK_GAP, s.uv[1]] : [s.uv[0] + s.w * 0.5, s.uv[1] - (s.h || s.w * 0.3) / 2]);

function openCard(id) {
  const s = curSlots.find((x) => x.id === id); if (!s) return;
  activeId = id;
  $('c-name').textContent = s.label;
  const st = $('c-status'); st.textContent = statusLabel[s.status]; st.className = 'badge ' + s.status;
  $('c-sponsor').textContent = s.sponsor || 'Available';
  $('c-pack').textContent = s.tier ? tierName(s.tier) + ' package' : 'Not stated';
  $('c-size').textContent = s.size;
  $('c-vis').textContent = s.visibility;
  $('c-price').textContent = priceText(s);
  $('c-price').hidden = $('c-price').previousElementSibling.hidden = s.price == null;      // a taken spot with no price given shows none
  $('card').hidden = false;
  hotspots.forEach((h) => h.el.classList.toggle('on', h.slot.id === id));
  setPlaceholder(s);
  const hs = hotspots.find((x) => x.slot.id === id);
  if (hs) {                                            // zoom to the selected spot: it turns to face us, so centre it sideways too
    const th = -hs.az;
    // shift from the marker back to the middle of the logo
    const [mu, mv] = markerUV(hs.slot);
    setView(Math.min(2.4, V.zMax), hs.p.y + (hs.slot.uv[1] - mv) * M_PER_UV,
      hs.p.x * Math.cos(th) + hs.p.z * Math.sin(th) - (mu - hs.slot.uv[0]) * M_PER_UV);
  }
  hideHint();
}
function closeCard() { activeId = null; $('card').hidden = true; hotspots.forEach((h) => h.el.classList.remove('on')); setPlaceholder(null); resetView(); }
$('card-x').addEventListener('click', closeCard);

function pickSlot(id) {
  const h = hotspots.find((x) => x.slot.id === id); if (!h) return;
  turnTo(h.az);
  openCard(id);
}

// ---------- spin: drag + inertia (horizontal only) ----------
const S = { rot: 0, omega: 0, drag: false, lastX: 0, lastT: 0, idleSince: 0, tween: null, lag: 0, lagV: 0 };
const IDLE_SPEED = reduceMotion ? 0 : 0.32;       // rad/s, slow showroom turn
const COAST = 2.1;                                 // 1/s: how fast a flick loses speed
const DRAG_GAIN = 2.6;                             // rad per stage width of finger travel
const surf = renderer.domElement;
surf.style.touchAction = 'pan-y';                  // vertical swipe scrolls the page; horizontal swipe spins
let vel = 0;                                       // finger-driven angular velocity, low-passed
const ptrs = new Map();                            // active pointers (for pinch)
let pinch = null, tapT = 0, tapX = 0, tapY = 0, downT = 0, downX = 0, downY = 0;
const wpp = () => V.visH0 / (V.z * host.clientHeight);   // metres of kit per screen pixel at the current zoom

surf.addEventListener('pointerdown', (e) => {
  if (e.button > 0) return;
  surf.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  hideHint(); S.tween = null;
  if (ptrs.size === 2) {                            // pinch: zoom + two-finger vertical pan, no spin
    S.drag = false; vel = 0;
    const [a, b] = [...ptrs.values()];
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: V.zT, y0: V.yT, my0: (a.y + b.y) / 2 };
    return;
  }
  S.drag = true; S.lastX = e.clientX; S.lastY = e.clientY; S.lastT = performance.now(); vel = 0;
  downT = S.lastT; downX = e.clientX; downY = e.clientY;
});
surf.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  p.x = e.clientX; p.y = e.clientY;
  if (pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), my = (a.y + b.y) / 2;
    V.zT = THREE.MathUtils.clamp(pinch.z0 * d / pinch.d0, 1, V.zMax);
    V.yT = pinch.y0 + (my - pinch.my0) * wpp();
    clampView(); syncTouch(); if (reduceMotion) { V.z = V.zT; V.y = V.yT; }
    return;
  }
  if (!S.drag) return;
  const now = performance.now(), dt = Math.max(1, now - S.lastT) / 1000;
  const dTheta = ((e.clientX - S.lastX) / host.clientWidth) * DRAG_GAIN * Math.PI / Math.pow(V.z, 0.7);   // horizontal travel spins
  S.rot += dTheta;
  vel += (dTheta / dt - vel) * 0.45;
  if (V.zT > 1.02) { V.yT += (e.clientY - S.lastY) * wpp(); clampView(); if (reduceMotion) V.y = V.yT; }   // vertical travel only slides the view, never tilts
  S.lastX = e.clientX; S.lastY = e.clientY; S.lastT = now;
});
const endDrag = (e) => {
  ptrs.delete(e.pointerId);
  if (pinch) { if (ptrs.size < 2) pinch = null; S.drag = false; return; }
  if (!S.drag) return; S.drag = false; S.idleSince = performance.now();
  const stale = performance.now() - S.lastT > 90;      // finger rested before lifting: no flick
  S.omega = reduceMotion || stale ? 0 : THREE.MathUtils.clamp(vel, -14, 14);
  // double tap / double click: back to the whole-kit framing
  const now = performance.now();
  if (e.type === 'pointerup' && now - downT < 300 && Math.hypot(e.clientX - downX, e.clientY - downY) < 8) {
    if (now - tapT < 350 && Math.hypot(e.clientX - tapX, e.clientY - tapY) < 24) { resetView(); tapT = 0; } else { tapT = now; tapX = e.clientX; tapY = e.clientY; }
  }
};
surf.addEventListener('pointerup', endDrag); surf.addEventListener('pointercancel', endDrag);
surf.addEventListener('wheel', (e) => {
  const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  if (dy > 0 && V.zT <= 1.001) return;             // fully out: let the page scroll
  e.preventDefault();
  const r = surf.getBoundingClientRect();
  zoomBy(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), (e.clientY - r.top) / r.height, (e.clientX - r.left) / r.width);   // ctrlKey = trackpad pinch
  hideHint();
}, { passive: false });
function resetView() { setView(1, FOCUS.y); }
$('z-in').addEventListener('click', () => zoomBy(1.5));
$('z-out').addEventListener('click', () => zoomBy(1 / 1.5));
$('z-reset').addEventListener('click', resetView);

function turnTo(az) {
  // az (radians) = which side faces the camera (0 front, pi/2 left, pi back, 3pi/2 right); the model turns the opposite way
  const target = -az;
  let d = target - S.rot; d = Math.atan2(Math.sin(d), Math.cos(d));   // shortest way round
  if (reduceMotion) { S.rot += d; S.omega = 0; return; }
  S.tween = { from: S.rot, d, t0: performance.now(), dur: 750, last: S.rot }; S.omega = 0; S.idleSince = performance.now();
}
document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => { turnTo(THREE.MathUtils.degToRad(+c.dataset.view)); hideHint(); }));
function hideHint() { $('hint').classList.add('gone'); }

const azimuth = () => -S.rot;
let shadowMesh = null, floatY = 0;           // idle float: the kit bobs a few mm and the contact shadow breathes with it

function step(dt, now) {
  if (S.tween) {
    const k = Math.min(1, (now - S.tween.t0) / S.tween.dur), e = 1 - Math.pow(1 - k, 3);
    const r = S.tween.from + S.tween.d * e;
    S.omega = (r - S.tween.last) / dt; S.tween.last = r; S.rot = r;
    if (k >= 1) { S.tween = null; S.omega = 0; }
  } else if (!S.drag) {
    const idle = activeId === null && now - S.idleSince > 4500;
    const target = idle ? IDLE_SPEED : 0;
    S.omega += (target - S.omega) * (1 - Math.exp(-(idle ? 0.9 : COAST) * dt));    // coast down with damping, ease into the idle turn
    S.rot += S.omega * dt;
  } else {
    S.omega = vel;
  }
  // damped spring: the loose fabric chases the spin speed, overshoots a hair, settles
  const target = reduceMotion ? 0 : THREE.MathUtils.clamp(S.omega, -12, 12) * 0.0155;
  const K = 75, C = 2 * 0.5 * Math.sqrt(K);
  S.lagV += (K * (target - S.lag) - C * S.lagV) * dt;
  S.lag += S.lagV * dt;
  swayU.uLag.value = S.lag;
  spin.rotation.y = S.rot;
  floatY = reduceMotion ? 0 : 0.005 * Math.sin(now / 1000 * (Math.PI * 2 / 6));   // 5 mm, 6 s period
  spin.position.y = floatY;
  if (shadowMesh) { shadowMesh.scale.setScalar(1 - floatY * 14); shadowMesh.material.opacity = 1 - floatY * 40; }
  const kv = 1 - Math.exp(-14 * dt);                // ease the view towards its target
  V.z += (V.zT - V.z) * kv; V.y += (V.yT - V.y) * kv; V.x += (V.xT - V.x) * kv;
  if (Math.abs(V.zT - V.z) < 1e-4) V.z = V.zT;
  if (Math.abs(V.yT - V.y) < 1e-5) V.y = V.yT;
  if (Math.abs(V.xT - V.x) < 1e-5) V.x = V.xT;
  applyView();
}

// ---------- boot ----------
async function boot() {
  buildPage(pickSlot);
  await Promise.all([document.fonts.load('700 100px Cinzel'), document.fonts.load('600 40px Inter')]).catch(() => {});
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const [gltf, damask, trim, ...logos] = await Promise.all([
    loader.loadAsync('assets/kit.glb'),
    loadImg(DAMASK.src),
    fetch('assets/trim.json').then((r) => r.json()),
    ...Object.values(ASSETS).map(loadImg),
  ]);
  const imgs = { damask: flattenTile(damask) }; Object.keys(ASSETS).forEach((k, i) => { imgs[k] = logos[i]; });

  const meshes = {};
  gltf.scene.traverse((o) => { if (o.isMesh) meshes[o.name || o.geometry.name] = o; });
  const byName = (n) => meshes[n];
  const need = ['shirt_back', 'shirt_front', 'collar', 'shorts', 'shorts_lining', 'waistband'];
  const M = {}; need.forEach((n) => { M[n] = byName(n); if (!M[n]) throw new Error('mesh missing: ' + n); });

  // rotate about the body's vertical axis
  const bb = new THREE.Box3().setFromObject(M.shirt_back).union(new THREE.Box3().setFromObject(M.shirt_front));
  axis.set(0, (bb.min.z + bb.max.z) / 2);
  const body = (P) => { reshapeTorso(M.shirt_front, P); reshapeTorso(M.shirt_back, P); };
  body(BODY);                                      // Draft 9 athletic torso; __kit.body(null) restores the original shirt, __kit.body({...BODY, ...}) tunes it
  kit.position.set(-axis.x, 0, -axis.y);
  const yTop = 1.6, yHem = bb.min.y;              // shoulder line and hem of the shirt
  const shortsBox = new THREE.Box3().setFromObject(M.shorts);

  const fabric = { roughness: 0.82, metalness: 0, sheen: 0.45, sheenRoughness: 0.6, sheenColor: new THREE.Color(COLOURS.sheen), envMapIntensity: 0.62, side: THREE.DoubleSide };
  const nrm = knitNormalMap();
  const overU = { value: null };                    // the placeholder overlay texture, swapped when the jersey changes
  const shirtMat = new THREE.MeshPhysicalMaterial({ ...fabric, normalMap: nrm, normalScale: new THREE.Vector2(0.16, 0.16) });
  addSway(shirtMat, yTop, yHem, 0.17, 1.0, overU);
  const shortsMat = new THREE.MeshPhysicalMaterial({ ...fabric, roughness: 0.9, sheenColor: new THREE.Color('#5a5a62'), sheen: 0.7, map: buildShortsTexture(imgs), normalMap: nrm, normalScale: new THREE.Vector2(0.16, 0.16) });
  addSway(shortsMat, shortsBox.max.y, shortsBox.min.y, 9, 0.85);
  const liningMat = new THREE.MeshPhysicalMaterial({ ...fabric, color: new THREE.Color('#101010'), roughness: 0.95, sheen: 0 });
  addSway(liningMat, shortsBox.max.y, shortsBox.min.y, 9, 0.85);
  const capMat = new THREE.MeshPhysicalMaterial({ ...fabric, color: 0xffffff, vertexColors: true, roughness: 0.95, sheen: 0, side: THREE.FrontSide });
  addSway(capMat, yTop, yHem, 0.17, 1.0);
  const collarMat = new THREE.MeshPhysicalMaterial({ ...fabric, normalMap: nrm, normalScale: new THREE.Vector2(0.16, 0.16), roughness: 0.85 });   // maroon with a blue band, on its own sheet (the collar UVs overlap the shirt panels)

  M.shirt_back.material = M.shirt_front.material = shirtMat;
  M.shorts.material = shortsMat; M.shorts_lining.material = M.waistband.material = liningMat; M.collar.material = collarMat;
  Object.values(M).forEach((m) => { m.frustumCulled = false; kit.add(m); });

  // sleeve openings: the perforated sleeve shell shows ragged holes and the printed inner wall through the cuff. Plug each sleeve with a dark
  // tube (an ellipse fitted to the cuff, a little narrower than the printed wall, 9 cm deep, closed at the top) so the inside reads as plain dark cloth.
  for (const side of [1, -1]) {
    const p = M.shirt_front.geometry.attributes.position;
    let yMin = 9; for (let i = 0; i < p.count; i++) if (side * p.getX(i) > 0.17 && p.getY(i) > 1.3) yMin = Math.min(yMin, p.getY(i));
    // ring 0 = the cuff ellipse at the hem (fitted to the hem vertices), ring 1 = the same ellipse 9 cm up, slightly narrower; the lining is a closed tube
    const bb = new THREE.Box3();
    for (let i = 0; i < p.count; i++) if (side * p.getX(i) > 0.17 && p.getY(i) > 1.3 && p.getY(i) < yMin + 0.03) bb.expandByPoint(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)));
    const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, rx = (bb.max.x - bb.min.x) / 2, rz = (bb.max.z - bb.min.z) / 2;
    // the cuff plane is tilted (the sleeve hangs at an angle): fit y = y0 + bx*(x-cx) + bz*(z-cz) to the lowest hem vertices so the rim sits ON the hem, not below it
    const lows = new Array(16).fill(null);                 // lowest vertex in each angular bin = the hem edge itself
    for (let i = 0; i < p.count; i++) if (side * p.getX(i) > 0.17 && p.getY(i) > 1.3 && p.getY(i) < yMin + 0.05) {
      const b = Math.min(15, Math.floor(((Math.atan2(p.getZ(i) - cz, p.getX(i) - cx) + Math.PI) / (2 * Math.PI)) * 16));
      if (!lows[b] || p.getY(i) < lows[b][1]) lows[b] = [p.getX(i) - cx, p.getY(i), p.getZ(i) - cz];
    }
    const L = lows.filter(Boolean), m = (k) => L.reduce((s, q) => s + q[k], 0) / L.length, mx = m(0), my = m(1), mz = m(2);
    let sxx = 0, szz = 0, sxz = 0, sxy = 0, szy = 0;
    for (const q of L) { const dx = q[0] - mx, dz = q[2] - mz, dy = q[1] - my; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; sxy += dx * dy; szy += dz * dy; }
    const det = sxx * szz - sxz * sxz, bx = det ? (sxy * szz - szy * sxz) / det : 0, bz = det ? (szy * sxx - sxy * sxz) / det : 0, y0 = my - bx * mx - bz * mz, cnt = L.length;
    const N = 48, pos = [], idx = [], up = 0.09;
    for (let r = 0; r < 2; r++) for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2, k = 0.97 - 0.1 * r, dx = Math.cos(t) * rx * k, dz = Math.sin(t) * rz * k;
      pos.push(cx - side * 0.03 * up * r + dx, y0 + bx * dx + bz * dz + 0.003 + up * r, cz + dz); }
    pos.push(cx - side * 0.03 * up, yMin + up, cz);
    const col = []; for (let i = 0; i < 2 * N + 1; i++) { const d = i < N ? 0 : 1; col.push(0.035 - 0.028 * d, 0.008 - 0.006 * d, 0.012 - 0.01 * d); }   // dark maroon at the rim, darker deeper in
    for (let i = 0; i < N; i++) { const j2 = (i + 1) % N; idx.push(i, j2, N + i, j2, N + j2, N + i, N + i, N + j2, 2 * N); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const plug = new THREE.Mesh(g, capMat); plug.frustumCulled = false; kit.add(plug);
  }

  // soft contact shadow under the kit (a blurred radial floor that does not spin)
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sg = sc.getContext('2d'), rg = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(30,18,16,0.34)'); rg.addColorStop(0.55, 'rgba(30,18,16,0.13)'); rg.addColorStop(1, 'rgba(30,18,16,0)');
  sg.fillStyle = rg; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, shortsBox.min.y - 0.1, 0); scene.add(shadow);

  shadowMesh = shadow;
  let shirtPaint = null;
  // paint one jersey: free the previous kit texture first (phones never hold two), repaint, swap the maps, rebuild the hotspots
  function paintJersey(J) {
    if (shirtPaint) shirtPaint.dispose();
    shirtPaint = buildShirtTexture(imgs, trim, J);
    shirtMat.map = shirtPaint.tex; overU.value = shirtPaint.overlay; shirtMat.needsUpdate = true;
    const ct = buildCollarTexture(imgs, J); if (collarMat.map) collarMat.map.dispose(); collarMat.map = ct; shirtMat.userData.collar = null; collarMat.needsUpdate = true;
    setPlaceholder = shirtPaint.select;
    curSlots = slotsFor(J);
    hotspots.length = 0; $('hotspots').textContent = '';
    curSlots.forEach((s, i) => {
      const front = s.uv[0] < 0.36 || s.id.startsWith('sleeve') ? [M.shirt_front, M.shirt_back] : [M.shirt_back, M.shirt_front];
      // marker position: see markerUV
      const hit = uvToSurface(front, ...markerUV(s)) || uvToSurface(front, s.uv[0], s.uv[1]);
      if (hit) addHotspot(s, hit.p.addScaledVector(hit.n, 0.008), hit.n, i); else console.warn('no surface at slot', s.id);
      // which way to turn the kit to face this spot: the front/back panels face 0 / pi exactly; sleeves use the surface at the slot centre
      const h = hotspots[hotspots.length - 1], c = uvToSurface(front, s.uv[0], s.uv[1]);
      if (c && !s.id.startsWith('sleeve')) h.n = new THREE.Vector3(c.p.x * 0.4, 0, c.p.z).normalize();   // body logos: visible while the front/back of the torso faces the camera (the marker may sit off the logo's edge, over a bend or the shoulder, where the surface normal turns away early)
      h.az = s.id.startsWith('sleeve') ? (c ? Math.atan2(c.n.x, c.n.z) : Math.atan2(h.n.x, h.n.z)) : (s.uv[0] < 0.36 ? 0 : Math.PI);
    });
    if (window.__kit) window.__kit.shirtTex = shirtMat.map;
  }
  const jerseyFromHash = () => { const m = /jersey-?([23])/i.exec(location.hash); return m ? +m[1] : 1; };
  let jersey = jerseyFromHash(), switching = false;
  const syncButtons = () => document.querySelectorAll('.jbtn').forEach((b) => { const on = +b.dataset.jersey === jersey; b.classList.toggle('active', on); b.setAttribute('aria-pressed', on); });
  async function switchJersey(id) {
    if (switching || id === jersey) return;
    switching = true; jersey = id; syncButtons();
    history.replaceState(null, '', id > 1 ? '#jersey-' + id : location.pathname + location.search);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const dom = renderer.domElement, hs = $('hotspots');
    if (!reduceMotion) { dom.style.transition = hs.style.transition = 'opacity .2s ease'; dom.style.opacity = hs.style.opacity = 0; await wait(220); }
    const keep = activeId;
    paintJersey(JERSEYS[id]);
    if (keep) openCard(keep); else setPlaceholder(null);
    if (!reduceMotion) {                             // a quick turn as the new kit fades in (horizontal only)
      S.tween = { from: S.rot, d: Math.PI * 2, t0: performance.now(), dur: 1100, last: S.rot }; S.omega = 0; S.idleSince = performance.now();
      dom.style.opacity = hs.style.opacity = 1;
    }
    switching = false;
  }
  document.querySelectorAll('.jbtn').forEach((b) => b.addEventListener('click', () => switchJersey(+b.dataset.jersey)));
  addEventListener('hashchange', () => switchJersey(jerseyFromHash()));
  // Draft 11: repaint the current kit in place (no fade, no camera change); an open card keeps its hotspot highlight and placeholder
  $('sponsor-tgl').addEventListener('click', (e) => {
    if (switching) return;
    showSponsors = !showSponsors; e.currentTarget.setAttribute('aria-pressed', showSponsors);
    paintJersey(JERSEYS[jersey]);
    hotspots.forEach((h) => h.el.classList.toggle('on', h.slot.id === activeId));
    setPlaceholder(curSlots.find((x) => x.id === activeId) || null);
  });
  paintJersey(JERSEYS[jersey]); syncButtons();

  resize();
  // verification hook: render the current view at w x h pixels (pixel ratio 1) and return it as a PNG data URL, whatever the window or zoom is
  function shot(w, h) {
    const pr = renderer.getPixelRatio(); renderer.setPixelRatio(1); resize(w, h); step(0.0001, performance.now()); frame();
    const url = renderer.domElement.toDataURL('image/png'); renderer.setPixelRatio(pr); resize(); return url;
  }
  $('loading').classList.add('gone');
  window.__kit = { M, S, V, azimuth, hotspots, swayU, camera, shirtTex: shirtMat.map, HI_RES, switchJersey, shot, body: (P) => { body(P); paintJersey(JERSEYS[jersey]); }, get jersey() { return jersey; }, get sponsors() { return showSponsors; }, get float() { return floatY; } };      // used by the Playwright checks
  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000)); last = now;
    step(dt, now);
    frame();
  });
}

const v3 = new THREE.Vector3(), nW = new THREE.Vector3(), camDir = new THREE.Vector3();
function frame() {
  const w = host.clientWidth, h = host.clientHeight;
  spin.updateMatrixWorld(true);
  renderer.render(scene, camera);
  for (const hs of hotspots) {
    v3.copy(hs.p).applyMatrix4(spin.matrixWorld);
    nW.copy(hs.n).transformDirection(spin.matrixWorld);
    camDir.copy(camera.position).sub(v3).normalize();
    hs.el.classList.toggle('off', nW.dot(camDir) < 0.2);
    v3.project(camera);
    hs.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * w}px, ${(-v3.y * 0.5 + 0.5) * h}px)`;
  }
  const a = ((THREE.MathUtils.radToDeg(azimuth()) % 360) + 360) % 360;
  document.querySelectorAll('.chip').forEach((c) => {
    const d = Math.abs(((a - +c.dataset.view + 540) % 360) - 180);
    c.classList.toggle('active', d < 20);
  });
}

boot().catch((e) => { console.error(e); $('loading').textContent = 'Could not load the 3D kit.'; });
