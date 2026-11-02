import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire, registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'frontend/package.json'));

// Load the actual ngc output without a bundler or a DOM renderer.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@angular/') || specifier === 'rxjs' || specifier === 'tslib') {
      return { url: pathToFileURL(require.resolve(specifier)).href, shortCircuit: true };
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const url = new URL(specifier, context.parentURL);
      if (!existsSync(fileURLToPath(url)) && existsSync(fileURLToPath(url) + '.js')) {
        return { url: url.href + '.js', shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
});

await import('@angular/compiler');
const { createEnvironmentInjector, runInInjectionContext } = await import('@angular/core');
const { SIGNAL } = await import('@angular/core/primitives/signals');
const compiled = pathToFileURL(path.join(root, 'frontend/out-tsc/app/app/')).href;
const { ProductImageComponent } = await import(compiled + 'product-image.component.js');
const { productPhotos, resolveProductImage } = await import(compiled + 'product-photos.js');
const manifest = JSON.parse(readFileSync(path.join(root, 'docs/studio-assets.json'), 'utf8'));
const expectedRoles = {
  'fjord-keys': 'keyboard-full',
  'fjord-keys-mini': 'keyboard-compact',
  'klang-headset': 'headphones',
  'hafen-hub': 'hub',
  'klang-speaker': 'speaker',
  'polar-mouse': 'mouse',
  'strom-usb-c': 'cable-usbc',
  'weitsicht-stand': 'stand',
  'nordlicht-lamp': 'lamp',
  'wolke-deskmat': 'deskmat',
};

function webpDimensions(data) {
  assert.equal(data.toString('ascii', 0, 4), 'RIFF');
  assert.equal(data.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset + 8 <= data.length;) {
    const type = data.toString('ascii', offset, offset + 4);
    const size = data.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (type === 'VP8X') return [data.readUIntLE(start + 4, 3) + 1, data.readUIntLE(start + 7, 3) + 1];
    if (type === 'VP8 ') return [data.readUInt16LE(start + 6) & 0x3fff, data.readUInt16LE(start + 8) & 0x3fff];
    if (type === 'VP8L') {
      const bits = data.readUInt32LE(start + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = start + size + (size % 2);
  }
  throw new Error('WebP dimensions not found');
}

assert.equal(Object.keys(productPhotos).length, 10);
assert.equal(new Set(Object.values(productPhotos)).size, 10);
const hashes = new Set();
for (const [slug, role] of Object.entries(expectedRoles)) {
  const asset = manifest.assets.find((entry) => entry.role === role);
  assert.ok(asset, role);
  assert.equal(productPhotos[slug], asset.public_url);
  const data = readFileSync(path.join(root, asset.file));
  assert.equal(data.length, asset.bytes);
  const hash = createHash('sha256').update(data).digest('hex');
  assert.equal(hash, asset.sha256);
  hashes.add(hash);
  assert.deepEqual(webpDimensions(data), [1200, 900]);
  assert.ok(data.length < 150000);
  assert.equal(resolveProductImage({ slug, image: '/assets/products/keyboard.svg' }), asset.public_url);
}
assert.equal(hashes.size, 10);

const full = { slug: 'fjord-keys', image: '/assets/products/keyboard.svg', name: 'Full keyboard' };
const compact = { slug: 'fjord-keys-mini', image: full.image, name: 'Compact keyboard' };
assert.equal(resolveProductImage(full), '/assets/studio/keyboard-full.webp');
assert.equal(resolveProductImage(compact), '/assets/studio/keyboard-compact.webp');
assert.notEqual(resolveProductImage(full), resolveProductImage(compact));
assert.equal(resolveProductImage({ slug: 'custom', image: full.image }), full.image);

const injector = createEnvironmentInjector([]);
try {
  const component = runInInjectionContext(injector, () => new ProductImageComponent());
  const setProduct = (product) => {
    // Apply an Angular input value while avoiding a browser-only DOM renderer.
    const node = component.product[SIGNAL];
    node.applyValueToInputSignal(node, product);
  };
  for (const [slug, role] of Object.entries(expectedRoles)) {
    setProduct({ slug, image: '/assets/products/keyboard.svg', name: role });
    assert.equal(component.source(), productPhotos[slug]);
    assert.equal(component.isStudioImage(), true);
    component.useFallback();
    assert.equal(component.source(), '/assets/products/keyboard.svg');
    assert.equal(component.isStudioImage(), false);
    component.useFallback();
    assert.equal(component.source(), '/assets/products/keyboard.svg', 'No retry loop if the SVG also fails');
  }
  setProduct(full);
  assert.equal(component.source(), resolveProductImage(full));
  component.useFallback();
  assert.equal(component.source(), full.image);
  setProduct(compact);
  assert.equal(component.source(), resolveProductImage(compact), 'A failed full keyboard must not affect the compact keyboard');
  component.useFallback();
  assert.equal(component.source(), compact.image);
  setProduct(full);
  assert.equal(component.source(), resolveProductImage(full), 'Navigating back retries the full keyboard, even with the same object');
  component.useFallback();
  setProduct({ ...full });
  assert.equal(component.source(), resolveProductImage(full), 'New input for the same product resets the error');
  setProduct({ slug: 'custom', image: '/assets/products/custom.svg', name: 'Custom' });
  assert.equal(component.source(), '/assets/products/custom.svg');
  component.useFallback();
  assert.equal(component.source(), '/assets/products/custom.svg');
} finally {
  injector.destroy();
}

console.log('PASS: ten slugs, ten unique files and hashes, 1200x900 WebP assets, distinct keyboards sharing one SVG, and navigation-safe fallback.');
console.log('Actual Angular component state tested; no rendered browser or responsive layout is claimed.');
