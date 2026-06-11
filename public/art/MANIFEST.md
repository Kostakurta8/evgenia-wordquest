# TODO: Art manifest — 40 images

Region banners + milestone scenes for `/public/art/`. Until generated, the UI
ships the gradient banners defined in `MapTrail.tsx` (REGION_GRADIENTS) — the
app is fully functional without these files.

**Style for every prompt:** painterly high-fantasy illustration, warm golden
light, soft edges, storybook quality, landscape only — **no named characters,
no movie likenesses, no logos** (IP-safe generic fantasy). Banner ratio 3:1
(1536×512), milestone scenes 1:1 (1024×1024).

## Region banners (20) → `art/region-{slug}.webp`

| # | slug | prompt |
|---|------|--------|
| 1 | prologue | cozy rolling green hills with little round doors in the hillsides, vegetable gardens, smoke from tiny chimneys, golden hour |
| 2 | long-expected-party | summer night garden party in a hobbit-like meadow, paper lanterns, long tables, distant fireworks blooming like silver trees |
| 3 | shadow-of-the-past | dim study lit by a single candle, an old map and a plain gold ring on a desk, embers in the fireplace, mood of secrets |
| 4 | three-is-company | three small travellers with walking sticks on a moonlit country road between hedgerows, fireflies, deep blue dusk |
| 5 | short-cut-to-mushrooms | misty farm fields at dawn, a muddy short-cut path through tall crops, a basket of mushrooms on a stile |
| 6 | conspiracy-unmasked | warm cottage interior at night, friends leaning over a candle-lit table with maps and packs ready by the door |
| 7 | old-forest | ancient mossy forest with enormous gnarled trees, shafts of green-gold light, roots like waves, faint path disappearing |
| 8 | house-of-tom-bombadil | merry cottage in a river valley, water lilies, washing line, rain passing while sun shines, impossibly green garden |
| 9 | fog-on-the-barrow-downs | rolling grey downs in thick fog, ancient standing stones, a cold barrow mound, pale sun like a coin |
| 10 | prancing-pony | rainy village crossroads at night, warm inn windows glowing, a painted wooden inn sign with a rearing pony, puddles reflecting lamplight |
| 11 | strider | shadowy corner of an inn common room, a hooded ranger figure (face hidden) with long legs stretched out, pipe smoke curling |
| 12 | knife-in-the-dark | ruined stone watchtower on a hilltop under cold stars, campfire sparks, ominous black shapes on the horizon |
| 13 | flight-to-the-ford | white-watered river ford between autumn trees, a sense of speed and pursuit, spray rising like galloping horses |
| 14 | many-meetings | serene elven valley with waterfalls and slender bridges, autumn leaves, lanterns among the trees, a house of carved wood |
| 15 | council-of-elrond | sunlit stone terrace with a circle of carved chairs, autumn valley below, a small pedestal at the centre |
| 16 | ring-goes-south | nine travellers as tiny silhouettes crossing high snowy mountain country, enormous peaks, cold blue light |
| 17 | journey-in-the-dark | colossal underground hall with rows of carved pillars vanishing into darkness, one faint staff-light |
| 18 | bridge-of-khazad-dum | narrow stone bridge over a black abyss, glow of fire rising from below, crumbling stairs, drama and dread |
| 19 | lothlorien | golden-leaved forest with silver tree trunks, platforms high in the canopy, soft starlight mixed with gold |
| 20 | mirror-of-galadriel | starlit glade with a silver basin on a pedestal, water like liquid mirror, white lanterns among dark trees |

## Milestone / celebration scenes (20) → `art/scene-{n}.webp`

| # | prompt |
|---|--------|
| 21 | treasure chest overflowing with gold coins and gems in a mossy forest clearing, sunbeam |
| 22 | tiny glowing firefly with cute face flying over an open ancient book, sparkles |
| 23 | parchment map with a winding red-dotted path, compass rose, tiny landmarks |
| 24 | fireworks over rolling hills at night, crowd of tiny silhouettes celebrating |
| 25 | golden trophy made of intertwined leaves on a stone pedestal, soft light |
| 26 | mountain summit at sunrise above a sea of clouds, small flag planted |
| 27 | cozy reading nook with candle, tea, and a thick red book, rain on window |
| 28 | constellation of stars forming a crown in a deep blue night sky |
| 29 | river journey in slender canoes at dusk, lanterns reflected in water |
| 30 | field of fireflies rising from tall grass at twilight |
| 31 | ancient stone archway covered in ivy, golden light pouring through |
| 32 | a quill writing glowing letters on parchment by itself |
| 33 | small campfire with kettle under enormous starry sky |
| 34 | white stone city on a hill at dawn, banners in the wind (generic, no heraldry) |
| 35 | garden of giant glowing mushrooms in a dark forest |
| 36 | snowy pine valley with a winding frozen river, aurora overhead |
| 37 | library hall with floating dust motes in sunbeams, ladders on rails |
| 38 | golden key on a velvet cushion in a beam of light |
| 39 | flock of white birds over autumn forest, one golden leaf falling |
| 40 | sunrise over the sea seen from a white ship's prow, gulls (generic) |

Generate via any image model (e.g. Higgsfield GPT Image), save as webp ≤200KB
each, then wire region banners into `MapTrail.tsx` (replace the gradient
`backgroundImage` with the image when present).
