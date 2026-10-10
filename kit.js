// Kit configuration: everything a sponsor-slot change touches lives here.
// Slots are placed in the shirt model's UV space (u across, v up; the kit.glb UVs were moved into one 0..1 tile).
// The same numbers drive the painted logo AND the tappable hotspot, so they cannot drift apart.
//
// Shirt UV layout (v is UP the garment):
//   front panel  u 0.02-0.32, v 0.48 (hem) - 0.88 (shoulder), centre u 0.17   viewer's LEFT = wearer's RIGHT = smaller u
//   back panel   u 0.41-0.71, same v, centre u 0.56                           (viewed from behind u still grows to the right)
//   sleeves      two pieces at v 0.20 (cuff) - 0.30 (cap): u 0.05-0.28 and u 0.37-0.60, centre of the piece = outer arm
// Shorts UV layout: front legs v 0.09-0.46, u 0.15-0.37 and u 0.56-0.78.

export const PX_PER_UV_HI = 5120;                      // shirt texture sharpness on desktop: 4096 px tall (cropped to the shirt's UV window)
export const PX_PER_UV_LO = 2560;                      // phones / low-memory devices: 2048 px tall
export const SHIRT_WINDOW = { u0: 0.0, u1: 0.74, v0: 0.18, v1: 0.98 };
export const M_PER_UV = 1.55;                          // measured scale of the pattern pieces, used to size the damask

export const COLOURS = {
  piping: '#ffffff',
  blue: '#0a3482',                                     // royal/navy blue: collar band, cuff bands and the centre stripe
  shorts: '#151515',
  tone: 'rgb(192, 138, 148)',                          // "multiply"-blended over the damask to match the base maroon
  mesh: '#0c0c10',                                     // side-panel mesh base (near black, as in the design)
  sheen: '#a8505c',                                    // lighter maroon, for the fabric sheen
};

export const DAMASK = { src: 'assets/damask_tile.jpg', tileCm: 22 };   // physical width of one damask repeat

export const ASSETS = {
  crest: 'assets/crest.png',
  sriphat: 'assets/sriphat.png',
  inseethong: 'assets/inseethong.png',
};

export const TIER_COLOURS = { gold: '#e6b422', silver: '#b9bcc1', bronze: '#b56a4c' };

// Packages exactly as written in the sponsor proposal (Sponsorship Package table). Prices in THB.
export const TIERS = [
  { id: 'bronze', name: 'Bronze', price: 5000, perks: [
    'Logo on the players’ shirts',
    'Logo on shirts bought by fans and outside buyers',
    'Double tax deduction (cash sponsorship only)' ] },
  { id: 'silver', name: 'Silver', price: 10000, perks: [
    'Everything in Bronze',
    'Logo banner in thank-you posts and pre/post-match posts on Instagram' ] },
  { id: 'gold', name: 'Gold', price: 20000, perks: [
    'Everything in Silver',
    'Logo banner in the Facebook live stream of matches',
    'Promo clip content on the MEDCMU FC Facebook and Instagram pages' ] },
];

// SPONSOR spots only (taken or available). Club-owned marks are in CLUB_MARKS below and are not listed on the site.
// kind: 'logo' (painted image when taken) | 'open' (dashed placeholder, drawn ONLY while the spot is selected)
// status: 'taken' | 'open'     tier + price come from the proposal; priced per spot.
// uv: [u, v] centre, w: width in UV units, h: height in UV units (logos are fitted into the box)
export const SLOTS = [
  { id: 'front-centre', label: 'Front centre (large logo)', status: 'taken', sponsor: 'Sriphat Hospital CMU', tier: 'gold', price: 20000,
    kind: 'logo', logo: 'sriphat', uv: [0.1705, 0.692], w: 0.17, h: 0.05,
    size: 'Not stated in the proposal', visibility: 'Front of the shirt, seen head-on' },
  { id: 'front-chest', label: 'Front chest (wearer’s right)', status: 'taken', sponsor: 'Inseethong Gold (ห้างทองอินทรีทอง)', tier: 'gold', price: 20000,
    kind: 'logo', logo: 'inseethong', uv: [0.104, 0.773], w: 0.048, h: 0.056,
    size: 'Not stated in the proposal', visibility: 'Front of the shirt, seen head-on' },
  { id: 'sleeve-left', label: 'Left sleeve', status: 'open', sponsor: null, tier: 'silver', price: 10000,
    kind: 'open', uv: [0.165, 0.248], w: 0.085, h: 0.06,
    size: 'Not stated in the proposal', visibility: 'Sleeve, seen from the side' },
  { id: 'sleeve-right', label: 'Right sleeve', status: 'open', sponsor: null, tier: 'silver', price: 10000,
    kind: 'open', uv: [0.485, 0.248], w: 0.085, h: 0.06,
    size: 'Not stated in the proposal', visibility: 'Sleeve, seen from the side' },
  { id: 'back-below-number', label: 'Back, under the player number', status: 'open', sponsor: null, tier: 'silver', price: 10000,
    kind: 'open', uv: [0.56, 0.575], w: 0.15, h: 0.06,
    size: '4 × 3 (as written in the proposal)', visibility: 'Back of the shirt, seen from behind' },
  { id: 'back-lower-1', label: 'Back, lower row (left)', status: 'open', sponsor: null, tier: 'bronze', price: 5000,
    kind: 'open', uv: [0.50, 0.516], w: 0.042, h: 0.042,
    size: '3 × 3 (as written in the proposal)', visibility: 'Lower back, seen from behind' },
  { id: 'back-lower-2', label: 'Back, lower row (centre)', status: 'open', sponsor: null, tier: 'bronze', price: 5000,
    kind: 'open', uv: [0.56, 0.516], w: 0.042, h: 0.042,
    size: '3 × 3 (as written in the proposal)', visibility: 'Lower back, seen from behind' },
  { id: 'back-lower-3', label: 'Back, lower row (right)', status: 'open', sponsor: null, tier: 'bronze', price: 5000,
    kind: 'open', uv: [0.62, 0.516], w: 0.042, h: 0.042,
    size: '3 × 3 (as written in the proposal)', visibility: 'Lower back, seen from behind' },
];

