# Engineer Handoff: Home Card Stability And Taiji Upgrade

Date: 2026-08-16
Scope: Home 8 entry cards, Taiji system card, mobile smoothness, visual comfort, customer stickiness.

## Priority

1. Stability first.
2. Mobile smoothness second.
3. Visual sensory quality third.
4. Add no heavy effects unless build, mobile scan, and screen health stay green.

The product direction is not "more animation." It is a stable, premium, touch-friendly mobile experience.

## Current Verified State

- `npm run build` passed.
- `npm run screen:health -- --no-repair` passed.
- Latest screen health: `HEALTHY (11/11)`.
- Home card mobile scan at 390px previously passed with `allCardsStable: true`.
- 8 entry routes were verified as HTTP 200:
  - `/match`
  - `/music`
  - `/nameology`
  - `/numerology`
  - `/insight`
  - `/bazi`
  - `/zodiac`
  - `/tarot`

## Files To Understand Before Changing

- `app/globals.css`
  - Contains the mobile steady pass for `.home-feature-launch`.
  - This is where shared home-card touch feel, reduced motion, and mobile visual rules live.

- `lib/performance-css.ts`
  - Runtime-injected performance guard.
  - Works with `AppStabilityGuard`.
  - Important body classes: `app-mobile-device`, `app-small-screen`, `app-low-power-device`, `app-lite-effects`, `app-scrolling`, `app-touching`, `app-stress-mode`.

- `components/AppStabilityGuard.tsx`
  - Adds the body classes above based on mobile, reduced motion, low CPU/memory, social browser, network, scrolling, touching, and long tasks.

- `components/TaijiSystem.tsx`
  - Taiji 3D canvas and motion logic.
  - Keep animation delta capped and mobile DPR guarded.

- `components/TaijiSystem.module.css`
  - Taiji card wrapper and visual shell.

## Rules For The Next Engineer

- Do not optimize one card by breaking the shared 8-card layout.
- Do not add continuous blur, large shadows, infinite shimmer, or high-frequency animation on mobile.
- Do not remove the stability guard classes unless replacing them with stronger coverage.
- Do not raise Taiji mobile DPR back to fixed `3` for all devices.
- Avoid layout changes that make `.home-feature-launch` content taller without re-running mobile scan.

## Safe Upgrade Pattern

1. Make one small visual or stability change.
2. Run:

```bash
npm run build
```

3. Start production locally:

```bash
npm run start
```

4. Run:

```bash
npm run screen:health -- --no-repair
```

5. Mobile-check the homepage at 390px:
   - exactly 8 `.home-feature-launch` cards
   - no horizontal overflow
   - each card height >= 80px
   - CTA height >= 40px
   - no console errors
   - Taiji canvas exists and is not blank

## Recommended Next Step

Add a lightweight automated homepage-card scanner script so future engineers can run one command after every visual change. The scanner should validate:

- card count
- tap target size
- overflow
- console errors
- route availability
- Taiji canvas quality attributes

Keep this as a report-only tool first. Do not make it auto-repair until the checks are trusted.
