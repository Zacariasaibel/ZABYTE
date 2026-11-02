import { Component, computed, input, linkedSignal } from '@angular/core';
import { Product } from './catalog.service';
import { resolveProductImage } from './product-photos';

@Component({
  selector: 'app-product-image',
  standalone: true,
  template: `<img [src]="source()" [alt]="product().name"
    width="1200" height="900" [loading]="priority() ? 'eager' : 'lazy'" decoding="async" (error)="useFallback()">`,
})
export class ProductImageComponent {
  readonly product = input.required<Product>();
  readonly priority = input(false);
  private readonly failedSource = linkedSignal({
    source: this.product,
    computation: () => '',
  });
  readonly source = computed(() => {
    const product = this.product();
    const primary = resolveProductImage(product);
    return this.failedSource() === primary ? product.image : primary;
  });
  readonly isStudioImage = computed(() => this.source() !== this.product().image);

  useFallback(): void {
    const product = this.product();
    const primary = resolveProductImage(product);
    if (primary !== product.image && this.source() === primary) this.failedSource.set(primary);
  }
}
