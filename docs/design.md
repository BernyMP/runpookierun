# Pookie visual identity

The original Pookie character is the center of this product, not a decorative placeholder. The six creator-owned PNGs in `public/pookie/` are bundled in the source release. Preserve them in future redesigns. Do not replace them with generic fitness photography, shoe icons, or newly generated mascots.

## Direction

A playful retro running companion: warm paper, bold ink outlines, tangerine, lavender, yellow, and pink. Chunky Fraunces display type brings the cartoon character into the headings; readable sans-serif copy keeps the actual workout instructions clear. The openly licensed font and its license are bundled locally so rendering requires no font service.

Pookie runs in the hero, checks off completed sessions, chills on rest days, and shows up for the next weekly choice. The tired pose is empathetic feedback for a hard week, never a penalty. Success gets a small, finite animation; reduced-motion preferences are respected. No streak punishment or new training claims are introduced.

Keep the supplied illustrations intact. `next/image` provides optimized display sizes. Source images are not recolored or redrawn. CSS frames, stickers, hard shadows, color blocks and typography create the surrounding retro style.

Use three-pixel ink outlines for the main cards and frames. The public layout expands to 1440px, with a larger hero Pookie and small running marks. Feature cards lift and tilt slightly on mouse hover; the calendar Pookie cheers while the resting poses gently breathe. The hero uses eight distinct running poses, with a stationary poster, an explicit Pause Pookie control, reduced-motion still artwork, offscreen pausing, and the original image as a load-failure fallback. Other decorative animations finish within four seconds and leave workout controls steady. Keep these as small details, not a new visual direction.

## Verification

Check the home page, free plan, pricing, guides, onboarding, weekly choices, completion dialog, rest days and account on narrow and desktop screens. Keep readable contrast, visible focus rings, keyboard-accessible dialogs, and clear buttons. Important instructions, charges and cancellation details must remain easy to read. Avoid decorative motion around actionable controls.

## New animation asset — September 20, 2026

`public/pookie/pookie-run-cycle-v1.png` is a separate 4-column × 2-row sheet generated with the built-in image tool from the original `run-pookie-run.png` reference. The browser uses an optimized WebP copy; the generated PNG is retained. Original images remain byte-for-byte unchanged. CSS flips the second row so all eight poses face the same direction; inset space protects heads and shoes. Feature cards use square `contain` areas with space for hover movement.

Generation brief: preserve Pookie’s round cream face and body, orange headband and running shoes, black limbs, proportions and thick dark outlines. Generate eight distinct sequential running poses with alternating arms and legs, contact and airborne positions, and a small body bounce, aligned in a 4×2 sheet on a transparent background. Keep every headband and shoe within its frame; no text or scene background.

The separate `public/pookie/pookie-barista-v1.png` illustration shows Pookie in an apron and running shoes serving a tiny latte at a fictional café. The menu reads “Tiny latte $8.50” and “Foam costs extra.” It appears at full square proportions on the home and pricing pages beside the $4.99 offer. The original six creator assets remain unchanged. The initial generation limit cleared on retry; this illustration is now implemented. The exact built-in generation prompt is recorded in `public/pookie/barista-prompt.md`.
