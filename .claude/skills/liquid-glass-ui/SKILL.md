---
name: liquid-glass-ui
description: Build React + Tailwind interfaces with an Apple-style "Liquid Glass" aesthetic — translucent, blurred, refractive surfaces with specular highlights and adaptive tinting. Use this skill whenever the user asks for liquid glass, glassmorphism, frosted glass, translucent/blurred UI, "efecto vidrio", iOS 26 / visionOS style, or wants cards, navbars, modals, sidebars, buttons, or dashboards that look glassy, premium, or Apple-like. Also trigger when styling any new component in a project that already uses this glass design system, even if the user doesn't say "glass" explicitly.
---

# Liquid Glass UI (React + Tailwind)

Design system for building "Liquid Glass" interfaces: layered translucent surfaces that blur and refract the content behind them, with soft specular highlights, hairline borders, and adaptive light/dark tinting. Inspired by Apple's Liquid Glass (iOS 26 / visionOS) but implemented with standard CSS + Tailwind so it works in any browser project.

## Core principles (apply to every component)

1. **Glass is a material, not a color.** A glass surface = translucent tint + `backdrop-filter: blur()` + saturation boost + hairline border + inner highlight. Never fake it with a flat semi-transparent gray alone.
2. **Glass needs something behind it.** Always place glass over a rich background (gradient mesh, image, or colorful content). Over a plain white/black page the effect dies — add a background layer first.
3. **Hierarchy through thickness.** More important/elevated surfaces get more blur and more opacity ("thicker glass"). Suggested tiers:
   - `glass-thin` — hover states, chips: blur 8px, bg white/5
   - `glass` — cards, panels: blur 16px, bg white/10
   - `glass-thick` — navbars, modals, popovers: blur 24–32px, bg white/15 + saturate(180%)
4. **One highlight source.** Simulate light from the top: a 1px inner top border of `white/40`–`white/60`, plus a subtle top-to-bottom white gradient overlay (`from-white/15 to-transparent`). Never light from two directions.
5. **Hairline borders, huge radii.** Border `1px` at `white/20` (light content) or `white/10` (dark). Radii are generous: `rounded-2xl`/`rounded-3xl` for cards, `rounded-full` for pills and buttons. Liquid Glass is never sharp-cornered.
6. **Motion feels liquid.** Transitions 200–400ms with `ease-out` or spring-like cubic-bezier(0.34, 1.56, 0.64, 1) for press effects. On hover: slight scale (1.02), brighter tint. On press: scale(0.97).
7. **Restraint.** Max 2–3 blurred layers visible at once; never nest more than 2 levels of backdrop-filter (performance + visual mud).

## Setup

Add once to the global CSS (e.g. `src/index.css`), after Tailwind directives. This is the canonical token layer — read `references/tokens.css` and copy it verbatim into the project:

- CSS variables for tint, border, highlight, blur amounts (light + dark mode via `.dark` or `prefers-color-scheme`).
- Utility classes `.glass-thin`, `.glass`, `.glass-thick`, `.glass-highlight`.
- Fallback: `@supports not (backdrop-filter: blur(1px))` → solid translucent bg with higher opacity.
- Accessibility: `@media (prefers-reduced-transparency: reduce)` → replace blur with near-opaque bg; `@media (prefers-reduced-motion: reduce)` → disable scale/parallax transitions.

If the project uses Tailwind v4, the same file works (plain CSS). For Tailwind v3, optionally mirror the blur values in `theme.extend.backdropBlur`.

## Workflow when building a component

1. Ensure the token layer from `references/tokens.css` exists in the project; add it if missing.
2. Ensure there's a background worth blurring (gradient mesh helper included in tokens).
3. Pick the glass tier (thin/regular/thick) by elevation.
4. Compose: tier class + Tailwind for layout/typography + highlight overlay if the surface is large.
5. Check text contrast: body text on glass must be ≥ 4.5:1 against the *worst-case* background. On light glass use `text-slate-900/90`; on dark use `text-white/90`. If contrast is at risk, thicken the glass (more bg opacity), don't dim the text.
6. Verify the reduced-transparency and no-backdrop-filter fallbacks still look intentional.

## Component recipes

Copy-paste-ready JSX for the common cases lives in `references/components.md`:
navbar, card, modal/dialog, sidebar, buttons (primary/ghost), input, toggle, dock, toast, and the gradient-mesh background. Read it whenever you build one of these instead of improvising.

## Performance rules

- `backdrop-filter` is GPU-expensive: avoid it on elements that resize/scroll-animate every frame; prefer animating `transform`/`opacity` only.
- Add `will-change: transform` only to elements that actually animate; remove after.
- For long scrollable lists, apply glass to the container, not each row.
- On mobile Safari, add `-webkit-backdrop-filter` (already in tokens).

## Don'ts

- Don't stack glass on glass on glass (max 2 levels of backdrop-filter).
- Don't use pure `bg-white/50`+blur for dark mode — dark glass tints with `bg-slate-900/40` or `bg-white/10` over dark backgrounds.
- Don't put small gray text on glass; bump weight/opacity instead.
- Don't use drop shadows heavier than `shadow-lg shadow-black/10`; glass floats via light, not via heavy shadow.
- Don't skip the fallbacks — Firefox on some platforms and reduced-transparency users must still get a usable UI.
