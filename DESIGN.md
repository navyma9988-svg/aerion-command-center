---
version: alpha
name: "AERION Command Center"
description: "A mobile-first DFW airfield operations console with the precision and restraint of a night-flight instrument panel."
colors:
  background: "#0A0D14"
  surface: "#11151F"
  raised: "#1A1F2B"
  primary: "#E7B94A"
  critical: "#E76757"
  caution: "#E7B94A"
  normal: "#4FD39A"
  info: "#5ABCEB"
  foreground: "#F6F7F9"
typography:
  sans:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
rounded:
  DEFAULT: "1rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
spacing:
  control-min: "2.75rem"
  page-gutter: "1rem"
  section-gap: "1rem"
  page-max: "64rem"
components:
  button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  dialog:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  drawer:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  navigation:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  radar:
    backgroundColor: "{colors.background}"
    textColor: "{colors.info}"
    rounded: "{rounded.xl}"
  select:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  toast:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  status-critical:
    textColor: "{colors.critical}"
  status-caution:
    textColor: "{colors.caution}"
  status-normal:
    textColor: "{colors.normal}"
---

# AERION Command Center Design System

## Overview

### Creative North Star

A precision airfield instrument at 04:00: dark anodized surfaces, illuminated runway markings, dim glass overlays, and exact operational typography. The interface should feel calibrated rather than decorated. The flagship signature is real DFW aerial imagery paired with surveyed vector geometry and a restrained surveillance sweep.

### Product context and register

- **Audience and primary job:** Airfield operators rapidly scan runway, terminal, disruption, and movement state during a live demonstration.
- **Target market(s) and evidence:** The product brief and deterministic dataset specify DFW airport operations in the United States.
- **Locale(s) and language policy:** English (`en-US`) UI. Operational timestamps display Central Time and compact aviation terminology.
- **Usage scene:** Primarily a 390×844 phone presented to an audience, with desktop support to 1440px. One-handed scanning, outdoor contrast, and zero-network demo reliability matter.
- **Register:** Product UI. Information density is operational and controlled; marketing effects are limited to launch and the Map hero.
- **Memorable signature:** AERION's runway-radar mark and the Aerial Ops display, where bundled public-domain 2022 USGS/USDA NAIP imagery sits beneath the existing surveyed DFW overlays.
- **Restraint:** Forms, alerts, status semantics, navigation, and recovery patterns remain familiar and quiet.
- **Anti-references:** Generic neon cyberpunk, glass on every surface, unlabeled icon controls, novelty charts, and commercial consumer-map chrome.
- **Token ownership/runtime mapping:** This file mirrors the canonical runtime tokens in [`src/styles.css`](src/styles.css). CSS remains the authoring source; any token change must update both files in the same commit. `premium-ui.json` records canonical control ownership.

## Colors

The base, surface, and raised tokens form one near-black night-ops family. Gold is the only brand and primary-action accent. Red, amber, green, and blue are reserved for critical, caution, normal, and information states. Borders use the runtime seven-percent white hairline rather than a second visible palette. Focus uses the gold ring. The optional daylight theme maps the same semantic roles to accessible light values; forced-colors mode returns control to the operating system.

## Typography

Inter owns all interface copy. JetBrains Mono is restricted to callsigns, runway identifiers, timestamps, wind, and metrics, with tabular numerals. The core scale is 28/22/17/15/13px; metadata may use 12/10px only when paired with a larger accessible target. Headings use 600–700 weight and tight tracking. Uppercase is reserved for terse operational labels.

## Layout

The phone baseline is 390×844 with a 16px page gutter, 16px section rhythm, safe-area-aware fixed header and bottom dock, and 44px minimum controls. The desktop content rail begins at `lg` and the page caps at 64rem. Horizontal filter rails keep a visible thin scrollbar. Map imagery reserves the exact 1200×762 SVG world geometry so changing display modes never shifts controls or overlays. The reproducible asset record is [`public/dfw-aerial-usgs-naip-2022.source.txt`](public/dfw-aerial-usgs-naip-2022.source.txt).

## Elevation & Depth

Hierarchy comes from tonal surfaces, a seven-percent border, faint top-edge highlight, and one soft shadow token. Backdrop blur is limited to persistent chrome, map telemetry, sheets, and toasts. A vignette contains the Map hero. Nested cards and hard double borders are avoided.

## Shapes

Primary surfaces use 16–20px radii, controls use 12–16px, and compact status or filter chips may be fully rounded. The AERION mark uses a 12px rounded square enclosing circular radar geometry and a diagonal runway. Dividers are one-pixel semantic borders.

## Components

### Foundational visual states

Interactive elements expose default, hover, gold focus-visible, pressed scale `0.98`, disabled opacity/cursor, selected fill, and busy states without changing geometry. App loading uses the branded launch moment; list placeholders use the shared token shimmer. Empty states pair one icon with one sentence.

### Buttons and actions

Gold fill is reserved for the primary action. Secondary actions use tonal or hairline treatments. The shared `OpsButton` combines intent with emphasis and uses a calibrated 12px rectangular control shape instead of default pill geometry. Status colors communicate status, not general emphasis. Icon-only controls remain 44px and require an accessible name. Destructive actions remain separated and explicitly labeled.

### Navigation and data display

Mobile navigation uses the safe-area bottom dock; desktop uses the icon rail with accessible labels. Route transitions share the subtle slide/fade. Operational lists keep dividers quiet and numerical columns tabular. The Pulse hero uses a compact surveyed-geometry surface-surveillance preview as its single graphic signature. The Map display switch is a two-option authored button group; overlay and traffic controls use full-width segmented grids rather than floating pills. Dense triage filters live in one command console with one visible option bank at a time instead of stacked pill carousels.

Contextual quick actions stay behind one 48px mission launcher on content routes. The Map moves that launcher into its header so no global button sits over surveyed runway content; the action menu and operations remain shared.

### Forms and overlays

The existing Radix/shadcn primitives own dialogs, drawers, sheets, toasts, and authored selects. Existing simple owner/impact selects and quiet-hour time controls intentionally remain native because platform-owned popups are acceptable for this demo. Textareas are fixed-size (`resize-none`) with sufficient initial rows. The global layer scale in `src/styles.css` owns overlays.

### Iconography

Lucide is the UI icon family at 16–20px with default stroke weight. The custom AERION brand mark is the only exception. Icons support labels rather than replacing unfamiliar operational actions.

### Motion

Micro-interactions use 150–200ms ease-out; route content uses a 190ms slide/fade; the active dock icon uses a short spring. The radar sweep is slow and stateful, and the aerial view reduces its intensity. Every animation collapses under `prefers-reduced-motion`.

### Content and data visualization

Voice is concise, calm, and aviation-specific. Times include CT where context requires it. Runway IDs, callsigns, winds, zoom, and metrics use mono/tabular figures. Map status is never color-only: labels, ARIA descriptions, patterns, and detail panels preserve meaning.

## Do's and Don'ts

- **Do:** Make every visual flourish reinforce geography, live status, or operator confidence.
- **Do:** Preserve the surveyed runway constants and deterministic simulation behavior.
- **Don't:** introduce new raw colors, heavy mapping dependencies, network-only demo paths, or screen-local design systems.
- **Don't:** use red as branding, hide scrollbars, reduce touch targets, or trade legibility for radar atmosphere.
