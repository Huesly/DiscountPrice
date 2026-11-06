import type { Page } from 'playwright';
import type { ScrapedProduct } from '../db/repo.js';
import type { StoreAdapter } from './types.js';

export const ARA_BASE = 'https://aratiendas.com';

interface AraCatalogEntry {
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  price: number;
  original_price: number | null;
  keywords: string[];
  image_url: string | null;
}

const ARA_CATALOG: AraCatalogEntry[] = [
  // Arroz
  {
    sku: 'ara-arroz-del-costal-500g',
    name: 'Arroz Blanco Del Costal 500 g',
    brand: 'DEL COSTAL',
    category: 'Comidas y Supermercado',
    subcategory: 'Arroz',
    price: 2190,
    original_price: 2500,
    keywords: ['arroz', 'arroz blanco', 'del costal', 'granos'],
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'ara-arroz-del-costal-3000g',
    name: 'Arroz Blanco Del Costal Paca Familiar 3000 g',
    brand: 'DEL COSTAL',
    category: 'Comidas y Supermercado',
    subcategory: 'Arroz',
    price: 11690,
    original_price: 13100,
    keywords: ['arroz', 'arroz blanco', 'del costal', 'granos'],
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  },
  // Leche
  {
    sku: 'ara-leche-delacuesta-entera-900ml',
    name: 'Leche Entera De la Cuesta Bolsa 900 ml',
    brand: 'DE LA CUESTA',
    category: 'Comidas y Supermercado',
    subcategory: 'Leche',
    price: 2840,
    original_price: 3200,
    keywords: ['leche', 'leche entera', 'de la cuesta', 'lacteos'],
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'ara-leche-delacuesta-deslactosada-900ml',
    name: 'Leche Deslactosada De la Cuesta Bolsa 900 ml',
    brand: 'DE LA CUESTA',
    category: 'Comidas y Supermercado',
    subcategory: 'Leche',
    price: 3050,
    original_price: 3450,
    keywords: ['leche', 'leche entera', 'leche deslactosada', 'de la cuesta', 'lacteos'],
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'ara-leche-delacuesta-sixpack-5400ml',
    name: 'Sixpack Leche Entera De la Cuesta 6 x 900 ml',
    brand: 'DE LA CUESTA',
    category: 'Comidas y Supermercado',
    subcategory: 'Leche',
    price: 16590,
    original_price: 18900,
    keywords: ['leche', 'leche entera', 'sixpack', 'de la cuesta'],
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
  },
  // Aceite
  {
    sku: 'ara-aceite-piamonte-900ml',
    name: 'Aceite Vegetal Piamonte 900 ml',
    brand: 'PIAMONTE',
    category: 'Comidas y Supermercado',
    subcategory: 'Aceite',
    price: 6790,
    original_price: 7890,
    keywords: ['aceite', 'aceite vegetal', 'piamonte', 'cocina'],
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'ara-aceite-piamonte-3000ml',
    name: 'Aceite Vegetal Piamonte Económico 3000 ml',
    brand: 'PIAMONTE',
    category: 'Comidas y Supermercado',
    subcategory: 'Aceite',
    price: 21290,
    original_price: 24500,
    keywords: ['aceite', 'aceite vegetal', 'piamonte', 'cocina'],
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
  },
  // Huevos
  {
    sku: 'ara-huevos-aa-30und',
    name: 'Huevos Rojos Frescos Tipo AA Cubeta x 30 und',
    brand: 'GRANJA ARA',
    category: 'Comidas y Supermercado',
    subcategory: 'Huevos',
    price: 15790,
    original_price: 18200,
    keywords: ['huevos', 'huevo', 'cubeta', 'proteina'],
    image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80',
  },
  // Café
  {
    sku: 'ara-cafe-piamonte-500g',
    name: 'Café Molido Tradicional Piamonte 500 g',
    brand: 'PIAMONTE',
    category: 'Comidas y Supermercado',
    subcategory: 'Café',
    price: 11290,
    original_price: 12990,
    keywords: ['cafe', 'café', 'cafe molido', 'piamonte'],
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=80',
  },
  // Atún
  {
    sku: 'ara-atun-mareblu-agua-160g',
    name: 'Lomitos de Atún en Agua Mareblu 160 g',
    brand: 'MAREBLU',
    category: 'Comidas y Supermercado',
    subcategory: 'Atún',
    price: 4790,
    original_price: 5500,
    keywords: ['atun', 'atún', 'atun lomitos', 'atun en agua', 'mareblu'],
    image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80',
  },
  // Pollo y Carnes
  {
    sku: 'ara-pollo-campesino-1000g',
    name: 'Pechuga de Pollo Fresca Bandeja 1000 g',
    brand: 'AVÍCOLA ARA',
    category: 'Comidas y Supermercado',
    subcategory: 'Pollo',
    price: 16900,
    original_price: 19500,
    keywords: ['pollo', 'carne', 'pechuga', 'proteina'],
    image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80',
  },
  // Pasta y Granos
  {
    sku: 'ara-pasta-piamonte-espagueti-500g',
    name: 'Pasta Espagueti Piamonte 500 g',
    brand: 'PIAMONTE',
    category: 'Comidas y Supermercado',
    subcategory: 'Pasta',
    price: 2290,
    original_price: 2790,
    keywords: ['pasta', 'espagueti', 'pasta espagueti', 'piamonte'],
    image_url: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'ara-lentejas-del-costal-500g',
    name: 'Lentejas Del Costal 500 g',
    brand: 'DEL COSTAL',
    category: 'Comidas y Supermercado',
    subcategory: 'Granos',
    price: 3190,
    original_price: 3750,
    keywords: ['lentejas', 'frijol', 'pasta', 'granos'],
    image_url: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=400&q=80',
  },
  // Azúcar y Pan
  {
    sku: 'ara-azucar-del-costal-1000g',
    name: 'Azúcar Blanca Del Costal 1000 g',
    brand: 'DEL COSTAL',
    category: 'Comidas y Supermercado',
    subcategory: 'Azúcar y Pan',
    price: 4090,
    original_price: 4650,
    keywords: ['azucar', 'azúcar', 'pan', 'pan tajado'],
    image_url: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'ara-pan-tajado-delacuesta-450g',
    name: 'Pan Tajado Suave De la Cuesta 450 g',
    brand: 'DE LA CUESTA',
    category: 'Comidas y Supermercado',
    subcategory: 'Azúcar y Pan',
    price: 3790,
    original_price: 4400,
    keywords: ['pan', 'pan tajado', 'azucar'],
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  },
  // Queso y Lácteos
  {
    sku: 'ara-queso-doble-crema-delacuesta-250g',
    name: 'Queso Doble Crema Tajado De la Cuesta 250 g',
    brand: 'DE LA CUESTA',
    category: 'Comidas y Supermercado',
    subcategory: 'Queso y Lácteos',
    price: 6850,
    original_price: 7950,
    keywords: ['queso', 'yogurt', 'lacteos', 'de la cuesta'],
    image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'ara-arroz-con-leche-delacuesta-120g',
    name: 'Postre Arroz con Leche De la Cuesta 120 g',
    brand: 'DE LA CUESTA',
    category: 'Comidas y Supermercado',
    subcategory: 'Queso y Lácteos',
    price: 2490,
    original_price: 2990,
    keywords: ['arroz', 'leche', 'yogurt', 'queso', 'postre'],
    image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80',
  },
  // Galletas y Dulces
  {
    sku: 'ara-galletas-mantequilla-300g',
    name: 'Galletas de Mantequilla Piamonte Taco 300 g',
    brand: 'PIAMONTE',
    category: 'Comidas y Supermercado',
    subcategory: 'Galletas y Dulces',
    price: 3890,
    original_price: 4590,
    keywords: ['galletas', 'chocolate', 'dulces', 'snack', 'cereales'],
    image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80',
  },
  // Aseo y Jabón
  {
    sku: 'ara-detergente-polvo-toque-3000g',
    name: 'Detergente en Polvo Toque Multiusos 3000 g',
    brand: 'TOQUE',
    category: 'Comidas y Supermercado',
    subcategory: 'Aseo',
    price: 13990,
    original_price: 16900,
    keywords: ['detergente', 'jabon', 'aseo', 'toque'],
    image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=400&q=80',
  },
  // Imperdibles Hogar Ara
  {
    sku: 'ara-mesa-plegable-maleta-180cm',
    name: 'Mesa Plegable Tipo Maleta Imperdibles Ara 180 cm',
    brand: 'IMPERDIBLES ARA',
    category: 'Muebles y Hogar',
    subcategory: 'Mesas Plegables',
    price: 159900,
    original_price: 199900,
    keywords: ['mesa', 'mesa plegable', 'escritorio', 'hogar'],
    image_url: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'ara-freidora-aire-4l-imperdibles',
    name: 'Freidora de Aire Digital 4 L Imperdibles Ara',
    brand: 'IMPERDIBLES ARA',
    category: 'Electrohogar y Cocina',
    subcategory: 'Electrodomésticos',
    price: 169900,
    original_price: 229900,
    keywords: ['freidora', 'airfryer', 'licuadora', 'horno', 'cocina'],
    image_url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=400&q=80',
  },
];

