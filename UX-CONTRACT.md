# AERION Command Center UX Contract

## Product context

- **Audience:** DFW airfield operations staff and a live demo audience.
- **Primary jobs:** Scan current airfield state, inspect movements and terminals, triage disruptions, review actions, and present a credible deterministic operations story.
- **Target market and locale:** United States, English (`en-US`).
- **Time policy:** Operational times display Central Time; existing deterministic simulation time and data remain authoritative.
- **Accessibility target:** WCAG 2.2 AA, keyboard operation, visible focus, live status announcements, and 44px mobile targets.

## Business-context sources

| Domain / scope                                            | Authoritative source      | Source type                    | Reviewed date |
| --------------------------------------------------------- | ------------------------- | ------------------------------ | ------------- |
| Lovable synchronization and repository integrity          | `AGENTS.md`               | Repository contract            | 2026-08-30    |
| Product, routes, deterministic demo and responsive intent | `README.md`               | Product brief                  | 2026-08-30    |
| File-based route ownership                                | `src/routes/README.md`    | Framework contract             | 2026-08-30    |
| Surveyed DFW runway geometry                              | `src/lib/airfield-geo.ts` | Domain implementation contract | 2026-08-30    |

No permission, billing, retention, deletion, or legal workflow is introduced by this visual-polish scope.

## Visual contract

- `DESIGN.md` records normative visual intent and mirrors the existing runtime source.
- `src/styles.css` is the canonical token, motion, layer, and global scrollbar owner.
- Dark and daylight themes preserve the same semantic roles. Forced-colors behavior remains system-owned.
- Visual switches may change presentation only. They must not change the data, simulation, routing, selection, filters, or surveyed geometry.

## Canonical UI Map

| Capability     | Canonical owner                                                                                      | Source of truth                                                           | Allowed variants                 | Verification                          |
| -------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------- | ------------------------------------- |
| Button         | `src/components/ops-button.tsx` for operator workflows; shadcn Button for library-owned composition  | `DESIGN.md` + `src/styles.css`                                            | intent × emphasis × size         | keyboard + touch + state inspection   |
| Select/Listbox | Native controls for simple alert assignment; `src/components/ui/select.tsx` for authored popup needs | This contract + `DESIGN.md`                                               | native / authored                | keyboard + open-popup inspection      |
| Date           | Native time controls in notification preferences                                                     | This contract                                                             | native                           | locale + keyboard                     |
| Scrollbar      | Global application stylesheet                                                                        | `DESIGN.md` + `src/styles.css`                                            | visible thin geometry            | computed root style + narrow viewport |
| Toast          | Sonner and `NotificationToasts` shared providers                                                     | `src/components/ui/sonner.tsx` + `src/components/notification-center.tsx` | success / warning / info / error | live region + browser state           |

Native select and time popups are intentional where the operating-system popup is acceptable. Any workflow requiring authored popup geometry must use the maintained Radix/shadcn primitive rather than a custom ARIA implementation.

## Component behavior

- Enabled controls expose hover, focus-visible, pressed, selected, and disabled states through the shared tokens.
- Buttons and icon buttons retain at least 44×44px targets on mobile. Icon-only buttons have accessible names.
- Textareas use the shared fixed-size `resize-none` rule and enough rows for their task.
- The branded launch moment, skeleton shimmer, empty state, drawer, and notification patterns are shared rather than duplicated per route.

## Navigation and responsive behavior

- Each route owns an honest `{Page} — DFW Airfield Command` title through its route head metadata.
- Mobile uses the safe-area bottom dock; desktop uses the persistent icon rail. The current route remains programmatically marked.
- Drawers are the canonical mobile detail surface for terminals and flights, close with Escape through the maintained primitive, and restore focus through that primitive.
- Query-backed Map focus, terminal, and overlay state remains unchanged and restorable. The Aerial Ops/ASDE-X display preference is session-scoped presentation state only.
- The Map keeps visible non-drag zoom and recenter controls. Tab reaches runways, terminals, aircraft, and controls; Enter/Space activates terminals and aircraft.
- Persistent chrome and safe-area padding must not obscure focused content. Horizontal filter rails visibly scroll rather than clipping or hiding their scrollbar.

## Overlays and feedback

- Radix/shadcn Dialog, Sheet, and Drawer primitives own modal behavior. Sonner and `NotificationToasts` own toast/live feedback.
- The global layer tokens in `src/styles.css` define sticky, dropdown, popover, header, backdrop, dialog, sheet, command, and toast order. New page-local arbitrary overlay values are not allowed.
- Informational toasts are concise and transient; disruption banners link to the relevant triage surface and remain screen-reader announced.

## Async and resilience

- The demo is deterministic and locally simulated. Background feed refresh preserves visible content and never replaces the Map imagery with a network-only dependency.
- Aerial imagery is bundled. If it cannot render, the surveyed vector, status, filtering, keyboard, and detail interactions remain usable as the fallback display.
- The task introduces no mutation, retry, conflict, permission, or external-side-effect policy changes.

## Verification

- Required static checks: `npm run build`, `bun x tsc --noEmit`, Frontend Design Premium strict audit, and `designmd lint DESIGN.md`.
- Browser matrix: 390×844 and 1280×720, Aerial Ops and ASDE-X, dark theme, keyboard focus, no horizontal page overflow, visible scrollbar styling, 44px targets, and console error inspection.
- Reduced-motion behavior is owned by the global media query and must cover launch, route, dock, shimmer, brand sweep, and radar motion.
- Canonical sibling flows: existing Map focus/detail drawers, Alert filter rails, and app-shell navigation.
