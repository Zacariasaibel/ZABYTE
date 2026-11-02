import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { catchError, finalize, map, Observable, Subscription, switchMap, tap, throwError } from 'rxjs';
import { CatalogService, Product } from './catalog.service';
import { CartEntry, MAX_ITEMS, MAX_QUANTITY, OrderAttempt, parseAttempt, parseCart, positiveInteger, priceToCents, SimulatedOrder, verifyConfirmation } from './cart-state';

export const CART_STORAGE = new InjectionToken<Storage | null>('CART_STORAGE', {
  providedIn: 'root', factory: () => { try { return window.localStorage; } catch { return null; } },
});
export const CART_KEY = 'zabyte.cart.v1';
export const ATTEMPT_KEY = 'zabyte.checkout.v1';

export interface CartLine extends CartEntry {
  product: Product | null;
  unitCents: number | null;
  subtotalCents: number | null;
  issue: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(CatalogService);
  private readonly http = inject(HttpClient);
  private readonly storage = inject(CART_STORAGE);
  private readonly entries = signal<CartEntry[]>([]);
  private readonly products = signal<ReadonlyMap<number, Product>>(new Map());
  private readonly attempt = signal<OrderAttempt | null>(null);
  private refreshRequest?: Subscription;
  readonly status = signal<'loading' | 'ready' | 'error'>('loading');
  readonly busy = signal(false);
  readonly submitting = signal(false);
  readonly notice = signal('');
  readonly storageWarning = signal('');
  readonly confirmation = signal<SimulatedOrder | null>(null);
  readonly pending = this.attempt.asReadonly();
  readonly count = computed(() => this.entries().reduce((sum, entry) => sum + entry.quantity, 0));
  readonly lines = computed<CartLine[]>(() => this.entries().map((entry) => {
    const product = this.products().get(entry.productId) ?? null;
    let unitCents: number | null = null;
    if (product) { try { const cents = priceToCents(product.price); unitCents = cents > 0 ? cents : null; } catch { /* A bad API price must block checkout. */ } }
    const issue = !product ? 'Dieser Artikel ist nicht mehr verfügbar.' : unitCents === null ? 'Der Preis ist gerade nicht verfügbar.' :
      product.stock === 0 ? 'Dieser Artikel ist ausverkauft.' : entry.quantity > product.stock ? `Nur ${product.stock} Stück verfügbar. Bitte die Menge reduzieren.` : '';
    return { ...entry, product, unitCents, subtotalCents: unitCents === null ? null : unitCents * entry.quantity, issue };
  }));
  readonly totalsReady = computed(() => this.status() === 'ready' && this.lines().every((line) => line.subtotalCents !== null));
  readonly totalCents = computed(() => this.lines().reduce((sum, line) => sum + (line.subtotalCents ?? 0), 0));
  readonly valid = computed(() => this.status() === 'ready' && this.lines().length > 0 && this.lines().every((line) => !line.issue));
  readonly canCheckout = computed(() => !this.busy() && !this.submitting() && (this.pending() !== null || this.valid()));
  readonly locked = computed(() => this.pending() !== null || this.submitting());

  constructor() {
    try { this.entries.set(parseCart(this.storage?.getItem(CART_KEY) ?? null)); }
    catch { this.notice.set('Der gespeicherte Warenkorb war ungültig und wurde geleert.'); this.storageWarning.set('Der gespeicherte Warenkorb war ungültig. Bitte die Auswahl neu prüfen.'); this.entries.set([]); }
    try { this.attempt.set(parseAttempt(this.storage?.getItem(ATTEMPT_KEY) ?? null)); }
    catch { this.storageWarning.set('Eine gespeicherte Anfrage war ungültig. Bitte den Warenkorb prüfen.'); }
    this.persist();
    this.refresh();
  }

  refresh(): void {
    this.refreshRequest?.unsubscribe();
    this.status.set('loading');
    this.refreshRequest = this.api.products('', '').subscribe({
      next: (products) => { this.products.set(new Map(products.map((product) => [product.id, product]))); this.status.set('ready'); },
      error: () => this.status.set('error'),
    });
  }

  quantity(productId: number): number {
    return this.entries().find((entry) => entry.productId === productId)?.quantity ?? 0;
  }

  remaining(product: Product): number {
    const current = this.products().get(product.id) ?? product;
    return Math.max(0, Math.min(current.stock, MAX_QUANTITY) - this.quantity(product.id));
  }

  canAdd(product: Product): boolean {
    return !this.locked() && !this.busy() && product.stock > 0 && this.remaining(product) > 0;
  }

  add(product: Product, quantity = 1): void {
    if (this.locked() || this.busy()) return;
    if (!positiveInteger(quantity)) { this.notice.set('Bitte eine positive ganze Menge eingeben.'); return; }
    if (this.entries().length >= MAX_ITEMS && !this.quantity(product.id)) { this.notice.set('Der Warenkorb enthält bereits zu viele verschiedene Artikel.'); return; }
    this.updateQuantity(product, this.quantity(product.id) + quantity, true);
  }

