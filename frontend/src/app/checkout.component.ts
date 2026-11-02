import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CartService } from './cart.service';
import { EuroCentsPipe } from './euro-cents.pipe';
import { CheckoutStepsComponent } from './checkout-steps.component';

@Component({
  selector: 'app-checkout', standalone: true, imports: [RouterLink, EuroCentsPipe, CheckoutStepsComponent],
  template: `
    <section class="shopping-page checkout-page shell" aria-labelledby="checkout-title">
      <app-checkout-steps [step]="2" />
      <a class="back-link" routerLink="/warenkorb" queryParamsHandling="preserve">← Zum Warenkorb</a>
      <h1 id="checkout-title">Bestellung prüfen</h1>
      <p class="checkout-explanation">Hier wird eine simulierte Bestellung gespeichert. Es erfolgt keine Zahlung und kein Versand. Persönliche Daten sind nicht erforderlich.</p>
      @if (cart.pending()) { <p class="pending-note">Die Bestätigung eines Versuchs steht noch aus. Erneutes Senden verwendet dieselbe Anfragekennung.</p> }
      @if (cart.storageWarning()) { <p class="inline-error">{{ cart.storageWarning() }}</p> }
      @if (error()) { <p class="inline-error" role="alert">{{ error() }} Deine Auswahl bleibt erhalten.</p> }
      @if (!cart.count() && !cart.pending()) {
        <div class="state-panel"><h2>Keine Artikel ausgewählt.</h2><a class="button primary" routerLink="/">Weiter einkaufen</a></div>
      } @else {
        <div class="checkout-panel">
          <h2>Deine Auswahl</h2>
          @for (line of cart.lines(); track line.productId) {
            <div class="checkout-line"><span>{{ line.product?.name ?? 'Artikel #' + line.productId }} <span class="muted">× {{ line.quantity }}</span></span><strong>@if (line.subtotalCents !== null) { {{ line.subtotalCents | euroCents }} } @else { Preis ausstehend }</strong></div>
            @if (cart.status() === 'ready' && line.issue) { <p class="line-error">{{ line.issue }}</p> }
          }
          @if (cart.status() === 'loading') { <p role="status">Preise und Verfügbarkeit werden geprüft …</p> }
          @if (cart.status() === 'error') { <p class="inline-error">Die aktuellen Preise sind nicht erreichbar. <button class="text-button" (click)="cart.refresh()" type="button">Erneut laden</button></p> }
          <div class="summary-total"><span>Gesamtsumme</span><strong>@if (cart.totalsReady()) { {{ cart.totalCents() | euroCents }} } @else { Wird vom Server geprüft }</strong></div>
          <button type="button" class="button primary checkout-submit" [disabled]="!cart.canCheckout()" (click)="submit()">{{ cart.submitting() ? 'Anfrage wird gesendet …' : cart.pending() ? 'Bestätigung erneut abrufen' : 'Bestellung simulieren' }}</button>
        </div>
      }
    </section>
  `,
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  readonly error = signal('');
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  constructor() { this.cart.refresh(); }
  submit(): void {
    if (!this.cart.canCheckout()) return;
    this.error.set('');
    this.cart.submit().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { void this.router.navigate(['/bestaetigung']); },
      error: (error: unknown) => this.error.set(error instanceof Error ? error.message : 'Die Anfrage konnte nicht bestätigt werden.'),
    });
  }
}
