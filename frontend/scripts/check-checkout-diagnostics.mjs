import assert from 'node:assert/strict';
import { CheckoutDiagnostics, inspectLocalDatabase, pressEnter } from './checkout-diagnostics.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, rm } from 'node:fs/promises';

const calls = [];
await pressEnter(async (method, params) => { calls.push({ method, params }); });
assert.equal(calls.length, 2);
assert.equal(calls[0].params.text, '\r', 'Enter must include the character used for native button activation');
assert.equal(calls[0].params.unmodifiedText, '\r');
assert.equal(calls[1].params.type, 'keyUp');

const key = '11111111-1111-4111-8111-111111111111';
const receipt = { id: '22222222-2222-4222-8222-222222222222', is_simulated: true, currency: 'EUR', total: '29.90',
  lines: [{ product_id: 3, quantity: 1, unit_price: '29.90', line_total: '29.90' }], csrfToken: 'DO_NOT_LOG_RESPONSE_TOKEN' };
const queriedKeys = [];
const diagnostic = new CheckoutDiagnostics(async () => ({ body: JSON.stringify(receipt) }), async (value) => {
  queriedKeys.push(value); return { available: true, count: 1 };
});
await diagnostic.start({ key });
diagnostic.observe('Network.requestWillBeSent', { requestId: 'csrf', request: {
  method: 'GET', url: 'http://localhost:4200/api/csrf/', headers: { Cookie: 'DO_NOT_LOG_COOKIE' },
} });
diagnostic.observe('Network.responseReceived', { requestId: 'csrf', response: { status: 200, mimeType: 'application/json' } });
diagnostic.observe('Network.loadingFinished', { requestId: 'csrf' });
diagnostic.observe('Network.requestWillBeSent', { requestId: 'order', request: {
  method: 'POST', url: 'http://localhost:4200/api/simulated-orders/',
  headers: { Origin: 'http://localhost:4200', 'X-CSRFToken': 'DO_NOT_LOG_HEADER_TOKEN', Authorization: 'DO_NOT_LOG_AUTH' },
  postData: JSON.stringify({ idempotency_key: key, items: [{ product_id: 3, quantity: 1 }], secret: 'DO_NOT_LOG_REQUEST_SECRET' }),
} });
diagnostic.observe('Network.responseReceived', { requestId: 'order', response: { status: 201, mimeType: 'application/json', headers: { 'Set-Cookie': 'DO_NOT_LOG_COOKIE' } } });
diagnostic.observe('Network.loadingFinished', { requestId: 'order' });
const report = await diagnostic.finish({ path: '/bestaetigung' });
const encoded = JSON.stringify(report);
assert.ok(!encoded.includes('DO_NOT_LOG') && !encoded.includes(key), 'Artifacts exclude sensitive headers, tokens and raw attempt keys');
assert.equal(report.requests[1].status, 201);
assert.equal(report.requests[1].csrfHeaderPresent, true);
assert.equal(report.requests[1].requestUrlOrigin, 'http://localhost:4200');
assert.equal(report.requests[1].httpOriginHeader, 'http://localhost:4200');
assert.equal(report.requests[1].httpOriginHeaderSource, 'requestWillBeSent');
assert.equal(report.requests[1].reusesInitialAttempt, true);
assert.equal(report.requests[1].response.id, receipt.id);
assert.deepEqual(queriedKeys, [null, key]);
assert.equal(report.requests[0].response, undefined, 'Never retrieve the CSRF response body');

const failure = new CheckoutDiagnostics(async () => ({ body: '<html>DO_NOT_LOG_DEBUG_PAGE</html>' }));
await failure.start(null);
failure.observe('Network.requestWillBeSent', { requestId: 'failed', request: { method: 'POST', url: 'http://localhost/api/simulated-orders/' } });
failure.observe('Network.responseReceived', { requestId: 'failed', response: { status: 403, mimeType: 'text/html' } });
failure.observe('Network.loadingFinished', { requestId: 'failed' });
const failed = await failure.finish({ path: '/kasse' });
assert.equal(failed.requests[0].status, 403);
assert.deepEqual(failed.requests[0].response, { kind: 'not-json' });
assert.ok(!JSON.stringify(failed).includes('DEBUG_PAGE'));
const csrf = new CheckoutDiagnostics(async () => ({ body: '<html>CSRF cookie not set. DO_NOT_LOG_DEBUG_PAGE</html>' }));
await csrf.start(null);
csrf.observe('Network.requestWillBeSent', { requestId: 'csrf-failure', request: { method: 'POST', url: 'http://localhost/api/simulated-orders/' } });
csrf.observe('Network.responseReceived', { requestId: 'csrf-failure', response: { status: 403, mimeType: 'text/html' } });
csrf.observe('Network.loadingFinished', { requestId: 'csrf-failure' });
const csrfReport = await csrf.finish({ path: '/kasse' });
assert.equal(csrfReport.requests[0].response.csrfReason, 'cookie-missing');
assert.ok(!JSON.stringify(csrfReport).includes('DEBUG_PAGE'));
const missing = new CheckoutDiagnostics(async () => assert.fail('No request means no response retrieval'));
await missing.start(null);
assert.deepEqual((await missing.finish({ path: '/kasse' })).requests, [], 'No POST remains distinguishable from a rejected POST');

