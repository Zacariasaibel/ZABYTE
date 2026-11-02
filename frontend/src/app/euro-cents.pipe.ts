import { Pipe, PipeTransform } from '@angular/core';
import { formatCents } from './cart-state';

@Pipe({ name: 'euroCents', standalone: true })
export class EuroCentsPipe implements PipeTransform {
  transform(cents: number): string { return formatCents(cents); }
}
