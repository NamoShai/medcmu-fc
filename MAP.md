# MEDCMU FC Locker Room — MAP

Static sponsor-pitch site. A 3D MEDCMU FC home kit (shirt + shorts) spins horizontally with drag/flick inertia; tappable markers show each sponsor slot. No backend, no build step. **Draft 3.**

## Deploy / update
Live: https://namoshai.github.io/medcmu-fc/ (repo `NamoShai/medcmu-fc`, public, GitHub Pages from `main` / root). To update: edit, test locally, then
```
git add -A && git commit -m "what changed" && git push
```
Pages rebuilds in about a minute (`gh api repos/NamoShai/medcmu-fc/pages/builds/latest --jq .status`). `.gitignore` keeps `models_src/`, `screenshots/` and `assets/src/` out of the repo; asset paths are case-sensitive on the live site.

## Run
```
cd D:\Claude\MedCMU_FC_Locker
python -m http.server 8765      # then open http://localhost:8765/
```
Needs internet (three.js from jsdelivr, fonts from Google Fonts). Deploy target when approved: GitHub Pages. `models_src/` is git-ignored (80 MB source); do not deploy it.

## Files
| File | Role |
|---|---|
| `index.html` | Page: hero + stage, placements table, packages, partners, stats, contact, footer credit. Sections are filled by `app.js` from `kit.js`. |
| `style.css` | Off-white page, Inter, maroon accent only. |
| `kit.js` | **All kit and proposal data**: colours, damask size, slots (position, tier, THB price), tiers, partners, stats, contact, model credit. |
| `app.js` | three.js scene, texture painter, sway shader, drag/inertia, hotspots. |
| `assets/kit.glb` | Simplified kit (about 1 MB, meshopt, ~99k tris). Meshes: shirt_back, shirt_front (sleeves + front), collar, shorts, shorts_lining, waistband. |
| `assets/trim.json` | Shirt outline data in UV space (armhole + sleeve polylines) for the white piping and purple cuffs. |
| `assets/damask_tile.jpg`, `crest.png`, `sriphat.png`, `inseerhong.png` | Prepared artwork. |
| `models_src/` | Git-ignored: untouched PROXY download, `build_kit_glb.mjs`, `make_trim.mjs`. |

## Rebuild the model
In a scratch folder: `npm i @gltf-transform/core @gltf-transform/functions @gltf-transform/extensions meshoptimizer`, copy the two scripts there, then
`node build_kit_glb.mjs <models_src/psg_kit/scene.gltf> <assets/kit.glb> 0.4` and `node make_trim.mjs <scene.gltf> <assets/trim.json>`.

## How it works
- Source model facts (matter when editing): coordinates are metres, y up, front faces +z. The source has two coincident copies of most pieces (dropped at build), the shirt front is two perforated shells that together cover the panel (both kept), normals and winding are both inward on most pieces (materials are DoubleSide, so lighting is right), and the inside of the garment is darkened in the shader.
- The shirt texture is painted at load into a canvas that crops the UV tile (`SHIRT_WINDOW`): damask at a real-world repeat (`DAMASK.tileCm`), lifted a little (`maroonLift`), cuffs, piping, then every slot. Slots are placed in UV space (v is UP the garment); the same coordinates place the hotspot via `uvToSurface`.
- UV map: front panel u 0.02-0.32, back panel u 0.41-0.71, sleeves v 0.20-0.30; viewer's left on the front = smaller u. Layout notes are at the top of `kit.js`.
- Render recipe: ACES filmic, RoomEnvironment PMREM + key + rim light, `MeshPhysicalMaterial` (roughness .82, sheen 1, sheenRoughness .7, lighter-maroon sheenColor, procedural knit normal map repeat 36 at scale .3), blurred radial contact shadow.
- Motion: the model turns (not the camera) so lighting stays fixed. Drag is horizontal only (`touch-action: pan-y`); release keeps the finger velocity and coasts with damping; idle slow turn after 4.5 s. The loose fabric (hem, sleeves, shorts) lags behind the spin: a vertex-shader displacement (`addSway`, `onBeforeCompile`) weighted by height below the shoulder, driven by one damped-spring scalar `S.lag`. `prefers-reduced-motion` turns off inertia, idle turn, sway and the view tween.
- Verification hook: `window.__kit` = { S (rot, omega, lag), azimuth, hotspots, camera }.

