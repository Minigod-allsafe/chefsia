import { test, expect } from "@playwright/test";

/**
 * E2E — Carrousel marketing de la home (/).
 *
 * Couverture :
 *  - Clic sur un slide (desktop + mobile) → navigation vers /signup
 *  - Contenu interne (image + caption) ne bloque pas le clic
 *  - Navigation au clavier (Tab + Enter) sur un slide
 *  - Scroll horizontal (équivalent "flèches/pagination" — l'implémentation
 *    actuelle utilise le scroll natif scroll-snap, sans boutons dédiés)
 *  - Tous les 7 slides sont rendus et cliquables
 */

const SLIDE_COUNT = 7;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("carousel").scrollIntoViewIfNeeded();
});

test("affiche les 7 slides du carrousel", async ({ page }) => {
  const slides = page.getByTestId("carousel-slide");
  await expect(slides).toHaveCount(SLIDE_COUNT);
});

test("chaque slide est un lien cliquable vers /signup", async ({ page }) => {
  const slides = page.getByTestId("carousel-slide");
  for (let i = 0; i < SLIDE_COUNT; i++) {
    const slide = slides.nth(i);
    await expect(slide).toHaveAttribute("href", "/signup");
    await expect(slide).toBeVisible();
  }
});

test("le clic sur un slide navigue vers /signup", async ({ page }) => {
  const firstSlide = page.getByTestId("carousel-slide").first();
  await firstSlide.scrollIntoViewIfNeeded();
  await firstSlide.click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("le clic sur l'image interne déclenche bien la navigation (pas d'overlay bloquant)", async ({
  page,
}) => {
  const slide = page.getByTestId("carousel-slide").nth(2);
  await slide.scrollIntoViewIfNeeded();
  // Clic au centre — visera l'image ET la caption (pointer-events-none)
  await slide.click({ position: { x: 100, y: 100 } });
  await expect(page).toHaveURL(/\/signup$/);
});

test("la caption (numéro + ChefIA) est non-interactive (pointer-events-none)", async ({
  page,
}) => {
  const slide = page.getByTestId("carousel-slide").first();
  const caption = slide.locator("div").filter({ hasText: "ChefIA" }).first();
  await expect(caption).toBeVisible();
  // Confirme que la couche overlay ne capture pas les events
  const pe = await caption.evaluate(
    (el) => getComputedStyle(el).pointerEvents,
  );
  expect(pe).toBe("none");
});

test("navigation clavier : Tab puis Enter active le slide focusé", async ({
  page,
}) => {
  const slide = page.getByTestId("carousel-slide").first();
  await slide.focus();
  await expect(slide).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/signup$/);
});

test("scroll horizontal — équivalent flèches/pagination", async ({ page }) => {
  const carousel = page.getByTestId("carousel");
  const initialScroll = await carousel.evaluate((el) => el.scrollLeft);
  await carousel.evaluate((el) => {
    el.scrollBy({ left: 600, behavior: "instant" as ScrollBehavior });
  });
  const newScroll = await carousel.evaluate((el) => el.scrollLeft);
  expect(newScroll).toBeGreaterThan(initialScroll);

  // Un slide plus loin doit aussi être cliquable
  const lastSlide = page.getByTestId("carousel-slide").last();
  await lastSlide.scrollIntoViewIfNeeded();
  await lastSlide.click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("mobile : les slides restent cliquables au tap", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Test spécifique mobile");
  const slide = page.getByTestId("carousel-slide").first();
  await slide.scrollIntoViewIfNeeded();
  await slide.tap();
  await expect(page).toHaveURL(/\/signup$/);
});
