import assert from 'node:assert/strict';
import { createRequire, registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'frontend/package.json'));
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@angular/') || specifier === 'rxjs' || specifier === 'tslib') return { url: pathToFileURL(require.resolve(specifier)).href, shortCircuit: true };
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    const url = new URL(specifier, context.parentURL);
    if (!existsSync(fileURLToPath(url)) && existsSync(fileURLToPath(url) + '.js')) return { url: url.href + '.js', shortCircuit: true };
  }
  return nextResolve(specifier, context);
} });
await import('@angular/compiler');
const { createEnvironmentInjector, runInInjectionContext } = await import('@angular/core');
const { HttpClient, HttpErrorResponse } = await import('@angular/common/http');
const { of, throwError, Subject, firstValueFrom } = await import('rxjs');
const compiled = pathToFileURL(path.join(root, 'frontend/out-tsc/app/app/')).href;
const { CartService, CART_STORAGE, CART_KEY, ATTEMPT_KEY } = await import(compiled + 'cart.service.js');
const { CatalogService } = await import(compiled + 'catalog.service.js');
const { parseCart, parseAttempt, priceToCents, formatCents, verifyConfirmation } = await import(compiled + 'cart-state.js');

class MemoryStorage {
  values = new Map();
  blocked = false;
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.blocked) throw new Error('storage blocked'); this.values.set(key, value); }
  removeItem(key) { if (this.blocked) throw new Error('storage blocked'); this.values.delete(key); }
}
const products = [
  { id: 1, slug: 'polar-mouse', name: 'USB-Maus', price: '29.90', stock: 5, image: '/assets/products/mouse.svg' },
  { id: 2, slug: 'strom-usb-c', name: 'USB-C-Kabel', price: '12.90', stock: 10, image: '/assets/products/cable.svg' },
  { id: 3, slug: 'klang-headset', name: 'Kopfhörer', price: '59.00', stock: 0, image: '/assets/products/headphones.svg' },
];
const contexts = [];
function setup(storage = new MemoryStorage(), catalog = products.map((p) => ({ ...p }))) {
  const posts = [];
  const context = { storage, catalog, posts, productError: false, listError: false, post: () => new Subject() };
  const api = {
    products: () => context.listError ? throwError(() => new Error('offline')) : of(context.catalog),
    product: (slug) => context.productError ? throwError(() => new Error('offline')) : of(context.catalog.find((p) => p.slug === slug)),
  };
  const http = {
    get: () => of({ csrfToken: 'test-token' }),
    post: (url, body, options) => { posts.push({ url, body, options }); return context.post(body); },
  };
  const injector = createEnvironmentInjector([
    { provide: CatalogService, useValue: api }, { provide: HttpClient, useValue: http },
    { provide: CART_STORAGE, useValue: storage },
  ]);
  context.cart = runInInjectionContext(injector, () => new CartService());
  context.injector = injector;
  contexts.push(context);
  return context;
}
function receipt(quantity = 2, unit = '29.90') {
  const cents = priceToCents(unit) * quantity;
  const total = Math.floor(cents / 100) + '.' + String(cents % 100).padStart(2, '0');
  return {
    id: '11111111-1111-4111-8111-111111111111', created_at: '2026-11-01T12:00:00Z',
    is_simulated: true, currency: 'EUR', total,
    lines: [{ product_id: 1, product_name: 'USB-Maus', product_slug: 'polar-mouse', quantity, unit_price: unit, line_total: total }],
  };
}

