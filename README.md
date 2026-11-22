# heist-game-makefun

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/katsuo023dev-collab/heist-game-makefun/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/katsuo023dev-collab/heist-game-makefun/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Gilded Hush** is a top-down stealth heist in three jobs: a gallery, a bank and a museum.
Read the guards' patrol routes and the cameras' sweeps, slip through violet shadow cover,
crack the display case, and reach the getaway van before the alarm meter fills.

- Guards walk routes, glance at corners, investigate noises, chase what they see and search where they lost you.
- Cameras sweep on a timer; their cones flush red the instant they see you.
- Laser tripwires gate the vaults: they blink on a timer and flicker just before they return. Break a live beam and the alarm jumps while every nearby guard comes running.
- Tools cost cash off your take: smoke blocks sight, a coin lures guards, a jammer blinds a camera or kills a laser.
- Shadows make you three times harder to notice; sprinting is fast but guards hear it.
- Past 65% alarm the building goes into lockdown: guards hurry and every cone reaches further.
- Each getaway is scored: prize + trinkets - kit used - heat, rated Ghost, Shadow, Close Shave or Smash & Grab.

Controls: WASD / arrows move, Shift sprint, hold E to crack the case, 1-3 pick a tool, click to use it,
hold Tab for the plan view, Esc pause, R restart the job.

Plain canvas and ES modules under `game/`, no libraries, no network; every sound is synthesised with Web Audio.

## Run it

```sh
node serve.ts    # then open http://localhost:8080
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
