# pERgatory

A Game Boy–style RPG. You are Dr. Malphas, a demon sentenced to the eternal night shift in a purgatory ER. Battles are patient encounters that drain your **sanity** and **self-respect**. There is no winning; if either hits zero, the shift starts over.

## Run

No build step. Serve the folder and open http://localhost:8418:

```
python serve.py
```

## Controls

| Key | Button |
| --- | --- |
| Arrows / WASD | D-pad |
| Z / Space | A |
| X / Esc | B |
| Enter | Start (menu) |
| Shift | Select (palette) |
| M | Mute |

## Layout

- `js/gfx.js` – palette, sprites, bitmap text, UI boxes
- `js/audio.js` – chiptune SFX and music (WebAudio)
- `js/sprites.js` – overworld sprites and procedural battle portraits
- `js/world.js` – ER and surgical-floor maps, NPCs, interactable fixtures
- `js/patients.js` – regular patients, moves, items
- `js/walkins.js` – walk-in cases based on real ER and 911 stories
- `js/clinic.js` – patient deck, random walk-in people
- `js/battle.js` – text box and battle system
- `js/main.js` – input, game state, overworld, menus, main loop