try {
  assert.equal(priceToCents('29.90'), 2990);
  assert.equal(priceToCents('0.10') * 3 + priceToCents('0.20'), 50);
  assert.equal(formatCents(123456), '1.234,56\u00a0€');
  for (const value of ['1.001', 'NaN', '-1.00', '1e2', 1.00]) assert.throws(() => priceToCents(value));
  for (const raw of ['bad json', '{}', '{"version":1,"items":[{"productId":1,"quantity":1.5}]}', '{"version":1,"items":[{"productId":true,"quantity":1}]}']) assert.throws(() => parseCart(raw));
  assert.throws(() => parseAttempt('{"key":"bad","items":[]}'));

  const first = setup();
  first.cart.add(products[0], 2);
  first.cart.add(products[1], 1);
  assert.equal(first.cart.count(), 3);
  assert.equal(first.cart.totalCents(), 7270);
  assert.deepEqual(JSON.parse(first.storage.getItem(CART_KEY)), { version: 1, items: [{ productId: 1, quantity: 2 }, { productId: 2, quantity: 1 }] });
  first.cart.setQuantity(1, 3);
  assert.equal(first.cart.quantity(1), 3);
  first.cart.setQuantity(1, 1);
  assert.equal(first.cart.quantity(1), 1);
  for (const quantity of [0, -1, 1.5, true, '2', 10001]) { first.cart.setQuantity(1, quantity); assert.equal(first.cart.quantity(1), 1); }
  first.cart.add(products[0], 6);
  assert.equal(first.cart.quantity(1), 1);
  first.cart.add(products[2], 1);
  assert.equal(first.cart.quantity(3), 0);
  first.cart.remove(2);
  assert.equal(first.cart.count(), 1);
  first.productError = true;
  first.cart.add(products[0], 1);
  assert.equal(first.cart.quantity(1), 1);
  assert.equal(first.cart.busy(), false);

  const changedCatalog = products.map((p) => ({ ...p, price: p.id === 1 ? '31.25' : p.price }));
  const reload = setup(first.storage, changedCatalog);
  assert.equal(reload.cart.quantity(1), 1);
  assert.equal(reload.cart.totalCents(), 3125, 'Prices must be fetched from the API after reloading');
  const malicious = new MemoryStorage();
  malicious.setItem(CART_KEY, JSON.stringify({ version: 1, items: [{ productId: 1, quantity: 2, price: '0.01', stock: 1000000 }] }));
  const manipulated = setup(malicious);
  assert.equal(manipulated.cart.totalCents(), 5980);
  assert.deepEqual(JSON.parse(malicious.getItem(CART_KEY)).items, [{ productId: 1, quantity: 2 }]);
  const invalid = new MemoryStorage(); invalid.setItem(CART_KEY, 'bad json');
  const invalidCart = setup(invalid);
  assert.equal(invalidCart.cart.count(), 0);
  assert.ok(invalidCart.cart.notice());
  const missing = new MemoryStorage(); missing.setItem(CART_KEY, JSON.stringify({ version: 1, items: [{ productId: 999, quantity: 1 }] }));
  const missingCart = setup(missing);
  assert.equal(missingCart.cart.valid(), false);
  assert.equal(missingCart.cart.lines()[0].product, null);
  missingCart.cart.remove(999);
  assert.equal(missingCart.cart.count(), 0);
  const overstock = new MemoryStorage(); overstock.setItem(CART_KEY, JSON.stringify({ version: 1, items: [{ productId: 1, quantity: 9 }] }));
  const overstockCart = setup(overstock);
  assert.equal(overstockCart.cart.valid(), false);
  assert.ok(overstockCart.cart.lines()[0].issue);
  overstockCart.cart.setQuantity(1, 2);
  assert.equal(overstockCart.cart.valid(), true);

  const pending = setup();
  pending.cart.add(products[0], 2);
  const response = new Subject(); pending.post = () => response;
  const submission = firstValueFrom(pending.cart.submit());
  const failed = assert.rejects(submission, /Bestätigung/);
  await assert.rejects(firstValueFrom(pending.cart.submit()), /laufende Anfrage/);
  assert.equal(pending.posts.length, 1, 'Double click must not start another HTTP request');
  assert.equal(pending.posts[0].options.headers['X-CSRFToken'], 'test-token');
  assert.deepEqual(Object.keys(pending.posts[0].body).sort(), ['idempotency_key', 'items']);
  const key = pending.posts[0].body.idempotency_key;
  pending.cart.remove(1);
  assert.equal(pending.cart.count(), 2, 'An uncertain request must keep its original selection');
  response.error(new HttpErrorResponse({ status: 500, error: { detail: 'Bestätigung unklar' } }));
  await failed;
  assert.equal(pending.cart.count(), 2);
  assert.equal(pending.cart.pending().key, key);
  assert.equal(pending.cart.submitting(), false);
  assert.equal(pending.cart.confirmation(), null);
  const resumed = setup(pending.storage, changedCatalog);
  resumed.post = () => of(receipt());
  const confirmed = await firstValueFrom(resumed.cart.submit());
  assert.equal(resumed.posts[0].body.idempotency_key, key, 'Reload/retry must reuse the persisted key');
  assert.equal(confirmed.total, '59.80', 'A replay uses the server snapshot even after catalog prices change');
  assert.equal(resumed.cart.count(), 0);
  assert.equal(resumed.storage.getItem(ATTEMPT_KEY), null);
  assert.deepEqual(JSON.parse(resumed.storage.getItem(CART_KEY)).items, []);
  assert.equal(resumed.cart.confirmation().id, confirmed.id);

  for (const badReceipt of [null, { ...receipt(), is_simulated: false }, { ...receipt(), total: '0.01' }, { ...receipt(), lines: [] }]) {
    const context = setup(); context.cart.add(products[0], 2); context.post = () => of(badReceipt);
    await assert.rejects(firstValueFrom(context.cart.submit()));
    assert.equal(context.cart.count(), 2);
    assert.ok(context.cart.pending());
    assert.equal(context.cart.confirmation(), null);
  }
  const conflict = setup(); conflict.cart.add(products[0], 2);
  conflict.post = () => throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'stock_conflict', detail: 'Bestand prüfen' } }));
  await assert.rejects(firstValueFrom(conflict.cart.submit()), /Bestand prüfen/);
  assert.equal(conflict.cart.count(), 2);
  assert.equal(conflict.cart.pending(), null);
  assert.equal(conflict.cart.locked(), false);
  const csrfFailure = setup(); csrfFailure.cart.add(products[0], 2);
  csrfFailure.post = () => throwError(() => new HttpErrorResponse({ status: 403 }));
  await assert.rejects(firstValueFrom(csrfFailure.cart.submit()));
  assert.ok(csrfFailure.cart.pending(), 'An authentication/CSRF failure cannot discard an uncertain previous key');
  const unavailable = setup(); unavailable.cart.add(products[0], 1); unavailable.storage.blocked = true;
  await assert.rejects(firstValueFrom(unavailable.cart.submit()), /gespeichert/);
  assert.equal(unavailable.posts.length, 0);
  assert.equal(unavailable.cart.count(), 1);
  const network = setup(); network.cart.add(products[0], 2); network.listError = true; network.cart.refresh();
  assert.equal(network.cart.status(), 'error');
  assert.equal(network.cart.count(), 2, 'A refresh error must preserve quantities');
  const cleanup = setup(); cleanup.cart.add(products[0], 2);
  cleanup.post = () => { cleanup.storage.blocked = true; return of(receipt()); };
  const saved = await firstValueFrom(cleanup.cart.submit());
  const retainedKey = cleanup.cart.pending().key;
  assert.equal(cleanup.cart.count(), 0, 'A verified confirmation clears the in-memory cart');
  assert.equal(saved.id, receipt().id);
  assert.equal(cleanup.cart.locked(), true, 'Failed storage cleanup must keep the original retry key');
  cleanup.storage.blocked = false;
  cleanup.post = () => of(receipt());
  await firstValueFrom(cleanup.cart.submit());
  assert.equal(cleanup.posts[1].body.idempotency_key, retainedKey);
  assert.equal(cleanup.cart.pending(), null);
  assert.equal(cleanup.cart.storageWarning(), '');
  const invalidAttempt = { key: crypto.randomUUID(), items: [{ product_id: 1, quantity: 2 }] };
  assert.throws(() => verifyConfirmation({ ...receipt(), lines: [receipt().lines[0], receipt().lines[0]] }, invalidAttempt));

  console.log('PASS: cart persistence, untrusted storage/prices, exact cents, quantities, stock, missing products, add/update/remove, request failure, duplicate clicks, persisted retries, confirmation validation and storage failures.');
  console.log('Actual Angular service state tested with controlled HTTP responses; no browser/layout verification is claimed.');
} finally {
  for (const context of contexts) context.injector.destroy();
}
