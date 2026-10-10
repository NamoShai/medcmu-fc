# MEDCMU FC Locker Room — MAP

Static sponsor-pitch site. A 3D MEDCMU FC home kit (shirt + shorts) spins horizontally with drag/flick inertia; tappable markers show each sponsor slot. No backend, no build step. **Draft 7: two kits (Jersey 1 / Jersey 2).**

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
| `assets/trim.json` | Sleeve rectangles in UV space (`sleeves[].u0/u1/hem`) for the blue cuff bands. (Its `armholes` and sleeve `cap` polylines are no longer used.) |
| `assets/damask_tile.jpg`, `crest.png`, `sriphat.png` (pure white, alpha kept), `inseethong.png` | Prepared artwork. `inseethong.png` = cleaned gold eagle (cropped from the old logo) over the Thai + Latin wording set in Noto Sans Thai, baked once in a browser canvas. |
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
- Base design colours/elements (`COLOURS`, `STRIPE`, `RAGLAN`, `COLLAR` in kit.js): maroon `tone` multiply, blue collar band and cuff bands, dark mesh side panels, white raglan piping, navy centre stripe. Logo positions are ours, not the base image's.
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
- Socks are not shown. Only the home kit is built (the proposal also has a black-and-white away kit).
- Sizes of front and sleeve spots are not stated in the proposal ("Not stated in the proposal"). Back sizes are shown as written, "4 x 3" and "3 x 3", with no unit.
- The Silver spot under the back number is open (was INSEERHONG GOLD until Draft 6). The three Bronze spots in the lower-back row are open.
- Squad size and matches per season are not in the proposal: placeholders.