  setQuantity(productId: number, quantity: number): void {
    if (this.locked() || this.busy()) return;
    const product = this.products().get(productId);
    if (!product) { this.notice.set('Dieser Artikel ist nicht mehr verfügbar. Du kannst ihn entfernen.'); return; }
    this.updateQuantity(product, quantity, false);
  }

  private updateQuantity(product: Product, quantity: number, added: boolean): void {
    if (!positiveInteger(quantity)) { this.notice.set('Bitte eine positive ganze Menge bis 10.000 eingeben.'); return; }
    this.busy.set(true);
    this.api.product(product.slug).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (fresh) => {
        if (fresh.id !== product.id || !positiveInteger(fresh.stock, Number.MAX_SAFE_INTEGER) || quantity > fresh.stock) {
          this.notice.set('Die gewünschte Menge ist nicht verfügbar. Bitte den Bestand prüfen.');
          this.products.update((products) => new Map(products).set(fresh.id, fresh));
          return;
        }
        try { if (priceToCents(fresh.price) <= 0) throw new Error(); }
        catch { this.notice.set('Der Preis konnte nicht geprüft werden. Bitte erneut versuchen.'); return; }
        this.products.update((products) => new Map(products).set(fresh.id, fresh));
        this.entries.update((entries) => [...entries.filter((entry) => entry.productId !== fresh.id), { productId: fresh.id, quantity }]);
        this.persist();
        this.notice.set(added ? `${fresh.name} wurde zum Warenkorb hinzugefügt. Insgesamt ${quantity} Stück.` : `Menge für ${fresh.name} auf ${quantity} geändert.`);
      },
      error: () => this.notice.set('Der Artikel konnte nicht geprüft werden. Bitte erneut versuchen.'),
    });
  }

  remove(productId: number): void {
    if (this.locked() || this.busy()) return;
    this.entries.update((entries) => entries.filter((entry) => entry.productId !== productId));
    this.persist();
    this.notice.set('Artikel aus dem Warenkorb entfernt.');
  }

  dismissNotice(): void { this.notice.set(''); }

  private persist(): boolean {
    try {
      if (!this.storage) throw new Error();
      this.storage.setItem(CART_KEY, JSON.stringify({ version: 1, items: this.entries() }));
      return true;
    } catch {
      this.storageWarning.set('Der Browser kann den Warenkorb nicht dauerhaft speichern.');
      return false;
    }
  }

  submit(): Observable<SimulatedOrder> {
    if (this.submitting() || this.busy()) return throwError(() => new Error('Bitte die laufende Anfrage abwarten.'));
    let attempt = this.attempt();
    if (!attempt) {
      if (!this.valid()) return throwError(() => new Error('Bitte den Warenkorb und die Verfügbarkeit prüfen.'));
      attempt = {
        key: crypto.randomUUID(),
        items: this.entries().map((entry) => ({ product_id: entry.productId, quantity: entry.quantity })).sort((a, b) => a.product_id - b.product_id),
      };
    }
    try {
      if (!this.storage || !this.persist()) throw new Error();
      this.storage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    } catch { return throwError(() => new Error('Die Anfrage kann nicht sicher gespeichert werden. Bitte lokalen Browserspeicher zulassen.')); }
    this.attempt.set(attempt);
    this.submitting.set(true);
    const submitted = attempt;
    return this.http.get<{ csrfToken: string }>('/api/csrf/').pipe(
      switchMap(({ csrfToken }) => this.http.post<unknown>('/api/simulated-orders/', {
        idempotency_key: submitted.key, items: submitted.items,
      }, { headers: { 'X-CSRFToken': csrfToken } })),
      map((value) => verifyConfirmation(value, submitted)),
      tap((order) => {
        this.confirmation.set(order);
        this.entries.set([]);
        let cleared = this.persist();
        if (cleared) { try { this.storage!.removeItem(ATTEMPT_KEY); } catch { cleared = false; } }
        if (cleared) { this.attempt.set(null); this.storageWarning.set(''); }
        else this.storageWarning.set('Die Bestätigung liegt vor, aber der lokale Speicher konnte nicht bereinigt werden. Bitte erneut bestätigen, bevor du neue Artikel hinzufügst.');
        this.notice.set('Die simulierte Bestellung wurde bestätigt.');
      }),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && [400, 409].includes(error.status) &&
            ['invalid_order', 'stock_conflict', 'idempotency_conflict'].includes(String(error.error?.code))) {
          try { this.storage!.removeItem(ATTEMPT_KEY); this.attempt.set(null); } catch { /* Keep the same key if storage cannot be cleared. */ }
        }
        const message = error instanceof HttpErrorResponse
          ? typeof error.error?.detail === 'string' ? error.error.detail : 'Die Bestätigung konnte nicht geladen werden. Bitte denselben Versuch erneut senden.'
          : error instanceof Error ? error.message : 'Die Anfrage konnte nicht bestätigt werden.';
        return throwError(() => new Error(message));
      }),
      finalize(() => this.submitting.set(false)),
    );
  }
}
