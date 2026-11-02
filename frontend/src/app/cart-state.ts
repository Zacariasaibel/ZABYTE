export const MAX_QUANTITY = 10000;
export const MAX_ITEMS = 100;

export interface CartEntry { productId: number; quantity: number; }
export interface OrderItem { product_id: number; quantity: number; }
export interface OrderAttempt { key: string; items: OrderItem[]; }
export interface SimulatedOrderLine {
  product_id: number;
  product_name: string;
  product_slug: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}
export interface SimulatedOrder {
  id: string;
  created_at: string;
  is_simulated: true;
  currency: 'EUR';
  total: string;
  lines: SimulatedOrderLine[];
}

export function positiveInteger(value: unknown, maximum = MAX_QUANTITY): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= maximum;
}

export function priceToCents(price: string): number {
  if (typeof price !== 'string' || !/^\d+\.\d{2}$/.test(price)) throw new Error('Ungültiger Preis.');
  const [whole, fraction] = price.split('.');
  const cents = Number(whole) * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Ungültiger Preis.');
  return cents;
}

export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Ungültiger Betrag.');
  return new Intl.NumberFormat('de-DE').format(Math.floor(cents / 100)) + ',' + String(cents % 100).padStart(2, '0') + '\u00a0€';
}

export function parseCart(raw: string | null): CartEntry[] {
  if (raw === null) return [];
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 ||
      !('items' in value) || !Array.isArray(value.items) || value.items.length > MAX_ITEMS) {
    throw new Error('Ungültiger gespeicherter Warenkorb.');
  }
  const result: CartEntry[] = [];
  const seen = new Set<number>();
  for (const item of value.items as unknown[]) {
    if (!item || typeof item !== 'object' || !('productId' in item) || !('quantity' in item) ||
        !positiveInteger(item.productId, Number.MAX_SAFE_INTEGER) || !positiveInteger(item.quantity) || seen.has(item.productId)) {
      throw new Error('Ungültiger gespeicherter Warenkorb.');
    }
    seen.add(item.productId);
    result.push({ productId: item.productId, quantity: item.quantity });
  }
  return result;
}

export function parseAttempt(raw: string | null): OrderAttempt | null {
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('key' in value) || typeof value.key !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.key) ||
      !('items' in value) || !Array.isArray(value.items) || value.items.length === 0) {
    throw new Error('Ungültige gespeicherte Anfrage.');
  }
  const entries = parseCart(JSON.stringify({ version: 1, items: value.items.map((item: unknown) => {
    if (!item || typeof item !== 'object' || !('product_id' in item) || !('quantity' in item)) return null;
    return { productId: item.product_id, quantity: item.quantity };
  }) }));
  return { key: value.key, items: entries.map((entry) => ({ product_id: entry.productId, quantity: entry.quantity })) };
}

export function verifyConfirmation(value: unknown, attempt: OrderAttempt): SimulatedOrder {
  if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string' ||
      !/^[0-9a-f-]{36}$/i.test(value.id) || !('is_simulated' in value) || value.is_simulated !== true ||
      !('currency' in value) || value.currency !== 'EUR' || !('total' in value) || typeof value.total !== 'string' ||
      !('created_at' in value) || typeof value.created_at !== 'string' || !Number.isFinite(Date.parse(value.created_at)) ||
      !('lines' in value) || !Array.isArray(value.lines) || value.lines.length !== attempt.items.length) {
    throw new Error('Die Serverbestätigung ist unvollständig. Bitte denselben Versuch erneut senden.');
  }
  const remaining = new Map(attempt.items.map((item) => [item.product_id, item.quantity]));
  let sum = 0;
  for (const line of value.lines as unknown[]) {
    if (!line || typeof line !== 'object' || !('product_id' in line) || !('quantity' in line) ||
        !positiveInteger(line.product_id, Number.MAX_SAFE_INTEGER) || !positiveInteger(line.quantity) ||
        remaining.get(line.product_id) !== line.quantity || !('unit_price' in line) || typeof line.unit_price !== 'string' ||
        !('line_total' in line) || typeof line.line_total !== 'string' || !('product_name' in line) ||
        typeof line.product_name !== 'string' || !('product_slug' in line) || typeof line.product_slug !== 'string') {
      throw new Error('Die Serverbestätigung passt nicht zur Auswahl. Bitte erneut versuchen.');
    }
    const unit = priceToCents(line.unit_price);
    const subtotal = priceToCents(line.line_total);
    if (unit <= 0 || subtotal !== unit * line.quantity) throw new Error('Die Serverbestätigung enthält ungültige Beträge.');
    sum += subtotal;
    remaining.delete(line.product_id);
  }
  if (remaining.size || !Number.isSafeInteger(sum) || sum !== priceToCents(value.total)) {
    throw new Error('Die Serverbestätigung enthält eine ungültige Summe.');
  }
  return value as SimulatedOrder;
}
