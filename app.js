import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  PX_PER_UV_HI, PX_PER_UV_LO, SHIRT_WINDOW, M_PER_UV, COLOURS, DAMASK, ASSETS, TIER_COLOURS, TIERS,
  SLOTS, CLUB_MARKS, STRIPE, SHORTS_DECALS, PARTNERS, STATS, STAT_PLACEHOLDERS, CONTACT, MODEL_CREDIT,
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
const priceText = (s) => (s.price == null ? '' : thb(s.price) + ' per spot');

function buildPage(onPick) {
  $('slot-table').innerHTML = SLOTS.map((s) => `
    <button class="row" data-id="${s.id}">
      <span class="lab">${s.label}</span>
      <span class="who">${s.sponsor || 'Available'}</span>
      <span class="tier"><i class="tdot" style="background:${TIER_COLOURS[s.tier]}"></i>${tierName(s.tier)}</span>
      <span class="pr">${thb(s.price)}</span>
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

const key = new THREE.DirectionalLight(0xfff4ea, 1.5); key.position.set(1.6, 2.4, 3.2); scene.add(key);
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
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
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
addEventListener('resize', resize);

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
  if (s.kind === 'logo') {
    const im = imgs[s.logo], r = im.width / im.height;
    let dw = w, dh = w / r; if (s.h && dh > h) { dh = h; dw = h * r; }
    ctx.drawImage(im, -dw / 2, -dh / 2, dw, dh);
  } else if (s.kind === 'text') {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    fitText(ctx, s.text, w, 'Cinzel, serif'); ctx.fillText(s.text, 0, 0);
  } else if (s.kind === 'name') {
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const sz = fitText(ctx, s.text, w, 'Cinzel, serif'); ctx.fillText(s.text, 0, -w * 0.46);
    ctx.font = `700 ${w * 0.78}px Cinzel, serif`; ctx.fillText(s.number, 0, w * 0.2);
  }
  ctx.restore();
}

// side-panel shape in front-panel UV, left side (uS = where the side seam is); mirrored for the right side, offset for the back panel
const lensPts = (uS) => [[uS - 0.04, 0.752], [uS + 0.003, 0.752], [uS + 0.05, 0.716], [uS + 0.058, 0.665], [uS + 0.048, 0.615], [uS + 0.022, 0.568], [uS + 0.004, 0.545], [uS - 0.04, 0.545]];
const lensEdge = (uS) => [[uS + 0.002, 0.748], [uS + 0.05, 0.716], [uS + 0.058, 0.665], [uS + 0.048, 0.615], [uS + 0.022, 0.568], [uS + 0.004, 0.548]];

function buildShirtTexture(imgs, trim) {
  const W = SHIRT_WINDOW, du = W.u1 - W.u0, dv = W.v1 - W.v0, k = PX_PER_UV, sc = k / 2800;
  const cv = document.createElement('canvas'); cv.width = Math.round(du * k); cv.height = Math.round(dv * k);
  const ctx = cv.getContext('2d');
  const X = (u) => (u - W.u0) * k, Y = (v) => (W.v1 - v) * k;

  // damask: one continuous pattern across the whole UV sheet, scaled to a real-world repeat size, so pieces never stretch
  const pat = ctx.createPattern(imgs.damask, 'repeat');
  const s = ((DAMASK.tileCm / 100 / M_PER_UV) * k) / imgs.damask.width;
  pat.setTransform(new DOMMatrix([s, 0, 0, s, 0, 0]));
  ctx.fillStyle = pat; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = COLOURS.tone; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.globalCompositeOperation = 'source-over';

  const path = (pts) => { ctx.beginPath(); pts.forEach(([u, v], i) => (i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v)))); };
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // dark chest stripe from the collar, fading a little towards its foot
  const g = ctx.createLinearGradient(0, Y(STRIPE.vTop), 0, Y(STRIPE.vBottom));
  g.addColorStop(0, 'rgba(5,0,2,0.98)'); g.addColorStop(1, 'rgba(22,0,5,0.85)');
  ctx.fillStyle = g; ctx.fillRect(X(STRIPE.u0), Y(STRIPE.vTop), (STRIPE.u1 - STRIPE.u0) * k, (STRIPE.vTop - STRIPE.vBottom) * k);

  // mesh side panels under the arms, front and back: dark grey with a fine light grid, white piping on the inner edge
  const panels = [];
  for (const [off, vOff] of [[0, 0], [0.39, -0.025]]) {
    for (const mirror of [false, true]) {
      const place = (pts) => pts.map(([u, v]) => [mirror ? 2 * (0.17 + off) - (u + off) : u + off, v + vOff]);
      panels.push({ poly: place(lensPts(0.034)), edge: place(lensEdge(0.034)) });
    }
  }
  for (const p of panels) {
    ctx.save(); path(p.poly); ctx.closePath(); ctx.clip();
    ctx.fillStyle = COLOURS.mesh; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = 'rgba(215,215,222,0.62)'; ctx.lineWidth = 2.2 * sc; ctx.beginPath();
    const step = 12 * sc;
    for (let x = 0; x < cv.width; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, cv.height); }
    for (let y = 0; y < cv.height; y += step) { ctx.moveTo(0, y); ctx.lineTo(cv.width, y); }
    ctx.stroke(); ctx.restore();
    ctx.strokeStyle = COLOURS.piping; ctx.lineWidth = 14 * sc; path(p.edge); ctx.stroke();
  }

  // sleeves: thin dark purple-navy cuff band (full width, past the hem edge so no sliver shows), white piping along the cap seam
  for (const sl of trim.sleeves) {
    ctx.fillStyle = COLOURS.collar;
    ctx.fillRect(X(sl.u0 - 0.01), Y(sl.hem + 0.009), (sl.u1 - sl.u0 + 0.02) * k, 0.05 * k);
    ctx.strokeStyle = COLOURS.piping; ctx.lineWidth = 14 * sc; path(sl.cap); ctx.stroke();
  }
  // armhole piping on the body panels
  ctx.strokeStyle = COLOURS.piping; ctx.lineWidth = 14 * sc;
  for (const a of trim.armholes) { path(a); ctx.stroke(); }

  for (const m of CLUB_MARKS) paintSlot(ctx, m, imgs, k, X, Y);
  for (const sl of SLOTS) if (sl.status === 'taken') paintSlot(ctx, sl, imgs, k, X, Y);

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
  return { tex, overlay, select };
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
    if (overlay) sh.uniforms.uOver = { value: overlay };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uLag; uniform vec4 uSway; uniform vec2 uAxis; varying float vOutSgn;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float swH = clamp((uSway.x - position.y) / (uSway.x - uSway.y), 0.0, 1.0);        // 0 at the shoulder, 1 at the hem
        float swS = smoothstep(uSway.z, uSway.z + 0.09, abs(position.x - uAxis.x));        // sleeves: distance from the body
        float swW = clamp(pow(swH, 1.5) + swS * 0.8, 0.0, 1.0) * uSway.w;
        vec2 swR = position.xz - uAxis;
        transformed.xz += -uLag * swW * vec2(swR.y, -swR.x);                                // trail behind the spin
        transformed.xz += normalize(swR + 1e-5) * abs(uLag) * 0.18 * swW;                   // and flare a touch outward
        // is the stored normal pointing away from the body axis? (the source mixes inward and outward shells)
        vec2 swN = normalize(normal.xz + 1e-5); float swRad = dot(swN, normalize(swR + 1e-5)) * length(normal.xz);
        vOutSgn = abs(swRad) > 0.4 ? sign(swRad) : 0.0;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vOutSgn;' + (overlay ? '\nuniform sampler2D uOver;' : ''))
      .replace('#include <map_fragment>', `#include <map_fragment>
        ${overlay ? 'vec4 ovl = texture2D(uOver, vMapUv); diffuseColor.rgb = mix(diffuseColor.rgb, ovl.rgb, ovl.a);' : ''}
        // the inside of the garment (seen through the neck and hem) is plain, dark lining, not the printed outside
        if (vOutSgn * (gl_FrontFacing ? 1.0 : -1.0) < 0.0) diffuseColor.rgb *= 0.1;`);
  };
  mat.customProgramCacheKey = () => (overlay ? 'sway-ov' : 'sway-v1');
}
const axis = new THREE.Vector2();

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

function openCard(id) {
  const s = SLOTS.find((x) => x.id === id); if (!s) return;
  activeId = id;
  $('c-name').textContent = s.label;
  const st = $('c-status'); st.textContent = statusLabel[s.status]; st.className = 'badge ' + s.status;
  $('c-sponsor').textContent = s.sponsor || 'Available';
  $('c-pack').textContent = tierName(s.tier) + ' package';
  $('c-size').textContent = s.size;
  $('c-vis').textContent = s.visibility;
  $('c-price').textContent = priceText(s);
  $('card').hidden = false;
  hotspots.forEach((h) => h.el.classList.toggle('on', h.slot.id === id));
  setPlaceholder(s);
  const hs = hotspots.find((x) => x.slot.id === id);
  if (hs) {                                            // zoom to the selected spot: it turns to face us, so centre it sideways too
    const th = -hs.az;
    // the marker sits on the slot's bottom-right corner: shift by half the slot to centre the logo itself
    setView(Math.min(2.4, V.zMax), hs.p.y + ((hs.slot.h || hs.slot.w * 0.3) / 2) * M_PER_UV,
      hs.p.x * Math.cos(th) + hs.p.z * Math.sin(th) - (hs.slot.w / 2) * M_PER_UV);
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
  const imgs = { damask }; Object.keys(ASSETS).forEach((k, i) => { imgs[k] = logos[i]; });

  const meshes = {};
  gltf.scene.traverse((o) => { if (o.isMesh) meshes[o.name || o.geometry.name] = o; });
  const byName = (n) => meshes[n];
  const need = ['shirt_back', 'shirt_front', 'collar', 'shorts', 'shorts_lining', 'waistband'];
  const M = {}; need.forEach((n) => { M[n] = byName(n); if (!M[n]) throw new Error('mesh missing: ' + n); });

  // rotate about the body's vertical axis
  const bb = new THREE.Box3().setFromObject(M.shirt_back).union(new THREE.Box3().setFromObject(M.shirt_front));
  axis.set(0, (bb.min.z + bb.max.z) / 2);
  kit.position.set(-axis.x, 0, -axis.y);
  const yTop = 1.6, yHem = bb.min.y;              // shoulder line and hem of the shirt
  const shortsBox = new THREE.Box3().setFromObject(M.shorts);

  const fabric = { roughness: 0.82, metalness: 0, sheen: 0.55, sheenRoughness: 0.7, sheenColor: new THREE.Color(COLOURS.sheen), envMapIntensity: 0.75, side: THREE.DoubleSide };
  const nrm = knitNormalMap();
  const shirtPaint = buildShirtTexture(imgs, trim);
  setPlaceholder = shirtPaint.select;
  const shirtMat = new THREE.MeshPhysicalMaterial({ ...fabric, map: shirtPaint.tex, normalMap: nrm, normalScale: new THREE.Vector2(0.3, 0.3) });
  addSway(shirtMat, yTop, yHem, 0.17, 1.0, shirtPaint.overlay);
  const shortsMat = new THREE.MeshPhysicalMaterial({ ...fabric, roughness: 0.9, sheenColor: new THREE.Color('#5a5a62'), sheen: 0.7, map: buildShortsTexture(imgs), normalMap: nrm, normalScale: new THREE.Vector2(0.3, 0.3) });
  addSway(shortsMat, shortsBox.max.y, shortsBox.min.y, 9, 0.85);
  const liningMat = new THREE.MeshPhysicalMaterial({ ...fabric, color: new THREE.Color('#101010'), roughness: 0.95, sheen: 0 });
  addSway(liningMat, shortsBox.max.y, shortsBox.min.y, 9, 0.85);
  const collarMat = new THREE.MeshPhysicalMaterial({ ...fabric, color: new THREE.Color(COLOURS.collar), roughness: 0.85, sheen: 0.3, sheenColor: new THREE.Color('#4a4390') });

  M.shirt_back.material = M.shirt_front.material = shirtMat;
  M.shorts.material = shortsMat; M.shorts_lining.material = M.waistband.material = liningMat; M.collar.material = collarMat;
  Object.values(M).forEach((m) => { m.frustumCulled = false; kit.add(m); });

  // soft contact shadow under the kit (a blurred radial floor that does not spin)
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sg = sc.getContext('2d'), rg = sg.createRadialGradient(128, 128, 0, 128, 128, 128);
  rg.addColorStop(0, 'rgba(30,18,16,0.34)'); rg.addColorStop(0.55, 'rgba(30,18,16,0.13)'); rg.addColorStop(1, 'rgba(30,18,16,0)');
  sg.fillStyle = rg; sg.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, shortsBox.min.y - 0.1, 0); scene.add(shadow);

  SLOTS.forEach((s, i) => {
    const front = s.uv[0] < 0.36 || s.id.startsWith('sleeve') ? [M.shirt_front, M.shirt_back] : [M.shirt_back, M.shirt_front];
    const ch = (s.h || s.w * 0.3) / 2;
    // marker sits at the slot's bottom-right corner so it never hides the logo itself
    const hit = uvToSurface(front, s.uv[0] + s.w * 0.5, s.uv[1] - ch) || uvToSurface(front, s.uv[0], s.uv[1]);
    if (hit) addHotspot(s, hit.p.addScaledVector(hit.n, 0.008), hit.n, i); else console.warn('no surface at slot', s.id);
    // which way to turn the kit to face this spot: the front/back panels face 0 / pi exactly; sleeves use the surface at the slot centre
    const h = hotspots[hotspots.length - 1], c = uvToSurface(front, s.uv[0], s.uv[1]);
    h.az = s.id.startsWith('sleeve') ? (c ? Math.atan2(c.n.x, c.n.z) : Math.atan2(h.n.x, h.n.z)) : (s.uv[0] < 0.36 ? 0 : Math.PI);
  });

  resize();
  $('loading').classList.add('gone');
  window.__kit = { S, V, azimuth, hotspots, swayU, camera, shirtTex: shirtMat.map, HI_RES };      // used by the Playwright checks
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
