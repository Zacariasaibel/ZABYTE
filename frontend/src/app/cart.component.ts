import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartLine, CartService } from './cart.service';
import { EuroCentsPipe } from './euro-cents.pipe';
import { ProductImageComponent } from './product-image.component';
import { CheckoutStepsComponent } from './checkout-steps.component';

@Component({
  selector: 'app-cart', standalone: true,
  imports: [RouterLink, EuroCentsPipe, ProductImageComponent, CheckoutStepsComponent],
  template: `
    <section class="shopping-page shell" aria-labelledby="cart-title">
      <app-checkout-steps [step]="1" />
      <a class="back-link" routerLink="/" queryParamsHandling="preserve">← Weiter einkaufen</a>
      <h1 id="cart-title">Warenkorb</h1>
      @if (cart.storageWarning()) { <p class="inline-error" role="status">{{ cart.storageWarning() }}</p> }
      @if (cart.pending()) {
        <p class="pending-note">Eine Bestätigung steht noch aus. Bitte prüfe denselben Versuch an der Kasse, bevor du die Auswahl änderst.</p>
      }
      @if (!cart.count() && !cart.pending()) {
        <div class="state-panel"><h2>Dein Warenkorb ist leer.</h2><p>Entdecke Zubehör für deinen Arbeitsplatz.</p><a class="button primary" routerLink="/" queryParamsHandling="preserve">Weiter einkaufen</a></div>
      } @else {
        @if (cart.status() === 'loading') { <p class="loading-message" role="status">Preise und Verfügbarkeit werden geprüft …</p> }
        @if (cart.status() === 'error') {
          <div class="inline-error" role="alert">Preise und Verfügbarkeit konnten nicht geladen werden. Deine Auswahl bleibt erhalten.
            <button class="text-button" type="button" (click)="cart.refresh()">Erneut versuchen</button>
          </div>
        }
        <div class="shopping-layout">
          <div class="cart-lines">
            @for (line of cart.lines(); track line.productId) {
              <article class="cart-line">
                @if (line.product; as product) {
                  <a class="cart-image" [routerLink]="['/produkte', product.slug]" queryParamsHandling="preserve" [attr.aria-label]="product.name"><app-product-image [product]="product" /></a>
                }
                <div class="cart-line-copy">
                  @if (line.product; as product) { <h2><a [routerLink]="['/produkte', product.slug]" queryParamsHandling="preserve">{{ product.name }}</a></h2> }
                  @else { <h2>Artikel #{{ line.productId }}</h2> }
                  @if (line.unitCents !== null) { <p class="muted">Einzelpreis: {{ line.unitCents | euroCents }}</p> }
                  @if (cart.status() === 'ready' && line.issue) { <p class="line-error">{{ line.issue }}</p> }
                  <label [for]="'quantity-' + line.productId">Menge</label>
                  <div class="quantity-controls">
                    <button type="button" class="quantity-button" [disabled]="cart.locked() || cart.busy() || line.quantity <= 1 || !line.product" (click)="cart.setQuantity(line.productId, line.quantity - 1)" [attr.aria-label]="'Menge für Artikel ' + line.productId + ' verringern'">−</button>
                    <input [id]="'quantity-' + line.productId" type="number" min="1" [max]="line.product ? line.product.stock : 10000" step="1" [value]="line.quantity" [disabled]="cart.locked() || cart.busy() || !line.product" (change)="changeQuantity(line, $event)">
                    <button type="button" class="quantity-button" [disabled]="cart.locked() || cart.busy() || !line.product || line.quantity >= line.product.stock || line.quantity >= 10000" (click)="cart.setQuantity(line.productId, line.quantity + 1)" [attr.aria-label]="'Menge für Artikel ' + line.productId + ' erhöhen'">+</button>
                  </div>
                  <button type="button" class="text-button remove-item" [disabled]="cart.locked() || cart.busy()" (click)="cart.remove(line.productId)" [attr.aria-label]="(line.product?.name ?? 'Artikel') + ' entfernen'">Entfernen</button>
                </div>
                <p class="line-subtotal">@if (line.subtotalCents !== null) { {{ line.subtotalCents | euroCents }} } @else { Preis ausstehend }</p>
              </article>
            }
          </div>
          <aside class="order-summary" aria-label="Warenkorbsumme">
            <h2>Zusammenfassung</h2><p>{{ cart.count() }} Artikel</p>
            <div class="summary-total"><span>Gesamtsumme</span><strong>@if (cart.totalsReady()) { {{ cart.totalCents() | euroCents }} } @else { Wird geprüft }</strong></div>
            @if (cart.canCheckout()) { <a class="button primary full-width" routerLink="/kasse" queryParamsHandling="preserve">Zur Kasse</a> }
            @else { <button class="button primary full-width" disabled type="button">Zur Kasse</button><p class="muted">Bitte Mengen und Verfügbarkeit prüfen.</p> }
          </aside>
        </div>
      }
    </section>
  `,
})
export class CartComponent {
  readonly cart = inject(CartService);
  constructor() { this.cart.refresh(); }
  changeQuantity(line: CartLine, event: Event): void {
    const input = event.target as HTMLInputElement;
    const quantity = input.valueAsNumber;
    input.value = String(line.quantity);
    this.cart.setQuantity(line.productId, quantity);
  }
}