## Draft 3 design rules
- `SLOTS` = sponsor spots only (taken/available). Club marks (crest, MEDCMU wordmark, PLAYER 9) live in `CLUB_MARKS`: painted, never listed, never a hotspot.
- The kit shows no placeholders by default. Selecting a spot (marker or table row) repaints the shirt canvas with a quiet dashed outline for that open spot (`buildShirtTexture().select`); closing the card or selecting another spot clears it.
- Base design colours/elements (`COLOURS`, `STRIPE`, `lensPts` in app.js): maroon `tone` multiply, dark navy collar/cuffs, dark mesh side panels with white piping front and back, dark chest stripe between the Sriphat and crest positions. Logo positions are ours, not the base image's.
- Card sits under the view chips (all widths) so it never covers the kit.

## Draft 4 fixes
- Sleeve artifacts: `make_trim.mjs` built the sleeve outline by walking boundary edges, which tangled on the perforated geometry and painted a scribble (white and navy) over each sleeve. It now reads each sleeve from a column profile (`u0/u1/hem` + `cap` polyline in `trim.json`); the cuff band is a plain rectangle past the hem edge.
- Collar: `build_kit_glb.mjs` flattens the rolled PSG collar (4-7 cm) to a thin binding by pulling each vertex towards its neckline edge (x0.26), smooth, no normal map. Navy `#1e1a55`.
- Framing: `KIT_H = 1.24` shows the whole shirt and shorts with a margin; the inside of the garment is darkened to 10 %.

## Draft 5: zoom, resolution
- View state `V` (z, y, x, targets) in app.js: wheel / trackpad pinch (ctrl+wheel) zoom about the cursor, `+`/`-`/Reset buttons, double-click or double-tap resets, pinch + two-finger pan on touch. Camera slides up/down (and sideways only to centre a selected logo); it never tilts or orbits; spin stays horizontal. At the whole-kit framing wheel-down scrolls the page; when zoomed in, touch-action switches to `none` so one finger pans the kit.
- Selecting a spot (marker or table row) turns the kit to face it and zooms to it (`hs.az`, 2.4x); closing the card resets the view. Hotspots are projected every frame so they track at any zoom.
- Max zoom is capped from the texture density vs screen density (`V.zMax`, 1.8-5.5).
- Textures: desktop (fine pointer, screen >=1100, maxTextureSize >=4096, deviceMemory >=4) paints the shirt at 4096 px tall (`PX_PER_UV_HI`) and shorts at 3072; phones 2048 / 1536. `?lo=1` forces the phone path for testing. Anisotropy = renderer max. Placeholders are on a separate 2048 overlay canvas blended in the shirt shader.

## Add / change a sponsor slot (kit.js)
1. Drop the logo as a transparent PNG in `assets/` and register it in `ASSETS`.
2. Add or edit an entry in `SLOTS` (`uv` centre, `w`/`h` in UV units, `tier` gold/silver/bronze, `price` in THB from the proposal). `kind: 'open'` draws the tier-coloured "YOUR LOGO" box. To sell one: set `status: 'taken'`, `sponsor`, `kind: 'logo'`, `logo`.
3. Never type a price that is not in the proposal. Add to `PARTNERS` if it should appear under Current partners.

## Known limits / open points (draft 2)
- Black mesh side panels from the 2D mockup are not modelled. Socks are not shown. Only the home kit is built (the proposal also has a black-and-white away kit).
- Sizes of front and sleeve spots are not stated in the proposal ("Not stated in the proposal"). Back sizes are shown as written, "4 x 3" and "3 x 3", with no unit.
- INSEERHONG GOLD holds the Silver spot under the back number (Namo, round 3). The three Bronze spots in the lower-back row are open.
- The collar is the model's own thicker collar mesh (not a thin band like the base image).
- Sriphat's purple logo has weak contrast on maroon (no plate, per Namo).
- Squad size and matches per season are not in the proposal: placeholders.
