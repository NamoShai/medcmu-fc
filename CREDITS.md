# Credits

## 3D model
- **Paris Saint-Germain x Jordan Home Stadium Kit** by **PROXY** (https://sketchfab.com/proxy000000000), https://sketchfab.com/3d-models/paris-saint-germain-x-jordan-home-stadium-kit-1d43be1db93143ea8cc35bb5fb339ad1
- Licence: **CC-BY-4.0** (http://creativecommons.org/licenses/by/4.0/). Commercial use allowed, author must be credited. The credit line is shown in the site footer.
- Changes made: textures and socks removed, duplicate/coincident shells dropped, geometry simplified (about 99k triangles), UVs moved into one tile, recoloured and re-textured at runtime with the MEDCMU damask and logos. Result: `assets/kit.glb`. Rebuild with `models_src/build_kit_glb.mjs` and `models_src/make_trim.mjs` (the 80 MB source in `models_src/` is git-ignored and not deployed).

## Libraries
- three.js 0.160.0 (MIT), loaded from cdn.jsdelivr.net. Includes RoomEnvironment and the meshopt decoder.
- Inter, Cinzel and Noto Sans Thai (SIL OFL), loaded from Google Fonts.

## Club and sponsor artwork
Supplied by MEDCMU FC. Originals are in `assets/src/` (unchanged). Derived files in `assets/`:
`crest.png`, `sriphat.png`, `inseerhong.png` (backgrounds removed, blur patch cropped), `damask_tile.jpg`
(supplied damask photo, vignette flattened, recoloured to kit maroon, mirror-tiled so it repeats seamlessly).
Logos belong to their owners and are used here for a sponsor pitch only.

## Sponsor terms
Packages, prices, stats and contact come from `CMU_Medicine_Football_Sponsor_Proposal_2569.pdf` (MEDCMU FC).
