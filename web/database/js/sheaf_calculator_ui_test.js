// Requires Playwright. Run: node js/sheaf_calculator_ui_test.js
// Set SHEAF_TEST_BROWSER=chrome (or chromium) to use another installed browser.
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const url = pathToFileURL(path.resolve(__dirname, '../sheaf_calculator.html')).href;
const storageKey = 'ramified.calculatorInputSettings.v1.sheaf';

async function selectAbelianSurface(page) {
  await page.locator('#input-mode').selectOption('create');
  await page.locator('#add-object-kind').selectOption('variety');
  await page.locator('#variety-type').selectOption('abelian');
  await page.locator('#variety-dim').fill('2');
  await page.locator('#add-object').click();
  await page.locator('[data-object-kind="variety"]').last().click();
  await page.locator('#toggle-hodge-card').waitFor({ state: 'visible' });
}

async function testCards(browser, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Test card behavior and raw formula content independently of the MathJax CDN.
    await page.route('https://**/*', (route) => route.abort());
    await page.goto(url);
    await page.evaluate(({ storageKey }) => {
      localStorage.setItem(storageKey, JSON.stringify({
        version: 1, profiles: {}, cardVisibility: { 'hodge-card': false, 'export-card': false }
      }));
    }, { storageKey });
    await page.reload();
    await selectAbelianSurface(page);
    assert(await page.locator('#hodge-card').evaluate((card) => card.classList.contains('calculator-card-user-hidden')));
    await page.locator('#toggle-hodge-card').click();
    assert(await page.locator('#hodge-chart').isVisible(), 'Show must override a saved hidden-card preference');
    const values = await page.locator('#hodge-chart .hodge-cell').allTextContents();
    assert.deepStrictEqual(values.map((text) => text.replace(/[^0-9]/g, '')), ['1', '2', '1', '2', '4', '2', '1', '2', '1']);
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
    assert.strictEqual(saved.cardVisibility['hodge-card'], true);
    assert.strictEqual(saved.cardVisibility['export-card'], false, 'Unrelated saved preferences must remain unchanged');

    await page.locator('#toggle-betti-card').click();
    assert(await page.locator('#input-mode').isVisible(), 'Opening both charts must keep Input expanded');
    await page.locator('#hodge-card > .card-head').click();
    await page.locator('#variety-dim').fill('3');
    await page.locator('#variety-dim').press('Tab');
    await page.locator('#add-object').click();
    await page.waitForFunction(() => document.querySelectorAll('#hodge-chart .hodge-cell').length === 16);
    assert(await page.locator('#hodge-card').evaluate((card) => card.classList.contains('collapsed')), 'Recomputation must preserve manual collapse');
    assert(await page.locator('#input-mode').isVisible(), 'Editing must keep Input expanded');
    await page.locator('#toggle-hodge-card').click();
    await page.locator('#toggle-hodge-card').click();
    assert(await page.locator('#hodge-chart').isVisible(), 'Hide then show must reopen the chart');

    await page.reload();
    assert(await page.locator('#hodge-card').evaluate((card) => !card.classList.contains('calculator-card-user-hidden')), 'The visibility correction must survive reload');
    assert.deepStrictEqual(errors, []);
    console.log(`sheaf calculator UI passed at ${width}px`);
  } finally {
    await context.close();
  }
}

(async () => {
  const channel = process.env.SHEAF_TEST_BROWSER || 'msedge';
  const browser = await chromium.launch({ headless: true, ...(channel === 'chromium' ? {} : { channel }) });
  try {
    for (const width of [1280, 800, 390]) await testCards(browser, width);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
