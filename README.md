# Pizza Catch

A one-screen Expo playtest: catch pizza ingredients in a pan.

This is **v1 playtest only** — one dish (pizza), emoji art, a single ~30 second round. There is no menu, shop, or extra dishes.

## How to run

```bash
npm install
npx expo start
```

Then:

- Scan the QR code with **Expo Go** on a phone (this project uses Expo SDK 54, which matches current Expo Go), or
- Press `w` for web, or
- Press `a` / `i` for Android / iOS simulators.

## What the playtest is

1. **Opening flash (1.5s):** title “Make a Pizza” plus 🫓 🍅 🧀, then it hides.
2. **Catch rain:** ingredients fall one at a time. Drag the pan along the bottom to catch them.
3. **Timer:** 30 seconds. When it hits zero the round freezes and a grade modal appears.
4. **Replay:** start the same pizza round again.

Must-haves: dough 🫓, sauce 🍅, cheese 🧀  
Junk: banana 🍌, ice cream 🍦  
Pan: 🍳

## Controls

Drag horizontally anywhere on the kitchen board. The pan only moves on the X axis.

## Scoring & grades

Start at 0.

- Catch a must-have the first time: **+100**
- Catch that type again: **+50 extra topping**
- Catch junk: **−150** (contaminated)
- Time’s up: **−100** for each must-have type you never caught
- Missing an ingredient on the floor only matters if you still needed that type (the time-up penalty)

| Grade | Rule |
| --- | --- |
| **S** | All 3 types, 0 junk, score ≥ 300 |
| **A** | All 3 types, 0 junk |
| **B** | All 3 types, 1 junk |
| **C** | 2 of 3 types |
| **Fail** | Fewer than 2 types, or 2+ junk |

The grade screen lists a plain summary (for example `Dough ✓ Sauce ✓ Cheese ✗ Junk: banana ×1`), the score, the grade, and **Replay**.
