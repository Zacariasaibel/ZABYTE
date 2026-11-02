import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { CatalogService, Product } from './catalog.service';
import { ProductImageComponent } from './product-image.component';
import { CartService } from './cart.service';
import { FormsModule } from '@angular/forms';
import { CatalogSort, catalogQuery, readCatalogFilters } from './catalog-filters';

type CatalogState =
  | { status: 'loading'; products: Product[] }
  | { status: 'ready'; products: Product[] }
  | { status: 'error'; products: Product[] };

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, ProductImageComponent, FormsModule],
  templateUrl: './catalog.component.html',
})
export class CatalogComponent {
  readonly cart = inject(CartService);
  private readonly api = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry = new Subject<void>();
  readonly state = signal<CatalogState>({ status: 'loading', products: [] });
  search = '';
  category = '';
  sort: CatalogSort = 'name';
  available = false;

  constructor() {
    this.route.queryParamMap.pipe(
      switchMap((params) => {
        Object.assign(this, readCatalogFilters(params));
        return this.retry.pipe(
          startWith(undefined),
          switchMap(() => this.api.products(this.search, this.category, this.sort, this.available).pipe(
            map((products): CatalogState => ({ status: 'ready', products })),
            startWith<CatalogState>({ status: 'loading', products: [] }),
            catchError(() => of<CatalogState>({ status: 'error', products: [] })),
          )),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((state) => this.state.set(state));
  }

  applyFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.filtersQuery(),
    });
  }

  resetFilters(): void {
    this.search = '';
    this.category = '';
    this.sort = 'name';
    this.available = false;
    this.applyFilters();
  }

  retryProducts(): void {
    this.retry.next();
  }

  filtersQuery() { return catalogQuery(this); }

  shortDescription(description: string): string {
    return description.split('. ')[0] + (description.includes('. ') ? '.' : '');
  }
}
