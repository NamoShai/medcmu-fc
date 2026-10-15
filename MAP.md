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
- Verification hook additions: `window.__kit.jersey`, `.switchJersey(n)`, `.float`, `.shot(w, h)` (Draft 8: renders the current view at w x h px, pixel ratio 1, and returns a PNG data URL; independent of window size and browser zoom).

## Golden-ratio layout (Jersey 2 front; all numbers computed in `kit.js`, `GOLD_VALUES`; updated Draft 8)
phi = 1.618. UV units (front panel is 0.30 wide, about 1.71 m per UV unit). Sriphat is 0.143 wide (about 0.82 of the gap between the two piping lines, as in the reference).
| Relationship | Rule | Value |
|---|---|---|
| Sriphat : chest logo (Inseethong) | phi^2 (kept) | chest logo 0.0546 wide |
| Sriphat : crest | **broken**: phi^3 = 5 cm, unreadable; the crest is held inside the stripe (reference: crest about 0.8 of stripe width) | crest 0.042 |
| collar-to-Sriphat-centre : Sriphat-centre-to-hem | **overridden by the reference**: it sits 0.316 of the way collar-to-hem (phi would give 0.382, v 0.700) | Sriphat centre v 0.720 |
| collar-to-crest : crest-to-Sriphat | 1 : phi^2 (kept) | crest centre v 0.791 (reference 0.788) |
| stripe | **not golden**: 6 vertical pinstripes, constant width, centre u 0.2255 (reference), 0.05 wide | |
| cuff band | one band, 0.0085 tall, maroon above and below | |
Not golden, by choice: the chest logo sits at u 0.124, v 0.774 (not the reference's 0.112 / 0.788): the shoulder yoke of the 3D mesh shears the texture and the region around v 0.755-0.80 at u < 0.11 mangles artwork, so the logo is rotated 12 deg in the texture (`rot`) and placed where it stays whole. The stripe fades (full above v 0.76, nothing below v 0.688). Jersey 1 was NOT re-laid out on phi.
Hotspot markers (`markerUV` in app.js): taken logo spots put the marker just outside the right edge of the logo (`MARK_GAP` 0.04), level with its middle; a slot with `mark: 'above'` (Inseethong on both jerseys) puts it above (Jersey 1 Sriphat uses `mark: 'below'`). Open spots keep the marker on the bottom-right corner.

## Draft 8 (2026-10-14): new Jersey 2 front, sleeve sponsors, club line on the back
- **Jersey 2 front rebuilt from the committee's reference (IMG_8513.png)**: royal-blue `#0a449b` collar band (collar texture: wide outer maroon rim, blue band, thin darker inner rim, `COLLAR.rim`), one blue cuff band (`cuffs.n = 1`), black mesh panels with a black -> black-maroon tonal gradient and a white square grid that fades with it (`JERSEYS[2].mesh`, `paintMesh` in app.js), thinner piping (`pipe`), mesh wedge on the underside of each sleeve with its own piping (`sleeveMesh`), vertical black pinstripe band (`stripe.pins`: a near-solid dark wash with 9 pins at about 4:1 pin:gap, so it reads as one dark band with fine maroon hairlines; solid at the collar, faint behind "HAT", gone by the foot of "HOSPITAL CMU"; it stops at v 0.862, under the collar band), navy/teal + cream-gold crest (`assets/crest_navy.png`, recoloured from the clean green crest: the reference crest is only about 75 px and reads "MEO CMU"), Inseethong chest logo.
- **Side line curve fix**: the lower part of the `RAGLAN` inner line used to flare back outward toward the hem; it now keeps moving toward the body (Round 2: moved toward the centre so the front view shows a clear wedge, front u 0.0555 at the underarm -> 0.100 at the hem, back mirrored). The mesh now tapers to a point near the hem (tip v 0.52 front / 0.505 back, about 88% down): the bottom edge is a quadratic curve from the end of the inner line to the side seam, leaving the line vertically and meeting the seam horizontally, so the front and back tapers join into one smooth curve round the side (no chevron). Only Jersey 2 draws panels.
- **Sleeve sponsors (both jerseys, kit-wide)**: wearer's LEFT sleeve = ASURA (gold on transparent, `assets/asura.png`), wearer's RIGHT = AED4ALL over Progresso (`assets/sleeve_right_pack.png`: red heart kept, wordmarks white, Progresso navy icon intact, no patch needed). The `sleeve-left` slot now lives on the pattern piece at u 0.485 (the viewer's RIGHT in the front view) and `sleeve-right` at u 0.165: before, the slot called "left" sat on the wearer's right sleeve. ASURA has no price: `tier`/`price` are `null`; the card shows Package "Not stated" and hides the Price row; the table shows dashes. `sleeve-right`: Bronze, THB 5,000 (the pair together). Logo sources: `assets/src/make_draft8_logos.py` (local, git-ignored) builds them from the files Namo sent.
- **Back (both jerseys)**: "Medicine Football Club" (Inter 600, white, `kind: 'text'` mark) under the number at v 0.617. The open `back-below-number` slot (v 0.575, box 0.545-0.605) fits below it without moving, clear of the `back-lower-*` row.
- **Texture pre-correction (`m` = canvas affine [a, b, c, d, e, f], in `paintSlot`)**: the shoulder yoke of the 3D mesh turns and shears the texture (about 12 deg, opposite on each shoulder). `m` is the inverse of the mesh's UV->screen Jacobian at the logo (measured from `shirt_front`'s UVs and positions: chest [1.696, 0.375; 0.078, 1.593], crest [1.645, -0.437; -0.091, 1.500] metres per UV unit), scaled by 1.7, so the logo stands upright and unslanted on screen (a plain rotation left the Thai line looking italic). Jersey 2 also uses `assets/inseethong_j2.png`: the same artwork with the eagle scaled to the reference's proportion to the Thai line (Jersey 1 keeps `inseethong.png`).
- **Stray dark smear at the wearer's right neck base** (seen in 3/4 views) is NOT from the stripe or panels: it shows on Jersey 1 too and with every painted layer off. It is the shader's inside-of-garment darkening misfiring on unreliable stored normals near the neck (see `addSway`). Left alone (locked mesh / shader territory). Jersey 1's chest eagle is sheared by the same yoke; Jersey 1 is locked, so it was not corrected.
- Current partners now lists ASURA and AED4ALL + Progresso (`PARTNERS`).
- Code notes: `resize(w, h)` takes optional size for `__kit.shot(w, h)` (renders the current view at w x h and returns a PNG data URL; used for the screenshots because the headless window's zoom made DOM screenshots unreliable). The window `resize` listener is `() => resize()` (passing it the event gives NaN sizes and a blank canvas).
- Known limits: the damask and mesh are the locked ones, so the maroon is brighter and grainier than the flat reference; the sleeve-underside wedge is mostly hidden from the front and reads as plain dark mesh (the sleeve's inner wall is darkened by the lining shader; its piping was removed in Round 2 because it showed as stray white strokes at the armpit); the Thai line of the Inseethong logo is wide and the mesh's UV near the shoulder shears it (hence the rotation and placement above).

## Draft 9 (2026-10-14): Jersey 3, solid black panels, sponsor presentation, athletic torso
- **Sponsors**: ASURA is Bronze THB 5,000 (card and table). AED4ALL and Progresso are separate, unrelated sponsors sharing one sleeve spot: the slot shows "AED4ALL · Progresso" and `priceNote` makes the price read "THB 5,000 for the shared spot (two separate sponsors)" (`priceText` in app.js appends `s.priceNote || 'per spot'`). "Current partners" lists AED4ALL and Progresso as two entries with their own logos (`assets/aed4all.png`, `assets/progresso.png`). The sleeve texture is still one image (`assets/sleeve_right_pack.png`) built by `assets/src/make_draft8_logos.py` with Progresso at 0.78 of AED4ALL's height (never bigger); ASURA is 0.036 x 0.040, about one single logo. Sleeve hotspot markers use `markAt` (explicit UV, honoured by `markerUV`): the sleeve island is the full tube circumference (0.225 UV = 360 deg), so the default "just right of the logo" marker sat 90 deg round the arm and was hidden.
- **Side panels**: Jersey 2 = solid black (`mesh: { top, bottom }`, no `grid`: only a very subtle tone shift), roughly half as wide (lower `RAGLAN` inner lines moved toward the side seam: front u 0.0555 at the underarm -> 0.0735 at the hem; still curves inward going down; taper to a point at v 0.52 / 0.505 unchanged). The black wedge under the sleeves is removed on every jersey (solid black showed as spikes at the armpit; `sleeveMesh` code deleted). **Jersey 3** (`#jersey-3`, third button) = Jersey 2 with `noFill: true`: the panel area stays plain damask, the white piping lines and taper curve are kept so the shape reads. Selector fits at 390 px (group 354 px wide).
- **Athletic torso (all jerseys, shorts unchanged)**: `reshapeTorso` / `torsoField` in app.js, parameters `BODY` in kit.js. Runtime vertex deformation of `shirt_front` and `shirt_back` right after load (originals are kept in `geometry.userData.p0/n0`): each vertex moves horizontally along its radius from the body axis by `dr`, weighted `cos^2` to the front. Terms: chest (+0.032 m, gaussian at y 1.47, sigma 0.06, two pec lobes at |x| 0.065 with the sternum dipped to 65%, faded out by |x| 0.16 so the sleeves are untouched); abdomen (-0.014 m, y 1.27, sigma 0.09); waist taper from the front (-0.010 m on the sides, y 1.25, sigma 0.08); everything faded to zero below y 1.10-1.26 (`floorY/floorW`) because the shirt hem has to stay outside the shorts' waistband (z 0.09, top y 1.146) or the black shorts poke through. UVs untouched, so artwork stays put. Normals are carried through the field's Jacobian (cofactor matrix) instead of `computeVertexNormals`: the shader's inside/outside logic relies on the stored normals' orientation, and the stored normals are an interleaved normalised Int8 attribute (read/write through `getX/setXYZ`). Measured side profile (front edge, px at z 1.7): chest 313 -> 289 (2.0 cm forward), belly 298 -> 311 (1.1 cm back), hem unchanged. `window.__kit.body(null)` restores the original shirt, `__kit.body({ ...BODY, chest: 0.04 })` tunes it live.
- Known limits: the shirt hem still flares about 2 cm over the waistband (see above); the Jersey 1 chest eagle remains sheared by the shoulder yoke (locked).

### Draft 9 round 2
- **Torso**: pec lobes and sternum dip removed. One flat chest plate (`BODY.chest` +1.5 cm, ramps in from y 1.30 to 1.46, flat to 1.53, fades out by 1.61, full torso width fading only at the sleeves |x| 0.14-0.19), abdomen -0.8 cm, waist -0.8 cm, all faded out near the hem. Front-edge profile (px at z 1.7, top to bottom): 324, 310, 300, 302-304 flat, then back to the hem: a straight chest-to-waist line, no bump.
- **Panels**: both the top and the bottom of each black panel are now a pointed curve (`head` curve from the side seam into the inner line; bottom = straight diagonal from the line at v 0.62 / 0.60 to the seam at v 0.50 / 0.485), so front and back diagonals meet in a point on the side seam and the black exists only inside the piped lens. The dark patch left under each armpit in front views is the shader's inside-of-sleeve darkening (not painted).
- **Partners**: every logo plate is 84 px tall (`.partner img`); five separate entries.

## Draft 10 (2026-10-14): back line "Medicine CMU Football Club", finer damask
- Back club line text is "Medicine CMU Football Club" (`CLUB_MARKS` and `JERSEYS[2].marks`), `w` 0.122: wider than 0.115 for the longer text, but at 0.136 the first and last letters got squashed by the back's curvature.
- **Damask 1.7x finer**: `DAMASK.tileCm` 22 -> 12.9. Also scales the blue (stripe/collar/cuff) relief and the Jersey 3 panel area, since they share `paintDamask`/`paintBlue`. No contrast or colour change (the motif reads calmer at distance because it is smaller). At 12.9 cm the 904 px tile is minified (426 px per repeat on desktop), so no mush.
- **Plaid grid fix**: at the finer repeat the tile's own row/column brightness drift (a few ~12 % darker horizontal/vertical bands per tile, plus a dark 6 px line along the tile edges) showed as a plaid across the shirt. `flattenTile()` in app.js trims 18 px off the tile edges (the tile is mirror-symmetric, so it stays seamless) and divides each row and column by its smoothed mean brightness (a gain: motif contrast and hue unchanged). Measured row profile of the painted canvas: dips of 77/74 against 87 before, 79-88 after.

## Draft 11 (2026-10-15): Sponsors on/off
- `#sponsor-tgl` (`.tgl`, in the `.chips` row; deliberately NOT `.chip`, because `frame()` toggles `.active` on every `.chip` by view angle). `showSponsors` (app.js, module level, default true): when false `buildShirtTexture` skips the `taken` slot loop, so only club marks are painted. The click handler calls `paintJersey(JERSEYS[jersey])` (repaint in place, no fade, camera untouched), then restores the open card's hotspot highlight and placeholder. Hook: `__kit.sponsors`. Shorts have no sponsors, so they are not repainted.
