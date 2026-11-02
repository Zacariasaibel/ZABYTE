import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CatalogSort } from './catalog-filters';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  description: string;
  price: string;
  category: Category;
  image: string;
  stock: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  categories() {
    return this.http.get<Category[]>('/api/categories/');
  }

  products(search: string, category: string, sort: CatalogSort = 'name', available = false) {
    const params = new HttpParams().set('search', search).set('category', category)
      .set('sort', sort).set('available', available ? '1' : '0');
    return this.http.get<Product[]>('/api/products/', { params });
  }

  product(slug: string) {
    return this.http.get<Product>(`/api/products/${encodeURIComponent(slug)}/`);
  }
}
