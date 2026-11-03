# Era 3 · small fixes (4 points)

Era 3 looks great: keep everything else as it is (factory, train, barge, siding, citizens, style). I rendered the kit at ×1 and ×2 on the full map; only these four things need work. Same rules as before: offline, palette only, no new ramps, no restyle. Update `era3.js` / `pieces_b11.js` only where needed, then the self-check, the README and the offline files.

## 1. Oil derrick: it reads as a street lamp (main fix)
At ×1, alone or as a field of 5, the derrick looks like a lamp post: the tower is a 1-2 px line with no visible lattice, and `sig_derrick_crown` looks like a lamp shade. The pumpjack sprawls diagonally away from it.
- Make the tower a real **lattice pyramid**: about **8-10 px wide at the foot**, tapering to 2-3 px under the crown; 2 visible legs per face with X-bracing (use `H.truss` with 2 px legs, or draw it).
- A small **working platform** about a third of the way up, and a **doghouse** shed at the foot.
- Redraw `sig_derrick_crown` as a squat pulley block, not a cap.
- Keep the pumpjack **compact, beside the tower foot**, on the same tile.
- Test: a player must tell a derrick from a lamp post, the radio mast and a crane at ×1.

## 2. The oil corner is crammed, and it sits in the foreground
Factory 2 at (21,20), the fuel depot (22,22), the flare and the derricks (20-23, 22-23) overlap at the south tip of the pond, the first place the eye lands.
- Re-space the lots so no two Era 3 sprites overlap; derricks at least 1 tile apart.
- Move the oil field (derricks + depot) a little further from the pond and further north-east along the railway; if it doesn't fit, cap visible derricks at 4.
- Bunting and power wires are strung between the derricks: derricks are not power consumers, so remove the wires and garlands there.

## 3. Tank wagon reads as a dark blob
`veh_wagon_tank` in `soot` is nearly black at ×1. Give the tank a lighter body (a dyed or `oxide` ramp, by seed like the boxcars), a visible dome on top, and a lighter end band, so the cylinder reads.

## 4. Some modifiers are almost invisible (light touch)
Oxygen rack, titanium ingots, ANFO sacks and the machine-gun nest are barely visible at ×1. Make each one 1.5-2× bigger or give it one brighter accent tone. Don't redesign them.

## At the end
Say what changed, show before/after for the derrick, the oil corner on the full map and the tank wagon, and give the new lot positions.
