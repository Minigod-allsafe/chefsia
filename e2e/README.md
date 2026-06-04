# Tests E2E (Playwright)

## Installation des navigateurs (une fois)

```bash
bunx playwright install chromium webkit
```

## Lancer les tests

```bash
# Local : Playwright démarre `vite dev` automatiquement
bunx playwright test

# Contre une URL déployée (preview Lovable, prod, etc.)
BASE_URL=https://chefsia.lovable.app bunx playwright test

# Un seul fichier / un seul projet
bunx playwright test e2e/carousel.spec.ts
bunx playwright test --project=chromium-desktop
bunx playwright test --project=mobile-safari

# Mode UI (debug interactif)
bunx playwright test --ui
```

## Couverture actuelle

- `carousel.spec.ts` : clic slide, contenu interne, clavier, scroll
  horizontal, tap mobile. L'implémentation actuelle du carrousel utilise
  le scroll natif `scroll-snap` (pas de boutons flèches ni pagination
  dédiés) — le test « scroll horizontal » couvre cet équivalent.