for (const extraFirst of [true, false]) {
  const correlated = new CheckoutDiagnostics(async () => assert.fail('No body requested in header tests'));
  await correlated.start(null);
  const extra = { requestId: 'target', headers: {
    oRiGiN: 'http://different-origin.example', 'x-CsRfToKeN': 'DO_NOT_LOG_EXTRA_TOKEN',
    Cookie: 'DO_NOT_LOG_EXTRA_COOKIE', Authorization: 'DO_NOT_LOG_EXTRA_AUTH',
  } };
  if (extraFirst) correlated.observe('Network.requestWillBeSentExtraInfo', extra);
  correlated.observe('Network.requestWillBeSentExtraInfo', { requestId: 'unrelated', headers: { Origin: 'http://unrelated.example' } });
  correlated.observe('Network.requestWillBeSent', { requestId: 'target', request: {
    method: 'POST', url: 'http://localhost:4200/api/simulated-orders/', headers: {},
  } });
  if (!extraFirst) correlated.observe('Network.requestWillBeSentExtraInfo', extra);
  const result = await correlated.finish({ path: '/bestaetigung' });
  assert.equal(result.requests.length, 1);
  const request = result.requests[0];
  assert.equal(request.requestUrlOrigin, 'http://localhost:4200', 'Destination is derived from the real URL, not the Origin header');
  assert.equal(request.httpOriginHeader, 'http://different-origin.example', 'Observed mismatches are never replaced with the expected origin');
  assert.equal(request.httpOriginHeaderSource, 'requestWillBeSentExtraInfo');
  assert.equal(request.csrfHeaderPresent, true);
  assert.equal(request.extraInfoObserved, true);
  assert.ok(!JSON.stringify(result).includes('DO_NOT_LOG'));
}
for (const extra of [null, {}, { Cookie: 'DO_NOT_LOG_COOKIE' }]) {
  const absent = new CheckoutDiagnostics(async () => {});
  await absent.start(null);
  absent.observe('Network.requestWillBeSent', { requestId: 'absent', request: {
    method: 'POST', url: 'https://another-destination.example/api/simulated-orders/', headers: {},
  } });
  if (extra !== null) absent.observe('Network.requestWillBeSentExtraInfo', { requestId: 'absent', headers: extra });
  const request = (await absent.finish({})).requests[0];
  assert.equal(request.requestUrlOrigin, 'https://another-destination.example', 'A cross-origin destination cannot pass the same-origin assertion');
  assert.equal(request.httpOriginHeader, null, 'Absent Origin remains absent with or without ExtraInfo');
  assert.equal(request.httpOriginHeaderSource, null);
  assert.equal(request.csrfHeaderPresent, false, 'Missing CSRF evidence must not pass');
}
const literalNull = new CheckoutDiagnostics(async () => {});
await literalNull.start(null);
literalNull.observe('Network.requestWillBeSent', { requestId: 'literal-null', request: {
  method: 'POST', url: 'http://localhost:4200/api/simulated-orders/', headers: { ORIGIN: 'null' },
} });
literalNull.observe('Network.requestWillBeSentExtraInfo', { requestId: 'literal-null', headers: {} });
const literal = (await literalNull.finish({})).requests[0];
assert.equal(literal.httpOriginHeader, 'null', 'An observed literal null Origin is different from no observation');
assert.equal(literal.httpOriginHeaderSource, 'requestWillBeSent');
assert.equal(literal.requestUrlOrigin, 'http://localhost:4200');

// Test the optional database correlation on a disposable file, never the shop database.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const directory = path.join(root, '.local');
await mkdir(directory, { recursive: true });
const databasePath = path.join(directory, `checkout-diagnostic-test-${process.pid}.sqlite3`);
const { DatabaseSync } = await import('node:sqlite');
const db = new DatabaseSync(databasePath);
try {
  db.exec('CREATE TABLE catalog_simulatedorder (id TEXT, idempotency_key TEXT UNIQUE, total NUMERIC)');
  db.prepare('INSERT INTO catalog_simulatedorder VALUES (?, ?, ?)').run(receipt.id.replaceAll('-', ''), key.replaceAll('-', ''), '29.90');
} finally { db.close(); }
try {
  const result = await inspectLocalDatabase(databasePath, key);
  assert.equal(result.count, 1);
  assert.equal(result.matchedOrder.id, receipt.id.replaceAll('-', ''));
  assert.equal((await inspectLocalDatabase(databasePath, 'not-present')).matchedOrder, null);
  const again = new DatabaseSync(databasePath, { readOnly: true });
  try { assert.equal(again.prepare('SELECT COUNT(*) AS count FROM catalog_simulatedorder').get().count, 1); }
  finally { again.close(); }
} finally { await rm(databasePath); }
console.log('PASS checkout diagnostics: URL/header origin separation, ExtraInfo in either order, requestId isolation, missing/mismatched headers, CSRF evidence, redaction, Enter, receipt, reuse and read-only SQLite.');