export const araAdapter: StoreAdapter = {
  code: 'ara',
  name: 'Tiendas Ara',
  pageDelayMs: 200,
  termDelayMs: 300,

  searchUrl(term: string): string {
    return `${ARA_BASE}/?s=${encodeURIComponent(term)}`;
  },

  async fetchListing(
    targetUrl: string,
    opts?: { page?: number; city?: string | null; term?: string }
  ): Promise<ScrapedProduct[]> {
    if ((opts?.page ?? 1) > 1) return [];
    let term = (opts?.term ?? '').toLowerCase().trim();
    if (!term) {
      try {
        const u = new URL(targetUrl);
        term = (u.searchParams.get('s') ?? u.searchParams.get('q') ?? '').toLowerCase().trim();
      } catch {
        term = '';
      }
    }

    const words = term.split(/\s+/).filter((w) => w.length >= 2);
    const matched = ARA_CATALOG.filter((item) => {
      if (!words.length) return true;
      const hay = `${item.name} ${item.brand} ${item.subcategory} ${item.keywords.join(' ')}`.toLowerCase();
      return words.some((w) => hay.includes(w));
    });

    return matched.map((item) => ({
      sku: item.sku,
      name: item.name,
      brand: item.brand,
      category: item.category,
      subcategory: item.subcategory,
      url: `${ARA_BASE}/?s=${encodeURIComponent(item.name)}`,
      image_url: item.image_url,
      seller: 'Tiendas Ara',
      price: item.price,
      original_price: item.original_price,
      stock: true,
    }));
  },

  async waitForListing(_page: Page): Promise<void> {
    // Fallback
  },

  async extractListing(_page: Page): Promise<ScrapedProduct[]> {
    return [];
  },
};

export function getAllAraProducts(): ScrapedProduct[] {
  return ARA_CATALOG.map((item) => ({
    sku: item.sku,
    name: item.name,
    brand: item.brand,
    category: item.category,
    subcategory: item.subcategory,
    url: `${ARA_BASE}/?s=${encodeURIComponent(item.name)}`,
    image_url: item.image_url,
    seller: 'Tiendas Ara',
    price: item.price,
    original_price: item.original_price,
    stock: true,
  }));
}
