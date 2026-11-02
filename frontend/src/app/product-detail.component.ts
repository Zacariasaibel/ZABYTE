import { CurrencyPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { CatalogService, Product } from './catalog.service';
import { ProductImageComponent } from './product-image.component';
import { FormsModule } from '@angular/forms';
import { CartService } from './cart.service';

type DetailState =
  | { status: 'loading' | 'missing' | 'error'; product: null }
  | { status: 'ready'; product: Product };

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, ProductImageComponent, FormsModule],
  template: `
    <section class="detail-section shell">
      <a class="back-link" routerLink="/" queryParamsHandling="preserve">← Zurück zum Katalog</a>
      @if (state().status === 'loading') {
        <div class="state-panel" role="status">Produkt wird geladen …</div>
      } @else if (state().status === 'missing') {
        <div class="state-panel" role="alert">
          <h1>Produkt nicht gefunden.</h1>
          <p>Dieses Produkt ist nicht verfügbar oder gehört nicht mehr zum Katalog.</p>
          <a class="button primary" routerLink="/" queryParamsHandling="preserve">Katalog öffnen</a>
        </div>
      } @else if (state().status === 'error') {
        <div class="state-panel" role="alert">
          <h1>Das Produkt konnte nicht geladen werden.</h1>
          <p>Bitte versuche es gleich noch einmal.</p>
          <button class="button primary" (click)="retry.next()" type="button">Erneut versuchen</button>
        </div>
      }
      @if (state().product; as product) {
        <div class="product-detail">
          <div class="detail-image"><app-product-image [product]="product" [priority]="true" /></div>
          <div class="detail-copy">
            <p class="product-category">{{ product.category.name }}</p>
            <h1>{{ product.name }}</h1>
            <p class="detail-price">{{ product.price | currency:'EUR' }}</p>
            <p class="detail-stock" [class.sold-out]="product.stock === 0">
              <span class="stock-dot" aria-hidden="true"></span>
              {{ product.stock > 0 ? 'Auf Lager · ' + product.stock + ' Stück' : 'Ausverkauft · Derzeit nicht verfügbar' }}
            </p>
            <form class="detail-purchase" (ngSubmit)="add(product)">
              <div class="quantity-field"><label for="detail-quantity">Menge</label><input id="detail-quantity" name="quantity" type="number" min="1" [max]="cart.remaining(product)" step="1" [ngModel]="quantity()" (ngModelChange)="quantity.set($event)" [disabled]="!cart.canAdd(product)"></div>
              <button class="button primary" type="submit" [disabled]="!cart.canAdd(product) || !validQuantity(product)">In den Warenkorb</button>
            </form>
            <div class="detail-description"><h2>Produktbeschreibung</h2><p>{{ product.description }}</p></div>
            <a class="text-link" routerLink="/" queryParamsHandling="preserve">Weitere Produkte ansehen →</a>
          </div>
        </div>
      }
    </section>
  `,
})
export class ProductDetailComponent {
  readonly cart = inject(CartService);
  readonly quantity = signal(1);
  private readonly api = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  readonly retry = new Subject<void>();
  readonly state = signal<DetailState>({ status: 'loading', product: null });

  constructor() {
    this.route.paramMap.pipe(
      switchMap((params) => this.retry.pipe(
        startWith(undefined),
        switchMap(() => this.api.product(params.get('slug') ?? '').pipe(
          map((product): DetailState => ({ status: 'ready', product })),
          startWith<DetailState>({ status: 'loading', product: null }),
          catchError((error: unknown) => of<DetailState>({
            status: error instanceof HttpErrorResponse && error.status === 404 ? 'missing' : 'error',
            product: null,
          })),
        )),
      )),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((state) => {
      this.state.set(state);
      if (state.status === 'loading') this.quantity.set(1);
      if (state.product) this.title.setTitle(state.product.name + ' · ZABYTE');
    });
  }

  validQuantity(product: Product): boolean {
    return Number.isInteger(this.quantity()) && this.quantity() > 0 && this.quantity() <= this.cart.remaining(product);
  }

  add(product: Product): void {
    if (this.validQuantity(product)) this.cart.add(product, this.quantity());
  }
}
