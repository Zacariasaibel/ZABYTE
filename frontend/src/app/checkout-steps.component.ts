import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-checkout-steps', standalone: true, imports: [RouterLink],
  template: `<ol class="checkout-steps" aria-label="Bestellschritte">
    <li [attr.aria-current]="step() === 1 ? 'step' : null"><a routerLink="/warenkorb" queryParamsHandling="preserve">Warenkorb</a></li>
    <li [attr.aria-current]="step() === 2 ? 'step' : null"><span class="step-arrow" aria-hidden="true">→</span>@if (step() >= 2) { <a routerLink="/kasse" queryParamsHandling="preserve">Bestellung prüfen</a> } @else { Bestellung prüfen }</li>
    <li [attr.aria-current]="step() === 3 ? 'step' : null"><span class="step-arrow" aria-hidden="true">→</span>Bestätigung</li>
  </ol>`,
})
export class CheckoutStepsComponent { readonly step = input.required<1 | 2 | 3>(); }
