# Visual Regression Tests

Automated screenshot diffing for Campus Connect, powered by Playwright. Catches
layout, spacing, and dark-mode regressions before they hit production.

## Matrix

Every covered route is captured in **four variants**:

| Project         | Viewport      | Theme |
| --------------- | ------------- | ----- |
| `mobile-light`  | iPhone 13     | Light |
| `mobile-dark`   | iPhone 13     | Dark  |
| `desktop-light` | 1440 × 900    | Light |
| `desktop-dark`  | 1440 × 900    | Dark  |

Theme is forced via `localStorage.theme` injected before first paint, matching
`src/hooks/use-theme.ts`.

## Scope

| Spec                  | Routes |
| --------------------- | ------ |
| `public.spec.ts`      | `/`, `/auth`, 404 fallback |
| `student.spec.ts`     | `/home`, `/lectures`, `/attendance`, `/profile` |
| `admin.spec.ts`       | `/platform/admin`, `/platform/admin/students`, `/platform/admin/settings` |
| `super-admin.spec.ts` | `/platform/super-admin`, `/platform/super-admin/colleges`, `/platform/super-admin/security` |

Authenticated specs auto-skip when their role credentials are missing.

## Local usage

```bash
# One-time: install browser binaries
bunx playwright install --with-deps chromium

# Optional: seed creds for authed flows
cat > .env.local <<EOF
VR_STUDENT_EMAIL=...
VR_STUDENT_PASSWORD=...
VR_ADMIN_EMAIL=...
VR_ADMIN_PASSWORD=...
VR_SA_EMAIL=...
VR_SA_PASSWORD=...
EOF

# Run the suite (builds + previews automatically)
bun run test:visual

# Update baselines after an intentional UI change
bun run test:visual:update

# Open the HTML diff report
bun run test:visual:report
```

To point at a deployed preview instead of building locally:

```bash
VR_BASE_URL=https://campusconnect.indevs.in bun run test:visual
```

## CI

`.github/workflows/visual-regression.yml` runs on every PR and push to `main`.
Set the following repo secrets to enable authed coverage:

- `VR_STUDENT_EMAIL` / `VR_STUDENT_PASSWORD`
- `VR_ADMIN_EMAIL` / `VR_ADMIN_PASSWORD`
- `VR_SA_EMAIL` / `VR_SA_PASSWORD`

Failures upload `playwright-report/` and `test-results/` (with diff PNGs) as
build artifacts for review.

## Baselines

Baseline PNGs live in `tests/visual/__screenshots__/` and are committed to git.
When an intentional design change lands, run `bun run test:visual:update` and
commit the updated baselines in the same PR.

## Stability tricks

`helpers.ts` enforces deterministic capture:

- Disables all CSS animations + transitions
- Hides caret + scrollbars
- Waits for `document.fonts.ready` + network idle
- Masks dynamic regions (`[data-vr-mask]`, `time`, `[data-clock]`,
  `[data-testid='network-health-dot']`, plus per-spec extras)

To exempt an element from comparison, add `data-vr-mask` to it.
