# MEDCMU FC Locker Room — progress log

Sponsor-pitch website: a 3D MEDCMU FC kit that sponsors spin, zoom and tap to see each placement and its price.
Live: https://namoshai.github.io/medcmu-fc/ · repo `NamoShai/medcmu-fc` (public, GitHub Pages from `main`) · architecture → `MAP.md`.

## Current state (2026-10-09)
- LIVE. Home kit only. Slots, tiers and prices from `CMU_Medicine_Football_Sponsor_Proposal_2569.pdf`: Gold THB 20,000 · Silver THB 10,000 · Bronze THB 5,000 per spot.
- Partners: **Sriphat Hospital CMU**, Gold, front chest (wearer's right) · **INSEERHONG GOLD**, Silver, back under the player number.
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

## Open / next
- Push the pending wording commit (`git push`), then confirm it's live.
- Namo tests on a real phone: spin, pinch zoom, one-finger pan when zoomed, tap a spot.
- Optional: white Sriphat logo (purple is weak on maroon), a higher-res crest (605 px source), an away kit (black/white, in the proposal), real squad-size and match stats.
