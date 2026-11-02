import { createHash } from 'node:crypto';

export async function pressEnter(command) {
  // Enter has a character event as well as key events; do not replace this with .click().
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13,
    text: '\r', unmodifiedText: '\r',
  });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
}

function fingerprint(key) {
  return typeof key === 'string' ? createHash('sha256').update(key).digest('hex').slice(0, 16) : null;
}
function origin(value) {
  try { return new URL(value).origin; } catch { return null; }
}
function header(headers, name) {
  return Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === name)?.[1];
}
function observedHeaders(headers) {
  const value = header(headers, 'origin');
  return {
    httpOriginHeader: typeof value === 'string' ? value : null,
    csrfHeaderPresent: Boolean(header(headers, 'x-csrftoken')),
  };
}
function mergeExtraHeaders(record, extra) {
  record.extraInfoObserved = true;
  if (extra.httpOriginHeader !== null) {
    record.httpOriginHeader = extra.httpOriginHeader;
    record.httpOriginHeaderSource = 'requestWillBeSentExtraInfo';
  }
  record.csrfHeaderPresent ||= extra.csrfHeaderPresent;
}
function publicOrder(value) {
  if (!value || typeof value !== 'object') return { kind: 'unexpected-json' };
  const result = {};
  for (const key of ['id', 'created_at', 'is_simulated', 'currency', 'total', 'code']) {
    if (['string', 'boolean', 'number'].includes(typeof value[key])) result[key] = value[key];
  }
  // Record only known public order fields, never arbitrary response bodies or headers.
  if (Array.isArray(value.lines)) result.lines = value.lines.map((line) => Object.fromEntries(
    ['product_id', 'product_name', 'product_slug', 'quantity', 'unit_price', 'line_total']
      .filter(key => ['string', 'number'].includes(typeof line?.[key])).map(key => [key, line[key]]),
  ));
  return result;
}

export class CheckoutDiagnostics {
  #requests = new Map();
  #extraHeaders = new Map();
  #tasks = new Set();
  #key = null;
  #initialKey = null;
  constructor(command, databaseLookup = async () => ({ available: false })) {
    this.command = command;
    this.databaseLookup = databaseLookup;
    this.active = false;
    this.data = { expectedPath: '/bestaetigung', expectedSelector: 'app-confirmation #confirmation-title', requests: [] };
  }
  async start(initialAttempt) {
    this.active = true;
    this.#initialKey = initialAttempt?.key ?? null;
    this.data.pendingAttemptBeforeSubmit = Boolean(this.#initialKey);
    this.data.databaseBefore = await this.databaseLookup(null);
  }
  observe(method, params) {
    if (!this.active) return;
    if (method === 'Network.requestWillBeSentExtraInfo') {
      // ExtraInfo can precede or follow the request. Retain only safe observations.
      const extra = observedHeaders(params.headers);
      const record = this.#requests.get(params.requestId);
      if (record) mergeExtraHeaders(record, extra);
      else this.#extraHeaders.set(params.requestId, extra);
      return;
    }
    if (method === 'Network.requestWillBeSent') {
      const request = params.request;
      const pathname = new URL(request.url).pathname;
      if (!['/api/csrf/', '/api/simulated-orders/'].includes(pathname)) return;
      const record = {
        path: pathname, method: request.method, requestUrlOrigin: origin(request.url),
        ...observedHeaders(request.headers),
        httpOriginHeaderSource: header(request.headers, 'origin') === undefined ? null : 'requestWillBeSent',
        extraInfoObserved: false,
      };
      const extra = this.#extraHeaders.get(params.requestId);
      if (extra) { mergeExtraHeaders(record, extra); this.#extraHeaders.delete(params.requestId); }
      if (pathname === '/api/simulated-orders/' && request.method === 'POST') {
        try {
          const body = JSON.parse(request.postData ?? 'null');
          this.#key = typeof body?.idempotency_key === 'string' ? body.idempotency_key : null;
          record.idempotencyFingerprint = fingerprint(this.#key);
          record.reusesInitialAttempt = Boolean(this.#key && this.#key === this.#initialKey);
          record.items = Array.isArray(body?.items) ? body.items.map(item => ({ product_id: item.product_id, quantity: item.quantity })) : null;
        } catch { record.bodyReadable = false; }
      }
      this.data.requests.push(record);
      this.#requests.set(params.requestId, record);
    }
    const record = this.#requests.get(params.requestId);
    if (!record) return;
    if (method === 'Network.responseReceived') {
      record.status = params.response.status;
      record.contentType = params.response.mimeType;
    }
    if (method === 'Network.loadingFailed') record.networkFailed = true;
    if (method === 'Network.loadingFinished' && record.path === '/api/simulated-orders/') {
      const task = this.command('Network.getResponseBody', { requestId: params.requestId }).then(({ body, base64Encoded }) => {
        const text = base64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body;
        try { record.response = publicOrder(JSON.parse(text)); }
        catch {
          record.response = { kind: 'not-json' };
          if (record.status === 403) {
            const reason = [
              ['CSRF cookie not set', 'cookie-missing'], ['CSRF token missing', 'token-missing'],
              ['Origin checking failed', 'origin-rejected'], ['Referer checking failed', 'referer-rejected'],
              ['CSRF token from', 'token-rejected'],
            ].find(([phrase]) => text.includes(phrase));
            if (reason) record.response.csrfReason = reason[1];
          }
        }
      }).catch(() => { record.response = { kind: 'unavailable' }; });
      this.#tasks.add(task);
      void task.finally(() => this.#tasks.delete(task));
    }
  }
  async finish(state) {
    await Promise.all([...this.#tasks]);
    this.data.state = state;
    this.data.databaseAfter = await this.databaseLookup(this.#key);
    this.active = false;
    return this.data;
  }
}

export async function inspectLocalDatabase(file, key) {
  let database;
  try {
    const { DatabaseSync } = await import('node:sqlite');
    database = new DatabaseSync(file, { readOnly: true });
    const count = database.prepare('SELECT COUNT(*) AS count FROM catalog_simulatedorder').get().count;
    const row = key ? database.prepare('SELECT id, total FROM catalog_simulatedorder WHERE idempotency_key = ?').get(key.replaceAll('-', '')) : null;
    return { available: true, scope: 'local SQLite candidate; verify it is the database used by the server', count, matchedOrder: row ? { id: row.id, total: row.total } : null };
  } catch {
    return { available: false, reason: 'Local SQLite unavailable; registration can only be inferred from the HTTP response.' };
  } finally { database?.close(); }
}
