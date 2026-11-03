# Retro Game Launcher

A browser-based collection of four original retro games: Stack Shift, Void Patrol, Meadow Run, and Meadowvale.

## Included Games

| Game | Genre | Highlights |
| --- | --- | --- |
| Stack Shift | Tetris-inspired puzzle | Falling pieces, scoring, levels, ghost piece, next piece |
| Void Patrol | Space Invaders-inspired shooter | Waves, shields, enemy health, lives, increasing difficulty |
| Meadow Run | 8-bit platformer | 100 levels, four biomes, coins, enemies, power-ups, lucky blocks |
| Meadowvale | Farming adventure | Farming, crafting, exploration, seasons, NPCs, shops, and saves |

## Local Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, typically `http://localhost:5173`.

Create a production build with:

```bash
npm run build
```

The generated site is written to `dist/`.

## Controls

### Stack Shift

- `Left` / `Right`: Move
- `Up` or `X`: Rotate clockwise
- `Down`: Soft drop
- `Space`: Hard drop
- `P`: Pause or resume

### Void Patrol

- `A` / `D` or arrow keys: Move
- `Space`: Fire
- `P`: Pause or resume

### Meadow Run

- `A` / `D` or arrow keys: Move
- `Space`: Jump
- `P`: Pause or resume

### Meadowvale

- `WASD` or arrow keys: Move
- Left mouse button: Use selected tool
- `1`-`6`: Select inventory slot
- `E`: Talk
- `P`: Fish
- `C`: Community menu
- `Y`: Festival activity
- `T`: Sleep
- `F`: Save

## Project Structure

```text
src/                    Arcade launcher and game modules
public/meadowvale/      Standalone Meadowvale build and assets
.github/workflows/      Automatic GitHub Pages deployment
vite.config.js          Public site base configuration
```

## Deployment

The repository can publish automatically to GitHub Pages through `.github/workflows/deploy.yml`. Every push to the `second` branch builds the project and deploys `dist/`.

The public project URL will be:

`https://iamhim6790.github.io/rocket-league/`

## Assets and Ownership

Stack Shift, Void Patrol, and Meadow Run use original browser-generated artwork and code. Meadowvale uses the project's original assets and should only include textures, sprites, and other media that the creator owns or is permitted to distribute.
