import assert from 'node:assert/strict';
import { compiled } from './test-runtime.mjs';

const { createEnvironmentInjector, runInInjectionContext } = await import('@angular/core');
const { HttpClient } = await import('@angular/common/http');
const { ActivatedRoute, Router, NavigationEnd, convertToParamMap } = await import('@angular/router');
const { BehaviorSubject, Subject, of, throwError } = await import('rxjs');
const { CatalogService } = await import(compiled + 'catalog.service.js');
const { CartService } = await import(compiled + 'cart.service.js');
const { CatalogComponent } = await import(compiled + 'catalog.component.js');
const { AppComponent } = await import(compiled + 'app.component.js');
const { readCatalogFilters, catalogQuery } = await import(compiled + 'catalog-filters.js');

assert.deepEqual(readCatalogFilters(convertToParamMap({ sort: 'invalid', available: 'true' })),
  { search: '', category: '', sort: 'name', available: false });
assert.deepEqual(catalogQuery({ search: '  USB  ', category: '', sort: 'name', available: false }),
  { search: 'USB', category: null, sort: null, available: null });
let request;
const httpInjector = createEnvironmentInjector([{ provide: HttpClient, useValue: {
  get: (url, options) => { request = { url, options }; return of([]); },
} }]);
const service = runInInjectionContext(httpInjector, () => new CatalogService());
service.products('USB', 'eingabe', 'price_desc', true).subscribe();
assert.equal(request.url, '/api/products/');
assert.deepEqual(Object.fromEntries(request.options.params.keys().map(key => [key, request.options.params.get(key)])),
  { search: 'USB', category: 'eingabe', sort: 'price_desc', available: '1' });
service.products('', '').subscribe();
assert.equal(request.options.params.get('available'), '0', 'Cart refresh still loads sold-out products');

const query = { search: 'Tastatur', category: 'eingabe', sort: 'price_desc', available: '1' };
const params = new BehaviorSubject(convertToParamMap(query));
const calls = [];
const navigations = [];
let offline = false;
let response = [{ id: 1 }, { id: 2 }];
let dismissed = 0;
const events = new Subject();
const router = {
  url: '/?' + new URLSearchParams(query), events,
  parseUrl: (url) => ({ queryParams: Object.fromEntries(new URL(url, 'http://local.invalid').searchParams) }),
  navigate: (route, options) => { navigations.push({ route, ...options }); return Promise.resolve(true); },
};
const injector = createEnvironmentInjector([
  { provide: ActivatedRoute, useValue: { queryParamMap: params } },
  { provide: Router, useValue: router },
  { provide: CartService, useValue: { dismissNotice: () => { dismissed++; } } },
  { provide: CatalogService, useValue: {
    categories: () => of([]), products: (...args) => {
      calls.push(args); return offline ? throwError(() => new Error('offline')) : of(response);
    },
  } },
]);
try {
  const catalog = runInInjectionContext(injector, () => new CatalogComponent());
  const app = runInInjectionContext(injector, () => new AppComponent());
  assert.deepEqual(calls.at(-1), ['Tastatur', 'eingabe', 'price_desc', true], 'Reload restores all filters');
  assert.equal(catalog.state().products.length, 2);
  assert.deepEqual(catalog.filtersQuery(), query, 'Detail links carry every filter');
  assert.deepEqual(app.categoryParams('audio'), { ...query, category: 'audio' });
  app.search.set('USB'); app.searchProducts();
  assert.deepEqual(navigations.at(-1).queryParams, { ...query, search: 'USB' });
  events.next(new NavigationEnd(1, '/', router.url));
  assert.equal(dismissed, 0, 'Initial navigation preserves a restored-cart warning');
  router.url = '/warenkorb?' + new URLSearchParams(query);
  events.next(new NavigationEnd(2, '/', router.url));
  assert.equal(dismissed, 1, 'Notices are dismissed instead of repeated on cart navigation');
  const previous = { search: 'Maus', category: '', sort: 'price_asc', available: '0' };
  params.next(convertToParamMap(previous));
  assert.deepEqual(calls.at(-1), ['Maus', '', 'price_asc', false], 'Back restores the prior query');
  response = [];
  params.next(convertToParamMap(query));
  assert.equal(catalog.state().products.length, 0, 'Forward updates the result count including zero');
  offline = true; catalog.retryProducts();
  assert.equal(catalog.state().status, 'error');
  offline = false; catalog.retryProducts();
  assert.equal(catalog.state().status, 'ready');
  catalog.resetFilters();
  assert.deepEqual(navigations.at(-1).queryParams, { search: null, category: null, sort: null, available: null });
  assert.equal(catalog.sort, 'name'); assert.equal(catalog.available, false);
  const count = calls.length;
  injector.destroy();
  params.next(convertToParamMap({ search: 'after destroy' }));
  assert.equal(calls.length, count, 'Route subscriptions are released');
} finally {
  if (!injector.destroyed) injector.destroy();
  httpInjector.destroy();
}
console.log('PASS filters: API parameters, combined URL state, reload/back/forward, header, detail links, reset, empty/error/retry and navigation notices.');
