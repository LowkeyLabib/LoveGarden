# Phaser migration

The feature build opens the playable Phaser garden at /. Sign-in, dialogs and writes use the existing app and Supabase permissions. Development and explicit `/?readonly=1` review links use an isolated anonymous session. Use `/?renderer=legacy&readonly=1` to compare the original renderer. The Vercel Git integration builds this branch as a Preview. Its branch-scoped `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be available at build time to show the saved garden.

| Feature | Existing source of truth |
| --- | --- |
| Plot, pond, gift and decoration slot IDs, projection and boundaries | garden/world.ts and Supabase slot tables |
| Seeds, land and aquatic species, watering, daylight growth, claim expiry, collection and removal | Supabase flower RPCs and migrations, lib/flowers.ts and lib/clock.mjs |
| Notes, captions, Spotify tracks, private photos and hidden gifts | Supabase RLS, open_memory, private storage and signed URLs in lib/api.ts |
| LovePoints, purchase receipts, inventory, placement, store, activity and milestones | Supabase transaction RPCs and public placements, React App and Forms |
| Solo, matching and Desi wardrobes, owner-specific equipment | Fashion RPCs, lib/api.ts, FashionBoutique, character and garment atlases |
| Couple routines, following, smoke scene, visits and action gestures | garden/characters.ts, useCharacters and CharacterSprite |
| Time, Angry, Rainbow and NoData modes | garden_clock and role-checked mode RPCs, React App |
| Touch, pointer, wheel, reset and bounds | garden/camera.ts |
| Day/night music, chime, Spotify ducking, reduced motion, install/update and offline shell | audio modules, App, Vite PWA |
| Authentication, guest restrictions and synchronization | Supabase Auth/RLS and App's existing realtime subscription |

Only the world view is replaced in the checkpoint. React owns dialogs, menus and audio. Phaser receives snapshots and owns one canvas, its animation loop, viewport and scene resources. The legacy renderer remains available for gameplay comparison. Security/economy tests run against in-memory PGlite. The shared SVG input layer uses the same view as the Phaser camera for pointer, touch and keyboard selection.

World checkpoint: the Phaser scene renders the original world anchors and public object snapshots with a native-resolution meadow, four tree crowns, glowing lamps, koi, petals and ripples. Regenerate the trees first with `node scripts/phaser-canopies.mjs`, then run `node scripts/phaser-meadow.mjs` to bake their shadows and pond reflections. Run `node scripts/phaser-materials.mjs` for the cottage, wood and soil artwork. For visual review, add `&view=overview` or `&light=day` / `&light=night` to the Phaser preview URL. Lighting overrides affect presentation only. Angry Mode switches terrain and uses the existing rain overlay and solitary character behavior.

Character checkpoint: Phaser draws the original portraits, garments and gesture frames in depth-sorted containers. The legacy and Phaser views share the same director, timeline and clothing selection. After editing the character art, run `node scripts/characters.mjs` followed by `node scripts/phaser-wardrobe.mjs` to rebuild the independently loadable outfit sheets.
