import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { convertToParamMap, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { CatalogService, Category } from './catalog.service';
import { CartService } from './cart.service';
import { CatalogFilters, catalogQuery, readCatalogFilters } from './catalog-filters';
import { CartNoticeComponent } from './cart-notice.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterOutlet, CartNoticeComponent],
  template: `
    <a class="skip-link" href="#main">Zum Inhalt springen</a>
    <header class="site-header">
      <div class="header-main shell">
        <a class="brand" routerLink="/" aria-label="ZABYTE – zum Katalog">
          <span>ZA<span class="brand-accent">BYTE</span></span>
        </a>
        <form class="header-search" (ngSubmit)="searchProducts()" role="search">
          <label class="visually-hidden" for="search">Produkte suchen</label>
          <input id="search" name="search" type="search" [ngModel]="search()"
            (ngModelChange)="search.set($event)" placeholder="Produkte suchen …"
            maxlength="120" autocomplete="off">
          <button type="submit" class="button primary">Suchen</button>
        </form>
        <a class="cart-access" routerLink="/warenkorb" queryParamsHandling="preserve" [attr.aria-label]="'Warenkorb, ' + cart.count() + ' Artikel'">
          <svg class="cart-icon" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
            <path d="m8 4-4 6m12-6 4 6M3 10h18M4 10l2 10h12l2-10M9 14v3m3-3v3m3-3v3" />
          </svg>
          <span>Warenkorb</span>
          <span class="cart-count">{{ cart.count() }}</span>
        </a>
      </div>
      <nav class="category-navigation" aria-label="Produktkategorien">
        <div class="category-links shell">
          <a routerLink="/" [queryParams]="categoryParams('')"
            [class.active]="!activeCategory()" [attr.aria-current]="!activeCategory() ? 'page' : null">Alle Produkte</a>
          @for (category of categories(); track category.id) {
            <a routerLink="/" [queryParams]="categoryParams(category.slug)"
              [class.active]="activeCategory() === category.slug"
              [attr.aria-current]="activeCategory() === category.slug ? 'page' : null">{{ category.name }}</a>
          }
        </div>
      </nav>
      @if (categoriesError()) {
        <div class="inline-error shell" role="alert">Kategorien konnten nicht geladen werden.
          <button type="button" class="text-button" (click)="loadCategories()">Erneut laden</button>
        </div>
      }
    </header>
    <app-cart-notice [message]="cart.notice()" (closed)="cart.dismissNotice()" />
    <main id="main" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer shell">
      <a routerLink="/" class="footer-brand">ZABYTE</a>
      <a routerLink="/" queryParamsHandling="preserve">Zum Katalog</a>
    </footer>
  `,
})
export class AppComponent {
  readonly cart = inject(CartService);
  private readonly api = inject(CatalogService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly categories = signal<Category[]>([]);
  readonly categoriesError = signal(false);
  readonly search = signal('');
  readonly activeCategory = signal('');
  private readonly currentFilters = signal<CatalogFilters>({ search: '', category: '', sort: 'name', available: false });
  private seenNavigation = false;

  constructor() {
    this.loadCategories();
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      startWith(null),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        if (this.seenNavigation) this.cart.dismissNotice();
        this.seenNavigation = true;
      }
      const params = this.router.parseUrl(this.router.url).queryParams;
      const filters = readCatalogFilters(convertToParamMap(params));
      this.currentFilters.set(filters);
      this.search.set(filters.search);
      this.activeCategory.set(filters.category);
    });
  }

  categoryParams(category: string) {
    return catalogQuery({ ...this.currentFilters(), category });
  }

  searchProducts(): void {
    void this.router.navigate(['/'], {
      queryParams: catalogQuery({ ...this.currentFilters(), search: this.search() }),
    });
  }

  loadCategories(): void {
    this.categoriesError.set(false);
    this.api.categories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categoriesError.set(true),
    });
  }
}
