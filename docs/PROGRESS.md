# MEDCMU FC Locker Room — progress log

Sponsor-pitch website: a 3D MEDCMU FC kit that sponsors spin, zoom and tap to see each placement and its price.
Live: https://namoshai.github.io/medcmu-fc/ · repo `NamoShai/medcmu-fc` (public, GitHub Pages from `main`) · architecture → `MAP.md`.

## Current state (2026-10-11, Draft 7 local, not pushed)
- LIVE. Home kit only. Slots, tiers and prices from `CMU_Medicine_Football_Sponsor_Proposal_2569.pdf`: Gold THB 20,000 · Silver THB 10,000 · Bronze THB 5,000 per spot.
- Partners: **Sriphat Hospital CMU**, Gold, front centre (large white logo) · **Inseethong Gold (ห้างทองอินทรีทอง)**, Gold, front chest (wearer's right). Back spot under the number is open (Silver).
- Stats on the page: 846,624 IG views/30 days · 3× Syringe Games champions · 35th Syringe Games 15–17 Jan 2570. Squad size and matches per season are still placeholders.

## Log
- **2026-10-08 · Draft 1.** Static Three.js site, horizontal-only spin, kit painted at runtime from `kit.js`. Rejected Streamlit (the free tier sleeps) in favour of GitHub Pages. The model was a low-poly Poly Pizza T-shirt, and Namo rejected it as fake.
- **2026-10-08 · Research (Stark).** A realistic look comes from cloth-simulated meshes, not shaders. Picked the CC-BY "PSG x Jordan Home Stadium Kit" by PROXY (Sketchfab). Sketchfab needs a login, so Namo downloaded it.
- **2026-10-09 · Draft 2.** New model, decimated 80 MB → 0.96 MB GLB. Physical fabric rendering. Momentum spin plus damped fabric sway in a vertex shader. White plate behind Sriphat removed, maroon lightened, name INSEERHONG GOLD. Proposal prices and stats loaded.
- **2026-10-09 · Draft 3.** Matched Namo's base design (`831353079_…n.jpg`): navy collar and cuffs, mesh side panels, white piping, chest stripe, 9 and crest on the shorts. Logo placement stays as on our model (Namo's call). Club-owned areas removed from the list. "YOUR LOGO" placeholders show only when a spot is selected. Non-follower % stat removed.
- **2026-10-09 · Round 4.** Fixed sleeve scribble artifacts (a bug in our own trim script). Collar flattened to a thin band. Zoom undone so the whole kit shows.
- **2026-10-09 · Round 5.** Zoom added (wheel, pinch, ± buttons, reset, tap-to-zoom on a spot). 4K kit texture on desktop, 2K on phones, zoom capped at texture density. Syringe Games stats restored.
- **2026-10-09 · Deployed** to GitHub Pages and verified live (no 404s, zero console errors).
- **2026-10-09 · Wording.** Free kit for sponsors of "5,000 THB and up" (Namo's reading). Maroon confirmed as is. Commit made locally, **push pending**: github.com DNS was failing at the time.

- **2026-10-10 · Draft 6 (local, awaiting Cloudy's review and push).** Namo's new shirt design: white Sriphat front centre, Inseethong Gold (Thai wording, rebuilt crisp from the eagle + Noto Sans Thai) on the chest opposite the crest, MEDCMU wordmark and black stripe removed, navy centre stripe fading out behind Sriphat (PSG-style, front only), maroon collar with blue band, blue cuff bands. Piping rebuilt: smooth spline lines inside the body panels (the old ones sat on UV island boundaries), mesh cut from the same line, back heights matched to the seam in 3D. Slots: Sriphat Gold, Inseethong Gold, back-under-number now open Silver, `front-lower` removed. Verified with Playwright at 1280x800 and 390x844: zero console errors, no 404s, hotspots on their logos, open spot shows its placeholder. Screenshots `screenshots/v6_*`.

- **2026-10-10 · Draft 6b.** Fixes after Cloudy's review: stripe from the collar, fabric-textured blue shared with collar/cuffs, eagle level with the crest, darker mesh, neck-opening interior regression fixed. Re-verified at 1280x800 and 390x844, zero errors.
- **2026-10-10 · Draft 6c.** Sleeve-cuff artifacts removed (dark plug inside each cuff), footer 'Draft 2' text removed. Re-verified, zero errors. Before/after: `screenshots/v6_cuff_*`.

- **2026-10-11 · Draft 7 (local, not pushed; awaiting Cloudy's review).** Two kits on the one mesh, switched by "Jersey 1" / "Jersey 2" buttons (`#jersey-2` hash). Jersey 1 = Draft 6 minus the cuff band and minus all mesh/piping (clean damask sides); collar and navy centre stripe untouched. Jersey 2 = Namo's concept render: black raglan mesh sides with white piping, wide black stripe from the collar (flares towards the hem, lightens behind Sriphat), thin navy/purple collar band and two cuff stripes, Sriphat replaces the MEDCMU wordmark, crest centre chest, Inseethong on the wearer's right chest; layout on golden-ratio relationships (table in `MAP.md`). Fluid look: raking key light + fill, softer knit normal, 5 mm idle float with a breathing contact shadow (off under reduced motion), fade + full-turn on switch. One shirt canvas in memory at a time. Screenshots `screenshots/v7_*`.

- **2026-10-14 · Draft 8 (local, not pushed; awaiting Cloudy's review).** Jersey 2 front rebuilt to the committee's final design (IMG_8513): royal-blue collar and one-band cuffs, vertical black pinstripes from the collar (6 pins, fading behind Sriphat), navy/teal + gold crest (recoloured from the clean crest), mesh sides with a black -> black-maroon gradient, inner side line now curving toward the body instead of flaring out. Both jerseys: ASURA (gold) on the wearer's left sleeve (no price shown), AED4ALL + Progresso (white wordmarks) on the right sleeve, Bronze THB 5,000; "Medicine Football Club" under the back number. Found and fixed along the way: the old `sleeve-left` slot was on the wearer's right sleeve (swapped), the shoulder yoke shears logos (texture `rot` + placement). Verified with canvas captures (`screenshots/v8_*`), real taps on both sleeve hotspots on both jerseys at 1280x800 and 390x844 (cards show ASURA / AED4ALL + Progresso), zero console errors or warnings on load, jersey switch and taps. Details in MAP.md "Draft 8".

- **2026-10-14 · Draft 9 (local, not pushed).** Namo's review round. ASURA priced Bronze THB 5,000; AED4ALL and Progresso presented as two separate sponsors (separate partner entries, slot shows "AED4ALL · Progresso", price "for the shared spot"), ASURA sized like one single logo, Progresso never bigger than AED4ALL. Jersey 2 side panels solid black and about half as wide; new Jersey 3 (`#jersey-3`) with the panel areas left as plain damask, piping kept. All jerseys: athletic torso by runtime vertex deformation (chest +3.2 cm, abdomen -1.4 cm, slight waist taper, UVs untouched, normals via the Jacobian, shorts untouched), tunable via `BODY` / `__kit.body()`. Sleeve hotspot markers fixed (explicit `markAt`). Verified with canvas captures `screenshots/v9k_*` (before/after profile, J2/J3 front and 3/4, sleeve close-ups, 390 px selector, partners and sleeve taps on all three jerseys), zero console errors.

- **2026-10-14 · Draft 9 round 2.** Torso now a flat chest plate (+1.5 cm) with a flat abdomen (no lobes); side panels end in pointed lens shapes top and bottom with smooth lines (no hooks, no black outside the piping); partner logo plates equal height. Shots `screenshots/v9k_*`.

- **2026-10-14 · Draft 10 (local, not pushed).** Back line now "Medicine CMU Football Club" on all jerseys; damask 1.7x finer (22 -> 12.9 cm repeat) with the tile's banding removed so no plaid grid shows. Shots `screenshots/draft10_*`.

## Open / next
- Push the pending wording commit (`git push`), then confirm it's live.
- Namo tests on a real phone: spin, pinch zoom, one-finger pan when zoomed, tap a spot.
- Crest colour: design shows teal/navy + gold, ours is green; needs a clean crest source. Optional: a higher-res crest (605 px source), an away kit (black/white, in the proposal), real squad-size and match stats.
