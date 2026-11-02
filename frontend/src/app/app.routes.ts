import { Routes } from '@angular/router';
import { CatalogComponent } from './catalog.component';
import { ProductDetailComponent } from './product-detail.component';
import { NotFoundComponent } from './not-found.component';
import { CartComponent } from './cart.component';
import { CheckoutComponent } from './checkout.component';
import { ConfirmationComponent } from './confirmation.component';

export const routes: Routes = [
  { path: '', component: CatalogComponent, title: 'Katalog · ZABYTE' },
  { path: 'produkte/:slug', component: ProductDetailComponent, title: 'Produkt · ZABYTE' },
  { path: 'warenkorb', component: CartComponent, title: 'Warenkorb · ZABYTE' },
  { path: 'kasse', component: CheckoutComponent, title: 'Bestellung prüfen · ZABYTE' },
  { path: 'bestaetigung', component: ConfirmationComponent, title: 'Bestätigung · ZABYTE' },
  { path: '**', component: NotFoundComponent, title: 'Seite nicht gefunden · ZABYTE' },
];
