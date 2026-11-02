import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from './cart.service';
import { priceToCents } from './cart-state';
import { EuroCentsPipe } from './euro-cents.pipe';
import { CheckoutStepsComponent } from './checkout-steps.component';

@Component({
  selector: 'app-confirmation', standalone: true, imports: [RouterLink, EuroCentsPipe, CheckoutStepsComponent],
  template: `
    <section class="shopping-page checkout-page shell" aria-labelledby="confirmation-title">
      <app-checkout-steps [step]="cart.confirmation() ? 3 : cart.pending() ? 2 : 1" />
      @if (cart.confirmation(); as order) {
        <div class="confirmation-panel"><h1 id="confirmation-title">Simulation bestätigt</h1>
          <p>Die simulierte Bestellung wurde gespeichert. Es wurde keine Zahlung ausgelöst und kein Versand beauftragt.</p>
          <p class="order-reference">Bestellkennung: <strong>{{ order.id }}</strong></p>
          @for (line of order.lines; track line.product_id) { <div class="checkout-line"><span>{{ line.product_name }} × {{ line.quantity }}</span><strong>{{ cents(line.line_total) | euroCents }}</strong></div> }
          <div class="summary-total"><span>Bestätigte Gesamtsumme</span><strong>{{ cents(order.total) | euroCents }}</strong></div>
          @if (cart.storageWarning()) { <p class="inline-error">{{ cart.storageWarning() }}</p> }
          <a class="button primary" routerLink="/">Weiter einkaufen</a>
        </div>
      } @else {
        <div class="state-panel"><h1 id="confirmation-title">Keine Bestätigung geöffnet.</h1><p>Eine Bestätigung wird direkt nach der Serverantwort hier angezeigt.</p>
          <a class="button primary" [routerLink]="cart.pending() ? '/kasse' : '/warenkorb'">{{ cart.pending() ? 'Bestätigung erneut abrufen' : 'Zum Warenkorb' }}</a>
        </div>
      }
    </section>
  `,
})
export class ConfirmationComponent {
  readonly cart = inject(CartService);
  readonly cents = priceToCents;
}
