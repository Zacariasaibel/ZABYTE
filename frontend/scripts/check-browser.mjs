import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CheckoutDiagnostics, inspectLocalDatabase, pressEnter } from './checkout-diagnostics.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const studioManifest = JSON.parse(readFileSync(path.join(projectRoot, 'docs/studio-assets.json'), 'utf8'));
const expectedStudioImages = Object.fromEntries(studioManifest.assets.map((asset) => [asset.product_slug, asset.public_url]));
const artifactDirectory = path.join(projectRoot, '.local/qa');
const baseUrl = process.env['SHOP_URL'] ?? 'http://127.0.0.1:4200';
const shopOrigin = new URL(baseUrl);
assert.ok(['http:', 'https:'].includes(shopOrigin.protocol) && !shopOrigin.username && !shopOrigin.password && !shopOrigin.search && !shopOrigin.hash && shopOrigin.pathname === '/', 'SHOP_URL must be an HTTP(S) origin without credentials, path or query.');
const runStamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
const browserPath = process.env['CHROME_PATH'] ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
assert.ok(browserPath || process.env['CHROME_DEBUG_URL'], 'Install Chrome or set CHROME_PATH. No browser will be downloaded.');
assert.equal((await fetch(baseUrl)).status, 200, 'Start the Angular server first.');
assert.equal((await fetch(baseUrl + '/api/products/')).status, 200, 'Start the Django server first.');
await mkdir(artifactDirectory, { recursive: true });

const portReservation = createServer();
await new Promise((resolve) => portReservation.listen(0, '127.0.0.1', resolve));
const port = portReservation.address().port;
await new Promise((resolve) => portReservation.close(resolve));
const browser = process.env['CHROME_DEBUG_URL'] ? null : spawn(browserPath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-extensions',
  `--remote-debugging-port=${port}`, '--remote-debugging-address=127.0.0.1',
  `--user-data-dir=${path.join(projectRoot, '.local', `chrome-qa-${Date.now()}`)}`,
  'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let launchError;
browser?.on('error', (error) => { launchError = error; });
let socket;
let nextId = 0;
const pending = new Map();
const runtimeErrors = [];
const focusDiagnostics = [];
const localDatabase = process.env['DJANGO_DB_PATH'] ?? path.join(projectRoot, 'backend/db.sqlite3');
const checkout = new CheckoutDiagnostics(command, ['localhost', '127.0.0.1'].includes(shopOrigin.hostname) && existsSync(localDatabase)
  ? (key) => inspectLocalDatabase(localDatabase, key)
  : async () => ({ available: false, reason: 'Remote origin or no local SQLite; inspect the deployment Admin.' }));
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function command(method, params = {}) {
  const id = ++nextId;
  const response = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer });
  });
  socket.send(JSON.stringify({ id, method, params }));
  return response;
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

