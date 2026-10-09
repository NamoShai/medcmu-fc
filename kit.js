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
  collar: '#1e1a55',                                   // dark purple-navy collar and cuffs (thin bands)
  shorts: '#151515',
  tone: 'rgb(192, 138, 148)',                          // "multiply"-blended over the damask to match the base maroon
  mesh: '#33333a',                                     // side-panel mesh base (dark grey)
  stripe: 'rgb(20, 0, 5)',                             // dark chest stripe
  sheen: '#a8505c',                                    // lighter maroon, for the fabric sheen
};

export const DAMASK = { src: 'assets/damask_tile.jpg', tileCm: 22 };   // physical width of one damask repeat

export const ASSETS = {
  crest: 'assets/crest.png',
  sriphat: 'assets/sriphat.png',
  inseerhong: 'assets/inseerhong.png',
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
  { id: 'front-chest', label: 'Front chest (wearer’s right)', status: 'taken', sponsor: 'Sriphat Hospital CMU', tier: 'gold', price: 20000,
    kind: 'logo', logo: 'sriphat', uv: [0.105, 0.762], w: 0.09, h: 0.045,
    size: 'Not stated in the proposal', visibility: 'Front of the shirt, seen head-on' },
  { id: 'front-lower', label: 'Front, below the wordmark', status: 'open', sponsor: null, tier: 'gold', price: 20000,
    kind: 'open', uv: [0.17, 0.59], w: 0.13, h: 0.05,
    size: 'Not stated in the proposal', visibility: 'Front of the shirt, seen head-on' },
  { id: 'sleeve-left', label: 'Left sleeve', status: 'open', sponsor: null, tier: 'silver', price: 10000,
    kind: 'open', uv: [0.165, 0.248], w: 0.085, h: 0.06,
    size: 'Not stated in the proposal', visibility: 'Sleeve, seen from the side' },
  { id: 'sleeve-right', label: 'Right sleeve', status: 'open', sponsor: null, tier: 'silver', price: 10000,
    kind: 'open', uv: [0.485, 0.248], w: 0.085, h: 0.06,
    size: 'Not stated in the proposal', visibility: 'Sleeve, seen from the side' },
  { id: 'back-below-number', label: 'Back, under the player number', status: 'taken', sponsor: 'INSEERHONG GOLD', tier: 'silver', price: 10000,
    kind: 'logo', logo: 'inseerhong', uv: [0.56, 0.575], w: 0.15, h: 0.06,
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
  { kind: 'logo', logo: 'crest', uv: [0.235, 0.765], w: 0.048 },
  { kind: 'text', text: 'MEDCMU', uv: [0.17, 0.675], w: 0.15 },
  { kind: 'name', text: 'PLAYER', number: '9', uv: [0.56, 0.72], w: 0.19 },
];

// Dark vertical stripe down the front chest from the collar (between the Sriphat and crest positions), UV units.
export const STRIPE = { u0: 0.172, u1: 0.204, vTop: 0.87, vBottom: 0.705 };

// Shorts decals: the club's number and crest, as on the mockup. Not sold positions.
export const SHORTS_DECALS = [
  { kind: 'text', text: '9', uv: [0.26, 0.22], size: 0.07 },
  { kind: 'logo', logo: 'crest', uv: [0.675, 0.22], w: 0.05 },
];

export const PARTNERS = [
  { name: 'Sriphat Hospital CMU', slot: 'Front chest', logo: 'assets/sriphat.png' },
  { name: 'INSEERHONG GOLD', slot: 'Back, lower row', logo: 'assets/inseerhong.png' },
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
