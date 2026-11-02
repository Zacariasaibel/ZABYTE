import { createRequire, registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'frontend/package.json'));
registerHooks({ resolve(specifier, context, nextResolve) {
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
} });
await import('@angular/compiler');
export const compiled = pathToFileURL(path.join(root, 'frontend/out-tsc/app/app/')).href;
