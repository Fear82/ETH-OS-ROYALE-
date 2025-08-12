# ETHOS ROYALE

Welcome to **ETHOS ROYALE**, a thrilling 2D action game built with JavaScript and HTML5 Canvas! Battle three unique enemies in a dark, moonlit forest, using powerful $AIR attacks and devastating nukes. Dodge enemy projectiles, collect health pickups, and survive the onslaught under the glow of purple and red moons.

## How to Play
### Controls
- **Arrow Keys**: Move left or right.
- **SPACE**: Jump (double-tap to jump after landing).
- **R**: Fire $AIR projectile (30 damage, 2-second cooldown).
- **E**: Launch a nuke (5-second cooldown).
- **G**: Drop all stored nukes to target random locations.
- **SPACE (on start screen)**: Begin the game.
- **R (on game over/victory)**: Restart the game.
- **Q (on game over/victory)**: Quit (closes the window).

### Gameplay
- **Objective**: Defeat three enemies, each stronger than the last:
  - **Enemy 1** (200 health): Fires purple sword projectiles.
  - **Enemy 2** (500 health): Fires red spear projectiles.
  - **Enemy 3** (1000 health): Fires red fireball projectiles.
- **Health**: Your health (100 max) is shown at the top-left. Enemies’ health is above them.
- **Health Pickups**: Collect up to 2 red heart pickups (1–50 health) that spawn every 5–15 seconds.
- **Nukes**: Launch nukes with E (they ascend and store at the top). Drop them with G for explosive damage (50 to enemies and player in a 75-pixel radius).
- **$AIR**: Your primary attack (R) deals 30 damage per hit.
- **Avoid Projectiles**: Dodge enemy attacks (15/20/25 damage for Enemies 1/2/3).
- **Game States**:
  - Start: Press `SPACE` to begin.
  - Game Over: If your health reaches 0.
  - Victory: Defeat all three enemies.

## Tips
- Use $AIR (R) for steady damage, save nukes (E/G) for critical moments.
- Stay mobile with arrow keys and jumps to avoid enemy projectiles.
- Grab health pickups to survive longer.
- Watch the nuke counter (top-right) to track stored nukes.

## License
**ETHOS ROYALE** is licensed under the MIT License. This means you can play, share, and modify the game, but you must include the license and copyright notice. See below for details:
