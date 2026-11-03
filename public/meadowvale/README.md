# Meadowvale

Meadowvale is an original browser-based farming and life simulation inspired by
countryside farming games. It includes an explorable farm, farming tools, crops,
NPCs, weather, seasonal palettes, shops, festivals, fishing, and local saves.

The project uses original code, maps, names, systems, and fallback artwork. It is
not an asset, map, save, or source clone of any commercial game. Add only textures
and sprites that you created or have permission to distribute.

## Features

- Tile-based farm map with a scrolling camera
- Player movement and animated original sprite-sheet support
- Hoe, watering can, seeds, axe, and pickaxe tools
- Tilled and watered soil states
- Timed crop growth and harvesting
- Energy, clock, seasons, and day progression
- Coin economy, inventory hotbar, shops, and NPC dialogue
- Friendships, community screen, fishing, weather, and festivals
- Spring, summer, fall, and winter palettes
- Optional custom PNG terrain, building, object, crop, and character textures
- Nearest-neighbor pixel rendering and frame-depth sorting
- FPS counter, browser saves, tutorial, and backstory

## Play locally

No build tools or dependencies are required.

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

You can also open `index.html` directly in a modern browser.

## Controls

| Input | Action |
| --- | --- |
| WASD or arrow keys | Move |
| Left mouse click | Use the selected tool |
| 1-6 | Select a hotbar slot |
| E | Talk to the shopkeeper |
| P | Fish |
| C | Open the community panel |
| Y | Play the festival activity |
| T | Sleep and advance the day |
| F | Save the farm |

## Custom textures

Place original or licensed PNG files in the matching folders under
[`assets/textures/`](assets/textures/). Missing files automatically fall back to
the built-in procedural artwork.

Character sprite sheets belong in `assets/textures/characters/`. Each sheet should
be a transparent grid of 16 x 32 pixel frames:

- 4 columns
- 4 rows
- Idle frame plus walking frames in the columns
- Down, up, right, and left rows

See [`assets/textures/README.txt`](assets/textures/README.txt) for filenames and
folder requirements.

## Rendering architecture

- Canvas uses a fixed logical tile size with nearest-neighbor pixel output.
- Camera-aware world coordinates support a scrolling map.
- Movement uses delta time so travel remains consistent across frame rates.
- Visible map tiles are the only terrain tiles drawn each frame.
- Trees, rocks, crops, NPCs, and the player are sorted by world depth.
- Static procedural textures are cached when possible.
- Weather and visual effects scale independently from simulation updates.

## Optional Stardew mod files

The repository also contains an SMAPI installer package and a Content Patcher
scaffold for an authorized local Stardew Valley installation. These files do not
provide copyrighted game assets or modify Meadowvale's core browser rendering.

Use Stardew texture content only when you own it and comply with its licensing,
redistribution, and upload rules.

## Project structure

- `index.html` — game page, menus, HUD, tutorial, and controls
- `styles.css` — interface and pixel-art presentation
- `game.js` — rendering, input, simulation, saves, weather, and gameplay
- `assets/textures/` — optional custom PNG artwork
- `[CP] Harmony Pastoral/` — optional Content Patcher scaffold
- `smapi-installer/` — official installer package supplied for local mod setup

## Development status

This is an actively developed original prototype. Upcoming work includes richer
sprite animation, static-world caching, additional seasonal variations, sound,
and broader save compatibility.

## License and content

Meadowvale's original code and fallback artwork may be used according to the
repository license. Commercial game names, proprietary maps, extracted textures,
sprites, fonts, music, and UI graphics must not be redistributed without explicit
permission from their respective rights holders.
