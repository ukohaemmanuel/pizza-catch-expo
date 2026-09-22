# Plating desk

A one-screen Expo playtest: plate a pizza from the mise rail.

This is **v1 playtest only** — one dish (pizza), emoji tokens, a single ~30 second round. There is no menu, shop, or extra dishes.

## How to run

```bash
npm install
npx expo start
```

Then:

- Scan the QR code with **Expo Go** on a phone (Expo SDK 54), or
- Press `w` for web, or
- Press `a` / `i` for Android / iOS simulators.

## What the playtest is

A quiet kitchen desk. A white plate sits in the centre. Ingredients arrive on a mise rail. You plate or discard them before the oven glow goes out.

1. **Recipe card (~1.2s):** plate silhouette with empty slots 🫓 🍅 🧀, then it fades.
2. **Rail:** tokens feed one after another (short queue of up to 3).
3. **Oven glow:** a dim amber well. When it empties, the round freezes.
4. **Summary:** plated plate + Clean / Solid / Messy / Ruined + one chef line + Replay.

Must-haves: dough 🫓, sauce 🍅, cheese 🧀  
Junk: banana 🍌, ice cream 🍦

## Controls

- **Drag a token onto the plate** (or a slot) to accept it.
- **Flick / swipe it off the rail** to reject it.
- The plate does not move. There is no catching pan.

## Scoring

Start at 0.

- Correct onto plate: **+100**; extra of a type already on the plate: **+50**
- Junk onto plate: **−150** and a visible stain
- Reject junk: clean (no penalty)
- Reject a still-needed must-have: no immediate penalty; empty slots still cost at time-up
- Time up: **−100** per empty required slot

| Finish | Rule |
| --- | --- |
| **Clean** | All 3 types, 0 junk (old S / A) |
| **Solid** | All 3 types, at most 1 junk |
| **Messy** | 2 of 3 types |
| **Ruined** | Fewer than 2 types, or 2+ junk |

Demo capture: `docs/playtest.mp4`