## Draft 6 (new shirt design, 2026-10-10)
- Layout follows Namo's new design: big white Sriphat front centre (Gold), Inseethong Gold (eagle + ห้างทองอินทรีทอง + Inseethong Gold) on the wearer's right chest (Gold), crest on the wearer's left chest, no MEDCMU wordmark, back spot under the number is open (Silver). The old `front-lower` slot is gone.
- Centre stripe (`STRIPE`): navy, collar to hem, FRONT only (the PSG reference shows only the front), ~1/5 of the front width. Alpha profile is solid under the collar, fades to 0 between v 0.738 and 0.678 (behind Sriphat, plain maroon) and returns slowly towards the hem, like PSG's stripe behind QATAR AIRWAYS. The old black chest stripe is removed.
- Piping + mesh (`RAGLAN`, `smooth()` in app.js): one anchor list per body panel (left side, mirrored about `centre`), smoothed with a centripetal Catmull-Rom spline, stroked at constant width. It runs neck -> shoulder -> inner edge of the mesh -> hem. The mesh wedge is cut from the same smoothed line, so mesh edge and piping cannot drift apart. Why the old piping looked wrong: it was painted on the armhole/sleeve-cap island BOUNDARIES (half the stroke clipped, sleeve cap a different shape from the body armhole, lines breaking at the armpit). The UV is isometric (~1.71 m per UV unit both ways, measured), so painting inside a panel does not stretch. The back panel is cut lower than the front: its heights come from matching the 3D height (y) of the side seam, not a constant offset. There is no piping on the sleeve islands now.
- Collar and cuffs: the collar mesh is two UV strips that overlap the shirt panels in UV, so it has its own small texture (`buildCollarTexture`): maroon with a blue band. Cuffs: blue band with a thin maroon edge. Single blue `COLOURS.blue`.
- Known limits: the crest is still the green artwork (the design's crest is teal/navy and gold, no clean source). The model has set-in sleeves, the drawing has raglan sleeves, so the line ends at the shoulder seam beside the collar rather than exactly on the collar edge. Mesh reads lighter grey than the drawing's black.
- Draft 6b (Cloudy's review): the stripe now starts at the collar (it is also painted across the front collar strip, `COLLAR.stripe`) and, like the collar band and cuffs, is the one `COLOURS.blue` with the damask relief laid over it (`paintBlue`, soft-light) so it reads as printed into the cloth; the fade is a 160-stop alpha mask. Eagle and crest now sit at one height (v 0.768), mesh is near-black (`COLOURS.mesh`). Interior darkening: the stored normals are unreliable at the neck, so the shader also darkens anything on the far side of the body axis from the camera, only in the torso middle (|x|<0.09 so sleeves and shoulders are not hit), to pure dark lining. Crest stays green until a teal/gold source exists.
- Sleeve cuffs (6c): the sleeve shell is perforated and the inner wall is printed, so the cuff opening showed ragged holes. Each sleeve now gets a dark tube plug (`capMat`, an ellipse fitted to the cuff, 9 cm deep, closed at the top, built in boot() right after the meshes are added); it moves with the sway. The shader-only fixes tried first (darkening by normals) cannot work there: the stored normals are unreliable. Footer 'Draft 2' text removed.
- Draft 6d: lower stripe now composited in linear light (clean red-to-blue gradient instead of a dark purple sRGB blend); eagle raised so its top lines up with the crest top from the front camera.
- Draft 6e: cuff lining = full cuff ellipse, dark maroon vertex-colour gradient (darker deeper in); mesh grid 2.5x finer (step 4.8, line 1.0).
- Draft 6f: cuff plug rim is fitted to the tilted hem plane (it poked out below the cuffs in the front view before); official Inseethong logo rebuilt: eagle keyed from assets/src/inseethong_official.jpg, text Sarabun 500 white.
- Draft 6g: front-view dark bars under the cuffs were the lining plug (rim at k 1.02, 4 mm below the hem); proven by a plug-off toggle (clean), now k 0.97 and 3 mm above the hem.

## Draft 7: two jerseys (2026-10-11)
- One mesh, two paint jobs. `JERSEYS` (end of `kit.js`) holds each kit's design: `panels` (mesh + piping on/off), `cuffs`, `stripe`, `collar`, `marks` (club marks) and `slots` (per-jersey UV overrides of `SLOTS`; ids, tiers, prices are shared and untouched). `app.js` `paintJersey(J)` disposes the old shirt/overlay/collar textures, repaints from `JERSEYS[id]`, swaps `shirtMat.map` / `collarMat.map` / the overlay uniform, and rebuilds the hotspots from `slotsFor(J)`. Only one 4096 (desktop) / 2048 (phone) shirt canvas exists at a time.
- Switching (`switchJersey`): fade out 0.2 s, repaint, fade in with one full horizontal turn (1.1 s). Rotation and zoom are kept; an open card is reopened on the new kit's hotspot. `prefers-reduced-motion`: instant swap. URL hash `#jersey-2` selects Jersey 2 on load and follows the buttons.
- **Jersey 1** = the Draft 6 kit with: no cuff band, no mesh panels, no piping (clean damask sides front to back). Collar (with blue band + stripe across its front) and the navy centre stripe are untouched. Dropping ALL piping (not just the side outlines) was the reading of "clean sides"; the front still reads fine without the curves.
- **Jersey 2** = the concept render: maroon collar with a thin navy/purple band, two thin navy/purple cuff stripes, white raglan piping + near-black mesh side panels (the existing `RAGLAN` spline data), a wide crisp black stripe from the collar on the wearer's left shoulder (`JERSEYS[2].stripe`, a diagonal trapezoid that flares towards the hem and lightens to 12 % alpha behind Sriphat only), the white Sriphat logo (replaces the MEDCMU wordmark), the crest centre chest above it, Inseethong on the wearer's right chest.
- Float + light: `spin.position.y` bobs 5 mm on a 6 s sine (off under reduced motion) and the contact shadow scales/fades with it. Key light is low and raking from the viewer's right, plus a soft fill, sheen 0.45, knit normalScale 0.16 (was 0.3) so the mesh folds read instead of the fabric hatching.
- Verification hook additions: `window.__kit.jersey`, `.switchJersey(n)`, `.float`.

## Golden-ratio layout (Jersey 2 front; all numbers computed in `kit.js`, `GOLD_VALUES`)
phi = 1.618. UV units (front panel is 0.30 wide, about 1.71 m per UV unit). Sriphat is 0.13 wide (the middle ~45% of the front, as in the concept) so it clears both piping curves with margin.
| Relationship | Rule | Value |
|---|---|---|
| Sriphat : chest logo (Inseethong) | phi^2 | chest logo 0.0497 wide |
| Sriphat : crest | **broken**: phi^3 would give a 5 cm crest, unreadable | crest = chest logo = 0.0497 |
| collar-to-Sriphat-centre : Sriphat-centre-to-hem | 1 : phi (collar v 0.835, hem v 0.481) | Sriphat centre v 0.700 |
| collar-to-crest : crest-to-Sriphat | 1 : phi^2 split of the collar-to-Sriphat gap | crest centre v 0.783 |
| front panel : stripe at collar / at hem | **overridden**: phi^4 / phi^3 (0.044 / 0.071) read as a shadow, the concept band is wider | 0.058 / 0.095 |
| cuff stripe : gap between the two stripes | 1 : phi | 0.006 : 0.0097 |
Not golden, by choice: the chest logo's horizontal position (u 0.101), the stripe's slant (centre u 0.226 at the collar to 0.190 at the hem, kept inside the shoulder piping) and the stripe fade (full strength above v 0.752 and below v 0.648, 12 % behind Sriphat; the ramps are short (0.024) so the band edges stay crisp). Jersey 1 was NOT re-laid out on phi (its placements stay where they were, Namo's call in Draft 6).
Hotspot markers (`markerUV` in app.js): taken logo spots put the marker just outside the right edge of the logo (`MARK_GAP` 0.04), level with its middle; a slot with `mark: 'above'` (Inseethong on both jerseys: on Jersey 1 a right-hand marker would float mid-stripe, on Jersey 2 it would hit the crest) puts it above (Jersey 1 Sriphat uses `mark: 'below'`, its right edge curves out of sight; gap 0.02: higher and the marker rolls over the shoulder and hides). Open spots keep the marker on the bottom-right corner.