async function until(expression, label) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${label}`);
}

async function navigate(route = '/') {
  await command('Page.navigate', { url: baseUrl + route });
  await until(`document.querySelector('app-root h1') !== null`, 'page heading');
}

async function filter(search, category) {
  await evaluate(`(() => {
    const input = document.querySelector('#search');
    input.value = ${JSON.stringify(search)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('form.header-search').requestSubmit();
  })()`);
  await until(`new URL(location.href).searchParams.get('search') === ${JSON.stringify(search || null)}`, 'header search URL');
  await evaluate(`(() => {
    const link = [...document.querySelectorAll('.category-links a')].find(link =>
      new URL(link.href).searchParams.get('category') === ${JSON.stringify(category || null)});
    if (!link) throw new Error('Category link missing');
    link.click();
  })()`);
  await until(`new URL(location.href).searchParams.get('search') === ${JSON.stringify(search || null)} && new URL(location.href).searchParams.get('category') === ${JSON.stringify(category || null)}`, 'filter URL');
  await until(`document.querySelector('.catalog-results[aria-busy="false"]') !== null`, 'filter response');
}

async function screenshot(name) {
  await evaluate(`Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode().catch(() => {}); }))`);
  assert.equal(await evaluate(`Array.from(document.images).every(image => image.naturalWidth > 0)`), true, 'Local images must load');
  const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(path.join(artifactDirectory, name + '.png'), Buffer.from(data, 'base64'));
}

async function pressTab() {
  await command('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
}

async function focusIndicator(selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const extent = Math.max(0, parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset));
    const bounds = { left: rect.left - extent, top: rect.top - extent, right: rect.right + extent, bottom: rect.bottom + extent };
    const clippingAncestors = [];
    let surroundingColor = null;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const parentStyle = getComputedStyle(parent);
      const area = parent.getBoundingClientRect();
      const clipsX = /^(hidden|clip|auto|scroll)$/.test(parentStyle.overflowX);
      const clipsY = /^(hidden|clip|auto|scroll)$/.test(parentStyle.overflowY);
      if ((clipsX && (bounds.left < area.left || bounds.right > area.right)) ||
          (clipsY && (bounds.top < area.top || bounds.bottom > area.bottom))) clippingAncestors.push(parent.tagName);
      if (!surroundingColor && parentStyle.backgroundColor.startsWith('rgb(')) surroundingColor = parentStyle.backgroundColor;
    }
    return {
      selector: ${JSON.stringify(selector)}, focused: document.activeElement === element,
      focusVisible: element.matches(':focus-visible'), outlineStyle: style.outlineStyle,
      outlineWidth: parseFloat(style.outlineWidth), outlineOffset: parseFloat(style.outlineOffset),
      outlineColor: style.outlineColor, surroundingColor, zIndex: style.zIndex,
      withinViewport: bounds.left >= 0 && bounds.top >= 0 && bounds.right <= innerWidth && bounds.bottom <= innerHeight,
      clippingAncestors
    };
  })()`);
}

function assertFocusIndicator(current, blurred) {
  assert.equal(current.focused, true, `${current.selector}: keyboard focus`);
  assert.equal(current.outlineStyle, 'solid', `${current.selector}: visible outline`);
  assert.ok(current.outlineWidth >= 3 && current.outlineOffset >= 2, `${current.selector}: separated focus ring`);
  assert.equal(current.withinViewport, true, `${current.selector}: ring fits the viewport`);
  assert.deepEqual(current.clippingAncestors, [], `${current.selector}: no ancestor clips the ring`);
  assert.notDeepEqual([current.outlineStyle, current.outlineWidth, current.outlineColor],
    [blurred.outlineStyle, blurred.outlineWidth, blurred.outlineColor], `${current.selector}: indicator changes with focus`);
  function luminance(color) {
    const channels = color?.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
    assert.ok(channels, 'Focus contrast requires observed opaque RGB colors');
    return channels.slice(1).map(Number).map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  }
  const colors = [luminance(current.outlineColor), luminance(current.surroundingColor)].sort((a, b) => b - a);
  assert.ok((colors[0] + .05) / (colors[1] + .05) >= 3, `${current.selector}: focus contrast at least 3:1`);
}

async function checkoutState() {
  return evaluate(`(() => {
    const button = document.querySelector('.checkout-submit');
    let attempt = null;
    try { const saved = JSON.parse(localStorage.getItem('zabyte.checkout.v1')); attempt = saved ? { present: true, items: saved.items } : null; } catch { attempt = { invalid: true }; }
    return {
      path: location.pathname, origin: location.origin,
      heading: document.querySelector('main h1')?.textContent.trim(),
      button: button ? { disabled: button.disabled, text: button.textContent.trim(), focused: document.activeElement === button } : null,
      errors: [...document.querySelectorAll('main .inline-error, main [role="alert"]')].map(node => node.textContent.trim()),
      pendingMessageVisible: Boolean(document.querySelector('.pending-note')),
      cartCount: document.querySelector('.cart-count')?.textContent.trim(),
      displayedTotal: document.querySelector('.summary-total strong')?.textContent.trim(),
      confirmationReference: document.querySelector('.order-reference strong')?.textContent.trim(),
      activation: window.__zabyteCheckoutActivation ?? null,
      pendingAttempt: attempt
    };
  })()`);
}

