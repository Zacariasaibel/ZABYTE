import { Product } from './catalog.service';

// Bind generated assets to stable product slugs, never to a shared legacy SVG path.
// Both catalog and detail use this resolver through ProductImageComponent.
export const productPhotos: Readonly<Record<string, string>> = {
  'fjord-keys': '/assets/studio/keyboard-full.webp',
  'fjord-keys-mini': '/assets/studio/keyboard-compact.webp',
  'klang-headset': '/assets/studio/headphones.webp',
  'hafen-hub': '/assets/studio/hub.webp',
  'klang-speaker': '/assets/studio/speaker.webp',
  'polar-mouse': '/assets/studio/mouse.webp',
  'strom-usb-c': '/assets/studio/cable-usbc.webp',
  'weitsicht-stand': '/assets/studio/stand.webp',
  'nordlicht-lamp': '/assets/studio/lamp.webp',
  'wolke-deskmat': '/assets/studio/deskmat.webp',
};

export function resolveProductImage(product: Pick<Product, 'slug' | 'image'>): string {
  return productPhotos[product.slug] ?? product.image;
}
