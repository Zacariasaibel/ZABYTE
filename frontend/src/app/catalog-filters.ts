import { ParamMap } from '@angular/router';

export type CatalogSort = 'name' | 'price_asc' | 'price_desc';
export interface CatalogFilters { search: string; category: string; sort: CatalogSort; available: boolean; }

export function readCatalogFilters(params: Pick<ParamMap, 'get'>): CatalogFilters {
  const sort = params.get('sort');
  return {
    search: params.get('search') ?? '', category: params.get('category') ?? '',
    sort: sort === 'price_asc' || sort === 'price_desc' ? sort : 'name',
    available: params.get('available') === '1',
  };
}

export function catalogQuery(filters: CatalogFilters) {
  return {
    search: filters.search.trim() || null, category: filters.category || null,
    sort: filters.sort === 'name' ? null : filters.sort,
    available: filters.available ? '1' : null,
  };
}