async function saveCheckoutReport(outcome) {
  let state;
  try { state = await checkoutState(); } catch { state = { unavailable: true }; }
  const report = await checkout.finish(state);
  report.outcome = outcome;
  report.origin = shopOrigin.origin;
  const file = path.join(artifactDirectory, `checkout-diagnostic-${runStamp}.json`);
  await writeFile(file, JSON.stringify(report, null, 2) + '\n');
  console.log(`Checkout diagnostic (no cookies, tokens or raw idempotency keys): ${file}`);
  return report;
}

try {
  let page;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    try {
      const pages = await (await fetch(`${process.env['CHROME_DEBUG_URL'] ?? `http://127.0.0.1:${port}`}/json/list`)).json();
      page = pages.find((item) => item.type === 'page');
      if (page) break;
    } catch { /* Chrome may still be starting. */ }
    await wait(100);
  }
  assert.ok(page, 'Chrome debugging endpoint did not start.');
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    checkout.observe(message.method, message.params ?? {});
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params);
    const task = pending.get(message.id);
    if (!task) return;
    clearTimeout(task.timer);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(JSON.stringify(message.error)));
    else task.resolve(message.result);
  });
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Network.enable');
  await command('Network.setCacheDisabled', { cacheDisabled: true });

  for (const [width, height] of [[1440, 950], [800, 1000], [390, 844], [320, 740]]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await navigate();
    await evaluate(`localStorage.removeItem('zabyte.cart.v1'); localStorage.removeItem('zabyte.checkout.v1')`);
    await navigate();
    await until(`document.querySelectorAll('.product-card').length === 10 && document.querySelectorAll('.category-links a').length === 5`, 'seed catalog');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `No overflow at ${width}px`);
    assert.equal(await evaluate(`document.querySelectorAll('.stock-badge').length`), 2);
    assert.equal(await evaluate(`document.querySelectorAll('.demo-notice, .photo-caption, .detail-link').length`), 0, 'Catalog has no old notices or detail row');
    assert.equal(await evaluate(`document.querySelectorAll('.product-link button').length`), 0, 'Buttons must not be nested in product links');
    assert.equal(await evaluate(`document.querySelectorAll('.card-actions button').length`), 10, 'Independent add-to-cart buttons');
    assert.equal(await evaluate(`document.querySelectorAll('.product-summary').length`), 10, 'Product descriptions');
    if (width === 1440) {
      assert.ok(await evaluate(`document.querySelector('.product-card').getBoundingClientRect().top < 440`), 'Products appear near the top with catalog controls');
      assert.ok(await evaluate(`document.querySelector('.product-card').getBoundingClientRect().bottom < innerHeight`), 'First row fits in desktop viewport');
    }
    await screenshot(`catalog-${width}`);
    assert.equal(await evaluate(`document.querySelectorAll('.product-card img[src^="/assets/studio/"]').length`), 10, 'Ten products use generated studio images');
    const catalogImages = await evaluate(`Object.fromEntries([...document.querySelectorAll('.product-link')].map(link => [
      new URL(link.href).pathname.split('/').pop(), link.querySelector('img').getAttribute('src')
    ]))`);
    assert.deepEqual(catalogImages, expectedStudioImages, 'Catalog assignments match the studio manifest');
    assert.equal(new Set(Object.values(catalogImages)).size, 10, 'Ten distinct product images');
    assert.equal(await evaluate(`document.querySelectorAll('.product-card img[src^="/assets/products/"]').length`), 0, 'SVG files are only fallbacks');
    assert.equal(await evaluate(`document.title.includes('ZABYTE') && document.querySelector('.brand').textContent.trim() === 'ZABYTE'`), true, 'ZABYTE branding');
    assert.equal(await evaluate(`[...document.querySelectorAll('.product-image')].every(image => {
      const rect = image.getBoundingClientRect();
      return Math.abs(rect.width / rect.height - 4 / 3) < 0.02;
    })`), true, 'Every image, including the final row, remains 4:3');
    await filter('Tastatur', 'eingabe');
    await until(`document.querySelectorAll('.product-card').length === 2`, 'combined search and category');
    await evaluate(`const sort = document.querySelector('#catalog-sort'); sort.value = 'price_desc'; sort.dispatchEvent(new Event('change', { bubbles: true }));`);
    await until(`new URL(location.href).searchParams.get('sort') === 'price_desc' && document.querySelector('.catalog-results[aria-busy="false"]')`, 'sorting updates URL and results');
    await evaluate(`document.querySelector('input[name="available"]').click()`);
    await until(`new URL(location.href).searchParams.get('available') === '1'`, 'availability URL');
    await navigate('/?' + new URLSearchParams({ search: 'Tastatur', category: 'eingabe', sort: 'price_desc', available: '1' }));
    await until(`document.querySelectorAll('.product-card').length === 2`, 'combined filters after reload');
    assert.equal(await evaluate(`document.querySelector('#catalog-sort').value`), 'price_desc');
    assert.equal(await evaluate(`document.querySelector('input[name="available"]').checked`), true);
    assert.equal(await evaluate(`document.querySelector('.result-count').textContent.trim()`), '2 Produkte');
    assert.equal(await evaluate(`(() => { const prices = [...document.querySelectorAll('.product-card .price')].map(node => Number(node.textContent.replace(/[^0-9,]/g, '').replace(',', '.'))); return prices.every((price, index) => !index || prices[index - 1] >= price); })()`), true);
    await evaluate(`document.querySelector('a.product-link').focus()`);
    await pressEnter(command);
    await until(`document.querySelector('.detail-copy') !== null`, 'keyboard opens real product link');
    assert.equal(await evaluate(`new URL(location.href).searchParams.get('sort')`), 'price_desc');
    await evaluate(`document.querySelector('.back-link').click()`);
    await until(`document.querySelectorAll('.product-card').length === 2`, 'detail returns with every filter');
    await evaluate(`document.querySelector('button.reset-filters').click()`);
    await until(`document.querySelectorAll('.product-card').length === 10 && !location.search`, 'reset clears all four filters');
    await filter('Tastatur', 'eingabe');
    await filter('Tastatur', 'audio');
    await until(`document.querySelector('.state-panel h3')?.textContent.includes('Keine passenden Produkte')`, 'empty result state');
    await evaluate(`history.back()`);
    await until(`document.querySelectorAll('.product-card').length === 2 && new URL(location.href).searchParams.get('category') === 'eingabe'`, 'browser back restores filters');
    assert.equal(await evaluate(`document.querySelector('#search').value`), 'Tastatur', 'Search matches restored URL');
    await evaluate(`history.forward()`);
    await until(`document.querySelector('.state-panel h3')?.textContent.includes('Keine passenden Produkte') && new URL(location.href).searchParams.get('category') === 'audio'`, 'browser forward restores filters');
    await screenshot(`empty-${width}`);
    await filter('', 'audio');
    await until(`document.querySelectorAll('.product-card').length === 2`, 'category alone');
    await evaluate(`document.querySelector('a.product-link[href*="klang-headset"]').click()`);
    await until(`document.querySelector('.detail-stock')?.textContent.includes('Ausverkauft')`, 'sold out product detail');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `Detail fits at ${width}px`);
    await screenshot(`detail-${width}`);
    await evaluate(`document.querySelector('.back-link').click()`);
    await until(`document.querySelectorAll('.product-card').length === 2 && new URL(location.href).searchParams.get('category') === 'audio'`, 'back link preserves filters');
    await evaluate(`document.querySelector('button.reset-filters').click()`);
    await until(`document.querySelectorAll('.product-card').length === 10`, 'reset filters');
    await evaluate(`document.querySelector('a.product-link[href*="polar-mouse"]').click()`);
    await until(`document.querySelector('.detail-image img')?.getAttribute('src') === '/assets/studio/mouse.webp'`, 'studio image on product detail');
    assert.equal(await evaluate(`document.querySelector('.photo-caption') === null`), true, 'No image-generation notice in product detail');
    await screenshot(`detail-photo-${width}`);
    await command('Network.setBlockedURLs', { urls: ['*/assets/studio/mouse.webp'] });
    await navigate('/produkte/polar-mouse');
    await until(`document.querySelector('.detail-image img')?.getAttribute('src') === '/assets/products/mouse.svg' && document.querySelector('.detail-image img').naturalWidth > 0`, 'photo failure falls back to original SVG');
    assert.equal(await evaluate(`document.querySelector('.photo-caption') === null`), true, 'No photo caption on SVG fallback');
    await screenshot(`fallback-${width}`);
    await command('Network.setBlockedURLs', { urls: [] });
    for (const [slug, src] of Object.entries(expectedStudioImages)) {
      await navigate(`/produkte/${slug}`);
      await until(`document.querySelector('.detail-image img')?.getAttribute('src') === ${JSON.stringify(src)} && document.querySelector('.detail-image img').naturalWidth > 0`, `detail matches catalog for ${slug}`);
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.detail-image img')).objectFit`), 'contain');
      assert.equal(await evaluate(`getComputedStyle(document.querySelector('.detail-image')).backgroundColor`), 'rgb(255, 255, 255)');
    }
    await navigate('/produkte/fjord-keys');
    await until(`document.querySelector('.detail-image img')?.getAttribute('src') === '/assets/studio/keyboard-full.webp'`, 'full keyboard');
    await command('Network.setBlockedURLs', { urls: ['*/assets/studio/keyboard-full.webp'] });
    await evaluate(`document.querySelector('.detail-image img').dispatchEvent(new Event('error'))`);
    await until(`document.querySelector('.detail-image img')?.getAttribute('src') === '/assets/products/keyboard.svg'`, 'keyboard SVG fallback');
    await evaluate(`document.querySelector('#search').value = 'Tastatur'; document.querySelector('#search').dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.header-search').requestSubmit()`);
    await until(`document.querySelectorAll('.product-card').length === 2`, 'keyboard navigation after image error');
    await evaluate(`document.querySelector('a.product-link[href*="fjord-keys-mini"]').click()`);
    await until(`document.querySelector('.detail-image img')?.getAttribute('src') === '/assets/studio/keyboard-compact.webp'`, 'compact keyboard unaffected by full keyboard error');
    await command('Network.setBlockedURLs', { urls: [] });
    await navigate();
    await until(`document.querySelectorAll('.product-card').length === 10`, 'catalog before cart test');
    await evaluate(`document.querySelector('a.product-link[href*="polar-mouse"]').closest('article').querySelector('.add-to-cart').click()`);
    await until(`document.querySelector('.cart-count')?.textContent.trim() === '1'`, 'card adds one item');
    assert.equal(await evaluate(`location.pathname`), '/', 'Add button must not navigate to detail');
    assert.equal(await evaluate(`document.querySelector('.cart-toast')?.getAttribute('role')`), 'status');
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cart-toast')).position`), 'fixed');
    await evaluate(`document.querySelector('.toast-close').click()`);
    await until(`!document.querySelector('.cart-toast')`, 'notice can be closed');
    await evaluate(`document.querySelector('a.product-link[href*="polar-mouse"]').click()`);
    await until(`document.querySelector('#detail-quantity') !== null`, 'detail quantity selector');
    await evaluate(`const quantity = document.querySelector('#detail-quantity'); quantity.value = '2'; quantity.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('.detail-purchase').requestSubmit()`);
    await until(`document.querySelector('.cart-count')?.textContent.trim() === '3'`, 'detail adds selected quantity');
    await evaluate(`document.querySelector('.cart-access').click()`);
    await until(`document.querySelector('.cart-lines input')?.value === '3' && document.querySelector('.loading-message') === null`, 'cart quantities');
    assert.equal(await evaluate(`document.querySelector('.cart-toast') === null`), true, 'Old notices do not repeat on navigation');
    await evaluate(`document.querySelector('.quantity-controls button').click()`);
    await until(`document.querySelector('.cart-lines input')?.value === '2'`, 'decrease quantity');
    await evaluate(`document.querySelector('.quantity-controls button:last-child').click()`);
    await until(`document.querySelector('.cart-lines input')?.value === '3'`, 'increase quantity');
    await navigate('/warenkorb');
    await until(`document.querySelector('.cart-lines input')?.value === '3' && document.querySelector('.loading-message') === null`, 'cart persists after reload');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `Cart fits at ${width}px`);
    await screenshot(`cart-${width}`);
    await evaluate(`document.querySelector('.remove-item').click()`);
    await until(`document.querySelector('.state-panel h2')?.textContent.includes('leer')`, 'remove item and empty state');
    await navigate();
    await until(`document.querySelectorAll('.product-card').length === 10`, 'catalog for checkout');
    await evaluate(`document.querySelector('a.product-link[href*="polar-mouse"]').closest('article').querySelector('.add-to-cart').click()`);
    await until(`document.querySelector('.cart-count')?.textContent.trim() === '1'`, 'checkout selection');
    await navigate('/kasse');
    await until(`document.querySelector('.checkout-submit:not([disabled])') !== null`, 'checkout ready');
    assert.equal(await evaluate(`document.documentElement.scrollWidth <= innerWidth`), true, `Checkout fits at ${width}px`);
    assert.equal(await evaluate(`document.querySelector('input')?.type === 'search' && document.querySelectorAll('input').length === 1`), true, 'Checkout collects no personal or card data');
    await screenshot(`checkout-${width}`);
    console.log(`PASS ${width}px: catalog, combined filters, empty state, category, detail, back and reset.`);
  }

  await checkout.start(await evaluate(`JSON.parse(localStorage.getItem('zabyte.checkout.v1'))`));
  assert.equal(checkout.data.pendingAttemptBeforeSubmit, false, 'The isolated test must not reuse a pending request from another run');
  await evaluate(`(() => {
    const button = document.querySelector('.checkout-submit');
    window.__zabyteCheckoutActivation = { keydown: 0, clicks: 0 };
    button.addEventListener('keydown', (event) => { if (event.key === 'Enter') window.__zabyteCheckoutActivation.keydown++; });
    button.addEventListener('click', () => { window.__zabyteCheckoutActivation.clicks++; });
    button.focus();
  })()`);
  assert.equal(await evaluate(`document.activeElement === document.querySelector('.checkout-submit') && !document.activeElement.disabled`), true, 'An enabled checkout button must have keyboard focus');
  await pressEnter(command);
  assert.equal(await evaluate(`window.__zabyteCheckoutActivation?.clicks`), 1, 'Enter activates checkout exactly once');
  await until(`location.pathname === '/bestaetigung' && document.querySelector('app-confirmation #confirmation-title')?.textContent.includes('Simulation bestätigt')`, 'server confirms simulated order');
  assert.equal(await evaluate(`document.querySelector('.cart-count').textContent.trim()`), '0');
  const report = await saveCheckoutReport('confirmed');
  const posts = report.requests.filter(request => request.path === '/api/simulated-orders/' && request.method === 'POST');
  assert.equal(posts.length, 1, 'One keyboard action sends exactly one order request');
  assert.ok([200, 201].includes(posts[0].status), 'Django must confirm the order');
  assert.equal(posts[0].csrfHeaderPresent, true, 'The order request keeps CSRF protection');
  assert.equal(posts[0].requestUrlOrigin, shopOrigin.origin, 'The captured order request URL uses the shop origin');
  assert.equal(posts[0].response?.is_simulated, true);
  assert.equal(report.state.confirmationReference, posts[0].response?.id, 'The receipt shows the reference returned by Django');
  await screenshot('confirmation-320');

  await navigate('/produkte/no-such-product');
  await until(`document.querySelector('.state-panel h1')?.textContent.includes('Produkt nicht gefunden')`, 'missing product');
  await navigate('/no-such-page');
  await until(`document.querySelector('app-not-found') !== null`, 'missing route');

  await command('Network.setBlockedURLs', { urls: ['*/api/products/*'] });
  await navigate();
  await until(`document.querySelector('.state-panel h3')?.textContent.includes('nicht erreichbar')`, 'catalog error');
  await screenshot('catalog-error-320');
  await command('Network.setBlockedURLs', { urls: [] });
  await evaluate(`document.querySelector('.state-panel button').click()`);
  await until(`document.querySelectorAll('.product-card').length === 10`, 'retry catalog');

  await command('Network.setBlockedURLs', { urls: ['*/api/products/*'] });
  await navigate('/produkte/fjord-keys');
  await until(`document.querySelector('.state-panel h1')?.textContent.includes('nicht geladen')`, 'detail error');
  await command('Network.setBlockedURLs', { urls: [] });
  await evaluate(`document.querySelector('.state-panel button').click()`);
  await until(`document.querySelector('.detail-copy h1')?.textContent === 'USB-Tastatur, schwarz'`, 'retry detail');

  await command('Network.emulateNetworkConditions', { offline: false, latency: 1000, downloadThroughput: -1, uploadThroughput: -1 });
  await navigate();
  await until(`document.querySelector('.catalog-results[aria-busy="true"]') !== null`, 'catalog loading');
  await until(`document.querySelectorAll('.product-card').length === 10`, 'catalog after loading');
  await command('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

  for (const [width, height] of [[1440, 950], [800, 1000], [390, 844], [320, 740]]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await navigate();
    await until(`document.querySelectorAll('.product-card').length === 10`, 'catalog before keyboard focus test');
    const blurredSearch = await focusIndicator('#search');
    const blurredButton = await focusIndicator('.header-search button');
    assert.equal(blurredSearch.focused || blurredButton.focused, false, 'Fresh document starts outside the search controls');
    let reachedSearch = false;
    for (let tabs = 0; tabs < 12; tabs++) {
      await pressTab();
      if (await evaluate(`document.activeElement.id === 'search'`)) { reachedSearch = true; break; }
    }
    assert.equal(reachedSearch, true, 'Real Tab presses reach the search field');
    const search = await focusIndicator('#search');
    focusDiagnostics.push({ width, blurredSearch, blurredButton, search });
    await screenshot(`focus-search-${width}`);
    assertFocusIndicator(search, blurredSearch);
    await pressTab();
    assert.equal(await evaluate(`document.activeElement.matches('.header-search button')`), true, 'Tab reaches the search action');
    const button = await focusIndicator('.header-search button');
    focusDiagnostics.at(-1).button = button;
    await screenshot(`focus-suchen-${width}`);
    assertFocusIndicator(button, blurredButton);
    assert.equal((await focusIndicator('#search')).focused, false, 'Search field loses focus when Tab reaches Suchen');
  }
  await writeFile(path.join(artifactDirectory, `focus-diagnostic-${runStamp}.json`), JSON.stringify(focusDiagnostics, null, 2) + '\n');
  assert.deepEqual(runtimeErrors, [], 'No uncaught browser exceptions');
  console.log('PASS loading, API errors, retry, 404 routes, keyboard focus and local images.');
  console.log(`Screenshots: ${artifactDirectory}`);
} catch (error) {
  await writeFile(path.join(artifactDirectory, `focus-diagnostic-${runStamp}.json`), JSON.stringify(focusDiagnostics, null, 2) + '\n');
  if (socket?.readyState === WebSocket.OPEN) {
    try { await saveCheckoutReport('failed'); } catch { console.error('Checkout report could not be saved.'); }
    try {
      // A failure screenshot must not depend on image-loading assertions passing.
      const { data } = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      const file = path.join(artifactDirectory, `failure-${runStamp}.png`);
      await writeFile(file, Buffer.from(data, 'base64'));
      console.error(`Failure screenshot: ${file}`);
    } catch { console.error('Failure screenshot unavailable.'); }
  }
  throw error;
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ id: ++nextId, method: 'Browser.close' }));
    await wait(1000);
    socket.close();
  }
  for (const task of pending.values()) clearTimeout(task.timer);
  if (browser?.exitCode === null && browser.pid) {
    if (process.platform === 'win32') {
      try { execFileSync('taskkill', ['/PID', String(browser.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); } catch { /* Browser may already have exited. */ }
    } else browser.kill('SIGTERM');
  }
}
