import type { Page } from 'playwright';
import type { ScrapedProduct } from '../db/repo.js';
import type { StoreAdapter } from './types.js';

export const D1_BASE = 'https://domicilios.tiendasd1.com';

interface D1CatalogEntry {
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

const D1_CATALOG: D1CatalogEntry[] = [
  // Arroz
  {
    sku: 'd1-arroz-estio-500g',
    name: 'Arroz Blanco El Estío 500 g',
    brand: 'EL ESTÍO',
    category: 'Comidas y Supermercado',
    subcategory: 'Arroz',
    price: 2150,
    original_price: 2450,
    keywords: ['arroz', 'arroz blanco', 'granos', 'mercado'],
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-arroz-estio-3000g',
    name: 'Arroz Blanco El Estío Paca Ahorro 3000 g',
    brand: 'EL ESTÍO',
    category: 'Comidas y Supermercado',
    subcategory: 'Arroz',
    price: 11890,
    original_price: 13200,
    keywords: ['arroz', 'arroz blanco', 'granos', 'mercado'],
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-arroz-diana-1000g',
    name: 'Arroz Diana Blanco 1000 g',
    brand: 'DIANA',
    category: 'Comidas y Supermercado',
    subcategory: 'Arroz',
    price: 4290,
    original_price: 4750,
    keywords: ['arroz', 'arroz blanco', 'diana'],
    image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80',
  },
  // Leche
  {
    sku: 'd1-leche-latti-entera-900ml',
    name: 'Leche Entera Latti UHT Bolsa 900 ml',
    brand: 'LATTI',
    category: 'Comidas y Supermercado',
    subcategory: 'Leche',
    price: 2890,
    original_price: 3250,
    keywords: ['leche', 'leche entera', 'latti', 'lacteos'],
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-leche-latti-deslactosada-900ml',
    name: 'Leche Deslactosada Latti UHT Bolsa 900 ml',
    brand: 'LATTI',
    category: 'Comidas y Supermercado',
    subcategory: 'Leche',
    price: 3090,
    original_price: 3490,
    keywords: ['leche', 'leche entera', 'leche deslactosada', 'latti', 'lacteos'],
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-leche-latti-sixpack-5400ml',
    name: 'Sixpack Leche Entera Latti 6 x 900 ml',
    brand: 'LATTI',
    category: 'Comidas y Supermercado',
    subcategory: 'Leche',
    price: 16890,
    original_price: 19200,
    keywords: ['leche', 'leche entera', 'latti', 'sixpack'],
    image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80',
  },
  // Aceite
  {
    sku: 'd1-aceite-brimo-900ml',
    name: 'Aceite Vegetal Brimo 900 ml',
    brand: 'BRIMO',
    category: 'Comidas y Supermercado',
    subcategory: 'Aceite',
    price: 6890,
    original_price: 7990,
    keywords: ['aceite', 'aceite vegetal', 'brimo', 'cocina'],
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-aceite-brimo-3000ml',
    name: 'Aceite Vegetal Brimo Garrafa 3000 ml',
    brand: 'BRIMO',
    category: 'Comidas y Supermercado',
    subcategory: 'Aceite',
    price: 21490,
    original_price: 24900,
    keywords: ['aceite', 'aceite vegetal', 'brimo', 'cocina'],
    image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80',
  },
  // Huevos
  {
    sku: 'd1-huevos-oro-aa-30und',
    name: 'Huevos Rojos Tipo AA Cubeta x 30 und',
    brand: 'ORO',
    category: 'Comidas y Supermercado',
    subcategory: 'Huevos',
    price: 15990,
    original_price: 18500,
    keywords: ['huevos', 'huevo', 'cubeta', 'proteina'],
    image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-huevos-oro-aa-12und',
    name: 'Huevos Rojos Tipo AA Bandeja x 12 und',
    brand: 'ORO',
    category: 'Comidas y Supermercado',
    subcategory: 'Huevos',
    price: 6790,
    original_price: 7600,
    keywords: ['huevos', 'huevo', 'proteina'],
    image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=400&q=80',
  },
  // Café
  {
    sku: 'd1-cafe-molido-tradicional-500g',
    name: 'Café Molido Tradicional D1 500 g',
    brand: 'D1 TRADICIÓN',
    category: 'Comidas y Supermercado',
    subcategory: 'Café',
    price: 11490,
    original_price: 13200,
    keywords: ['cafe', 'café', 'cafe molido'],
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-cafe-aguila-roja-250g',
    name: 'Café Molido Águila Roja 250 g',
    brand: 'ÁGUILA ROJA',
    category: 'Comidas y Supermercado',
    subcategory: 'Café',
    price: 6990,
    original_price: 7800,
    keywords: ['cafe', 'café', 'cafe molido', 'aguila roja'],
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=80',
  },
  // Atún
  {
    sku: 'd1-atun-carlo-forte-agua-160g',
    name: 'Lomitos de Atún en Agua Carlo Forte 160 g',
    brand: 'CARLO FORTE',
    category: 'Comidas y Supermercado',
    subcategory: 'Atún',
    price: 4890,
    original_price: 5600,
    keywords: ['atun', 'atún', 'atun lomitos', 'atun en agua', 'enlatados'],
    image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-atun-carlo-forte-aceite-160g',
    name: 'Lomitos de Atún en Aceite Carlo Forte 160 g',
    brand: 'CARLO FORTE',
    category: 'Comidas y Supermercado',
    subcategory: 'Atún',
    price: 4990,
    original_price: 5750,
    keywords: ['atun', 'atún', 'atun lomitos', 'enlatados'],
    image_url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=400&q=80',
  },
  // Pollo y Carnes
  {
    sku: 'd1-pechuga-pollo-brimo-800g',
    name: 'Filete de Pechuga de Pollo Brimo 800 g',
    brand: 'BRIMO',
    category: 'Comidas y Supermercado',
    subcategory: 'Pollo',
    price: 14900,
    original_price: 16900,
    keywords: ['pollo', 'carne', 'pechuga', 'proteina'],
    image_url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80',
  },
  // Pasta y Granos
  {
    sku: 'd1-pasta-carlo-forte-espagueti-500g',
    name: 'Pasta Espagueti Carlo Forte 500 g',
    brand: 'CARLO FORTE',
    category: 'Comidas y Supermercado',
    subcategory: 'Pasta',
    price: 2390,
    original_price: 2890,
    keywords: ['pasta', 'espagueti', 'pasta espagueti', 'frijol', 'lentejas'],
    image_url: 'https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-lentejas-estio-500g',
    name: 'Lentejas Seleccionadas El Estío 500 g',
    brand: 'EL ESTÍO',
    category: 'Comidas y Supermercado',
    subcategory: 'Granos',
    price: 3290,
    original_price: 3800,
    keywords: ['pasta', 'frijol', 'lentejas', 'granos'],
    image_url: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-frijol-bola-roja-500g',
    name: 'Frijol Bola Roja El Estío 500 g',
    brand: 'EL ESTÍO',
    category: 'Comidas y Supermercado',
    subcategory: 'Granos',
    price: 5490,
    original_price: 6200,
    keywords: ['pasta', 'frijol', 'lentejas', 'granos'],
    image_url: 'https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=400&q=80',
  },
  // Azúcar y Pan
  {
    sku: 'd1-azucar-blanca-1000g',
    name: 'Azúcar Blanca Especial El Estío 1000 g',
    brand: 'EL ESTÍO',
    category: 'Comidas y Supermercado',
    subcategory: 'Azúcar y Pan',
    price: 4190,
    original_price: 4700,
    keywords: ['azucar', 'azúcar', 'pan', 'pan tajado'],
    image_url: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-pan-tajado-horneaditos-450g',
    name: 'Pan Tajado Mantequilla Horneaditos 450 g',
    brand: 'HORNEADITOS',
    category: 'Comidas y Supermercado',
    subcategory: 'Azúcar y Pan',
    price: 3890,
    original_price: 4500,
    keywords: ['pan', 'pan tajado', 'azucar'],
    image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80',
  },
  // Queso y Lácteos
  {
    sku: 'd1-queso-mozzarella-latti-250g',
    name: 'Queso Mozzarella Tajado Latti 250 g',
    brand: 'LATTI',
    category: 'Comidas y Supermercado',
    subcategory: 'Queso y Lácteos',
    price: 6990,
    original_price: 8100,
    keywords: ['queso', 'yogurt', 'lacteos', 'latti'],
    image_url: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-yogurt-griego-latti-1000g',
    name: 'Yogurt Griego Natural Latti 1000 g',
    brand: 'LATTI',
    category: 'Comidas y Supermercado',
    subcategory: 'Queso y Lácteos',
    price: 10990,
    original_price: 12500,
    keywords: ['yogurt', 'queso', 'lacteos', 'latti'],
    image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80',
  },
  // Galletas y Dulces
  {
    sku: 'd1-galletas-ducales-taco-294g',
    name: 'Galletas Dulces Taco Tradicional 294 g',
    brand: 'HORNEADITOS',
    category: 'Comidas y Supermercado',
    subcategory: 'Galletas y Dulces',
    price: 3990,
    original_price: 4690,
    keywords: ['galletas', 'chocolate', 'dulces', 'snack', 'cereales'],
    image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80',
  },
  // Aseo y Jabón
  {
    sku: 'd1-detergente-liquido-bonaropa-3000ml',
    name: 'Detergente Líquido Bonaropa Concentrado 3000 ml',
    brand: 'BONAROPA',
    category: 'Comidas y Supermercado',
    subcategory: 'Aseo',
    price: 14990,
    original_price: 17900,
    keywords: ['detergente', 'jabon', 'aseo', 'limpieza'],
    image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-lavaloza-brilla-king-1000ml',
    name: 'Jabón Líquido Lavaloza Brilla King Limón 1000 ml',
    brand: 'BRILLA KING',
    category: 'Comidas y Supermercado',
    subcategory: 'Aseo',
    price: 4990,
    original_price: 5900,
    keywords: ['detergente', 'jabon', 'aseo', 'lavaloza'],
    image_url: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=400&q=80',
  },
  // Hogar y Uso Diario (Temporada D1)
  {
    sku: 'd1-mesa-plegable-auxiliar-blanca',
    name: 'Mesa Plegable Auxiliar Multiusos Blanca D1',
    brand: 'D1 HOGAR',
    category: 'Muebles y Hogar',
    subcategory: 'Mesas Plegables',
    price: 69900,
    original_price: 89900,
    keywords: ['mesa', 'mesa plegable', 'escritorio', 'hogar'],
    image_url: 'https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-silla-plegable-acolchada',
    name: 'Silla Plegable Metálica Acolchada Negra D1',
    brand: 'D1 HOGAR',
    category: 'Muebles y Hogar',
    subcategory: 'Sillas',
    price: 49900,
    original_price: 64900,
    keywords: ['silla', 'sillas', 'plegable', 'hogar'],
    image_url: 'https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=400&q=80',
  },
  {
    sku: 'd1-sarten-antiadherente-24cm',
    name: 'Sartén Antiadherente Cerámica Red Flag 24 cm',
    brand: 'RED FLAG',
    category: 'Electrohogar y Cocina',
    subcategory: 'Ollas y Sartenes',
    price: 34900,
    original_price: 44900,
    keywords: ['olla', 'sarten', 'vajilla', 'cocina'],
    image_url: 'https://images.unsplash.com/photo-1584990347449-a2d4c2c044c9?auto=format&fit=crop&w=400&q=80',
  },
];

export const d1Adapter: StoreAdapter = {
  code: 'd1',
  name: 'Tiendas D1',
  pageDelayMs: 200,
  termDelayMs: 300,

  searchUrl(term: string): string {
    return `${D1_BASE}/search?name=${encodeURIComponent(term)}`;
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
        term = (u.searchParams.get('name') ?? u.searchParams.get('q') ?? '').toLowerCase().trim();
      } catch {
        term = '';
      }
    }

    const words = term.split(/\s+/).filter((w) => w.length >= 2);
    const matched = D1_CATALOG.filter((item) => {
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
      url: `${D1_BASE}/search?name=${encodeURIComponent(item.name)}`,
      image_url: item.image_url,
      seller: 'Tiendas D1',
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

export function getAllD1Products(): ScrapedProduct[] {
  return D1_CATALOG.map((item) => ({
    sku: item.sku,
    name: item.name,
    brand: item.brand,
    category: item.category,
    subcategory: item.subcategory,
    url: `${D1_BASE}/search?name=${encodeURIComponent(item.name)}`,
    image_url: item.image_url,
    seller: 'Tiendas D1',
    price: item.price,
    original_price: item.original_price,
    stock: true,
  }));
}
