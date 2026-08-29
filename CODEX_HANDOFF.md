# AERION Command Center — Codex Visual Polish Brief

Mobile-first airfield-operations demo (React + Vite + Tailwind + TS), two-way synced with Lovable. OBJECTIVE: make this the most impressive mobile app demo possible — pristine, professional, flagship-iOS polish (Flighty / Linear quality bar). It will be demoed on a phone; every screen must look intentional and finished.

## Hard guardrails
- The app is a self-running demo simulation: data, routes, and simulation logic must behave identically after changes. Purely visual/UX additions are welcome; features that alter data or logic are not.
- - Never restructure the repo (no file moves/renames, no framework swaps, no heavy new dependencies) — Lovable sync depends on the layout.
  - - Design tokens (index.css + tailwind config) are the single source of truth. No one-off hardcoded colors.
    - - The Map radar uses true surveyed DFW runway geometry — do not alter geometry constants.
      - - Keep WCAG 2.1 AA: contrast, focus rings, 44px targets, radar ARIA labels + live region.
       
        - ## Design system (extend, never fork)
        - - Inter for all UI text; JetBrains Mono only for operational values (times, runway IDs, callsigns, metrics). Scale 28/22/17/15/13, headings 600–700, tight tracking.
          - - Dark night-ops: #0A0D14 base / #11151F surface / #1A1F2B raised. ONE gold/amber brand accent (primary actions, active nav, hero numbers). Semantic colors strictly for status: red critical, amber caution, green normal, blue info.
            - - Surfaces: 16–20px radius, 1px ~7% white border, faint top-edge highlight, soft shadow.
             
              - ## Tasks, in priority order (small commits, one concern each)
              - 1. Motion & feel: consistent 150–200ms ease-out on every interactive element; press scale 0.98; shared page transition (subtle slide+fade between tabs); staggered list entrance; animated number count-ups; spring on the bottom dock. Respect prefers-reduced-motion.
                2. 2. Screen-by-screen sweep (Pulse, Queue, Map, Alerts, Brief, Live): normalize spacing rhythm, icon sizes, timestamp treatment, divider usage; kill leftover harsh borders, double-nesting, misaligned baselines. Pixel-level pass at 390px.
                   3. 3. Quiet the red dashed closure strip under the header into a refined 2px gradient hairline with a compact label.
                      4. 4. Pulse hero card: slow (8s+) animated gradient border only while status is degraded; large-numeral stats with tabular figures.
                         5. 5. Radar finish: subtle edge vignette, softer data-block halos, longer sweep decay, smoother zoom easing. Keep a11y intact.
                            6. 6. Demo-impressiveness additions (presentational only): branded splash/loading moment; polished pull-to-refresh on feeds; token-styled shimmer skeletons; refined empty states (icon + one line); toast redesign pass; PWA manifest + app icon + theme-color + iOS status-bar/safe-area treatment so it installs to a home screen and launches full-screen like a native app.
                               7. 7. Final a11y & QA pass: WCAG AA contrast, visible focus rings, 44px touch targets.
                                 
                                  8. ## Verification per commit
                                  9. npm run build and tsc --noEmit clean; no console errors; check 390px and 1280px; tab through changed screens. Intentional deviations: explain in commit body prefixed DEVIATION:. Every push is reviewed by Claude Code before publish.