// Club-owned marks: painted on the kit, never listed, never a hotspot.
export const CLUB_MARKS = [
  { kind: 'logo', logo: 'crest', uv: [0.236, 0.768], w: 0.046 },
  { kind: 'name', text: 'PLAYER', number: '9', uv: [0.56, 0.72], w: 0.19 },
];

// Centre stripe, collar to hem on the FRONT only (as in the PSG reference: about 1/5 of the front width). Solid under the collar, fades to
// nothing behind the big front logo (alpha 0 between vClear0 and vClear1) and returns, slowly, towards the hem.
export const STRIPE = { u: 0.1705, w: 0.06, vTop: 0.835, vBottom: 0.478, solidAbove: 0.785, clear0: 0.735, clear1: 0.678, solidBelow: 0.565, alpha: 0.96 };

// Raglan piping + mesh side panels, one entry per body panel (left side listed, the right side is mirrored about `centre`).
// `line` runs from the neckline, round the shoulder, down the inner edge of the mesh panel and on to the hem (smoothed with a
// Catmull-Rom spline at paint time). The mesh is the wedge between the armhole and `line` from `apex` (v) down to `tip` (v), closed by
// a diagonal edge to `seam` = [u, v] on the side seam. The back panel is cut lower, so its numbers follow the 3D height of the seam.
export const RAGLAN = [
  { centre: 0.170, apex: 0.800, tip: 0.600, seam: [0.0215, 0.614],
    line: [[0.108, 0.880], [0.094, 0.872], [0.078, 0.860], [0.065, 0.843], [0.058, 0.823], [0.0555, 0.800], [0.0575, 0.775], [0.0630, 0.750], [0.0695, 0.720],
      [0.0735, 0.690], [0.0755, 0.660], [0.0755, 0.630], [0.0745, 0.600], [0.0725, 0.570], [0.0705, 0.540], [0.0685, 0.510], [0.0665, 0.481]] },
  { centre: 0.563, apex: 0.790, tip: 0.578, seam: [0.4239, 0.590],
    line: [[0.4985, 0.866], [0.484, 0.858], [0.4685, 0.846], [0.457, 0.830], [0.4495, 0.812], [0.4455, 0.790], [0.4478, 0.766], [0.4525, 0.742],
      [0.4653, 0.693], [0.4720, 0.663], [0.4769, 0.633], [0.4769, 0.604], [0.4758, 0.578], [0.4725, 0.551], [0.4694, 0.526], [0.4669, 0.500], [0.4645, 0.476]] },
];

// The collar mesh is two UV strips (front neckline, back neckline) that run along u. They overlap the shirt panels in UV, so the collar has its
// own small texture over `window`; the blue band is the middle part (`band`, fraction of the strip width) of each strip. `stripe` carries the
// centre stripe across the front strip (u of the body centre x=0 is 0.4371; the collar runs ~0.9 m per u unit, hence 0.06 x 1.71 / 0.9 wide).
export const COLLAR = { window: { u0: 0.29, u1: 0.584, v0: 0.445, v1: 0.622 }, strips: [[0.445, 0.493], [0.578, 0.622]], band: [0.30, 0.68], stripe: { strip: 0, u0: 0.3798, u1: 0.4944 } };

// Shorts decals: the club's number and crest, as on the mockup. Not sold positions.
export const SHORTS_DECALS = [
  { kind: 'text', text: '9', uv: [0.26, 0.22], size: 0.07 },
  { kind: 'logo', logo: 'crest', uv: [0.675, 0.22], w: 0.05 },
];

export const PARTNERS = [
  { name: 'Sriphat Hospital CMU', slot: 'Front centre', logo: 'assets/sriphat.png' },
  { name: 'Inseethong Gold (ห้างทองอินทรีทอง)', slot: 'Front chest', logo: 'assets/inseethong.png' },
];

// Real figures from the proposal. Anything the proposal does not state stays a placeholder.
export const STATS = [
  { value: '846,624', label: 'Instagram views in 30 days on @medcmufc (from the proposal\u2019s analytics screenshot). Silver and Gold sponsors get their logo banner in the match posts that reach this audience.' },
  { value: '3\u00d7 in a row', label: 'Syringe Games champions. Latest: 31st Syringe Games, Chiang Mai University (1st place); 34th, Chulalongkorn University (runner-up)' },
  { value: '15\u201317 Jan 2570', label: 'Next event: 35th Syringe Games at Prince of Songkla University, streamed live on Facebook (2570 BE = 2027)' },
];
export const STAT_PLACEHOLDERS = ['Squad size', 'Matches per season'];

export const CONTACT = {
  name: 'Thanyawut Phongwitayanukrit',
  thai: 'ธัญวุติ พงษ์วิทยานุกฤต',
  email: 'Thanyawutphongwitayanukrit@gmail.com',
  phone: '087-270-3080',
};

export const MODEL_CREDIT = {
  title: 'Paris Saint-Germain x Jordan Home Stadium Kit',
  modelUrl: 'https://sketchfab.com/3d-models/paris-saint-germain-x-jordan-home-stadium-kit-1d43be1db93143ea8cc35bb5fb339ad1',
  author: 'PROXY',
  authorUrl: 'https://sketchfab.com/proxy000000000',
  licence: 'CC-BY-4.0',
  licenceUrl: 'http://creativecommons.org/licenses/by/4.0/',
};
