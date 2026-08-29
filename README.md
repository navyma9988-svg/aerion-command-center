# AERION Command Center

## Goal
Create a comprehensive Lovable prompt that generates **AERION Command**, a high-fidelity, mobile-first responsive airport operations demo web app for AER International. The demo must function as an installable PWA-style app with app-like full-screen behavior, optimized for real mobile usage, while also delivering an exceptional visual and interactive experience on desktop. The core objective is to produce a polished, immersive, and credible airport control center experience that prioritizes mobile ergonomics, rapid information scanning, and tactile interactions, with signature visual flourishes and storytelling elements.

> **Treat the provided example as raw material, not a boundary.** Lovable should proactively study, preserve effective elements, but reimagine weak, dated, or desktop-centric areas for mobile-first contexts. Add signature features, interactions, and visual flourishes that serve a clear purpose, enhance storytelling, and elevate the demo’s credibility and visual impact.

## Context and Details
Act as an elite senior product designer, UX strategist, frontend developer, and visual artist tasked with elevating the demo into a compelling, believable, and memorable airport control app optimized for mobile-first use. The demo must:

- Be designed primarily for mobile screens with a target viewport of 390×844px, supporting smaller mobile (360px wide), tablet (768×1024px), and desktop (1440px wide) breakpoints.
- Support installable PWA behavior, full-screen presentation, safe-area support, and thumb-zone ergonomics.
- Incorporate mobile-specific UI patterns:
  - Bottom navigation bar at the safe thumb zone
  - Swipeable flight cards and terminal views
  - Pull-to-refresh gestures
  - Bottom sheets for filters and detailed info
  - Tappable, expandable flight and terminal cards
  - Tactile pressed states, skeleton loading, offline/demo data mode
  - Responsive charts and tables optimized for small screens
- Use a clear, mobile-friendly information architecture:
  - Home/Live, Flights, Map, Alerts, and More sections
  - Desktop navigation rail only at larger breakpoints (≥1024px)
- Ensure no horizontal overflow, tiny text, hover-only controls, or dense desktop-only interactions
- Design for one-handed use, rapid scanning, outdoor/bright-light contrast, and accessibility:
  - Keyboard navigation, screen-reader support
  - Minimum 44×44px touch targets
  - Readable contrast and font sizes
- Implement realistic mobile interactions:
  - Tap flight cards to open detail sheets
  - Swipe between arrivals and departures
  - Filter flights via bottom sheet
  - Acknowledge alerts
  - Expand terminal health info
  - Open command search
  - Toggle disruption simulation
- Include a polished, fast-loading “wow sequence” on app launch that respects reduced motion preferences
- Use React + TypeScript + Tailwind + shadcn/ui, with responsive components and deterministic mock data
- Reinterpret the reference example for mobile context, emphasizing rapid, tactile, and scan-friendly design rather than desktop layout replication
- Ensure responsiveness and usability across all target devices, with acceptance testing at 390×844, 360×800, 768×1024, and 1440×900 resolutions

Design must deliver a premium, native-like airport operations app experience within a browser-based demo, emphasizing clarity, visual impact, and storytelling.

## Output Format
A single, detailed Lovable prompt, including all specifications, constraints, and directions, ready to be pasted directly into Lovable. The prompt must:

- Clearly state the product name **AERION Command** and its core concept as a mobile-first, app-like airport operations demo
- Emphasize the creative directive: study the reference example, preserve effective elements, but reimagine weak, desktop-centric, or outdated areas for mobile-first, tactile, and rapid information scanning experiences
- Specify layout, visual style, content, interactions, and technical details exhaustively, with a focus on mobile ergonomics and responsiveness
- Include explicit instructions for signature moments, signature interactions, and signature visual flourishes that make the demo memorable and tactile
- Lock in scope: focus solely on creating a realistic, high-quality, mobile-first demo experience with functional, persuasive controls and content
- Prioritize clarity, visual impact, and credibility, ensuring every control is functional and every element supports storytelling
- Incorporate microcopy that is concise, professional, and aviation-specific
- Provide a strict acceptance checklist covering:
  - Visual polish at 1440px desktop and 390×844px mobile resolutions
  - Responsiveness and usability on all target devices
  - Accessibility (WCAG AA, keyboard, screen-reader)
  - Interaction smoothness and polish
  - No broken or placeholder elements
  - Realistic, persuasive airport data and microcopy
  - Overall coherence, storytelling, signature airport theme

Iterate until the demo feels like a seamless, highly realistic, premium native airport app experience, optimized for mobile but also stunning on desktop.

```plaintext
<output_verbosity_spec>
Create a comprehensive Lovable prompt that generates **AERION Command**, a high-fidelity, mobile-first responsive airport operations demo web app for AER International. The demo must function as an installable PWA-style app with app-like full-screen behavior, optimized for real mobile usage, supporting a target viewport of 390×844px, as well as smaller mobile (360px wide), tablet (768×1024px), and desktop (1440px wide) screens. The design should prioritize thumb-zone ergonomics, safe-area support, and tactile interactions, including bottom navigation, swipeable flight cards, pull-to-refresh, bottom sheets, and expandable info panels. The layout must be mobile-optimized but also look exceptional on desktop, with no horizontal overflow, tiny text, or hover-only controls.

Design a sleek, minimal, premium visual style inspired by midnight airport control centers, blending warm ivory surfaces (#FAFAFA), amber runway lights (#FFC107), cyan accents (#00B0F0), and coral alerts (#FF6F61). Use Space Grotesk for UI text (weights 500, 700; sizes 14px–24px) and IBM Plex Mono for operational data (sizes 12px–16px). Maintain an 8px grid, consistent margins, paddings, radii (4px, 8px, 12px), layered subtle shadows, and Lucide icons styled to match the palette. Implement smooth micro-interactions with reduced motion fallback, tactile pressed states, skeleton loading, offline/demo data, and responsive charts/tables.

Prioritize signature interactions:
- Mobile-optimized, tactile flight cards with tap-to-expand details
- Swipe gestures for navigating between arrivals and departures
- Bottom sheet filters and info panels
- Tap to acknowledge alerts
- Expand/collapse terminal health info
- Open command search with smooth focus
- Toggle disruption simulation with tactile feedback
- Signature airport-themed visual flourishes, such as animated runway lights or dynamic delay signals

Ensure responsiveness across all devices, with particular attention to one-handed use, outdoor/bright-light contrast, and rapid scanability. Use microcopy that is concise, professional, and aviation-specific, avoiding placeholders or generic content.

Treat the provided example as raw material, not a boundary. Lovable should study, preserve effective elements, but reimagine weak, outdated, or desktop-centric areas for mobile-first, tactile, and rapid information scanning experiences, adding signature features and visual flourishes that serve storytelling and credibility.

Create a demo that feels like a full senior design team—product strategy, UX, visual design, motion, data visualization, and frontend engineering—collaboratively reimagined into a seamless, memorable, and highly realistic airport app experience.

Provide a strict acceptance checklist covering:
- Visual polish at 1440px desktop and 390×844px mobile
- Responsiveness and usability on all target devices
- Accessibility (WCAG AA, keyboard, screen-reader)
- Interaction smoothness and polish
- No broken or placeholder elements
- Realistic, persuasive airport data and microcopy
- Overall coherence, storytelling, and signature airport theme
</output_verbosity_spec>
```

connect any tools, plugins, connectors, skills, mcps, cli to make this better i authorize any

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/36c1879e-7bfd-4c76-a642-7b2d62b6ca6f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
