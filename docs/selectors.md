# Selectores Falabella — Discovery

Resultado de la fase de descubrimiento (Playwright headless, UA Chrome 125, locale es-CO).

## Hallazgo clave

- `category/cat70057/Hogar` **redirige a homepage** en headless (bot detection). NO usar.
- Categorías reales que renderizan grid: `category/cat50623/Electrohogar` (48 prod/página, ~14.885 resultados).
- URL de búsqueda también sirve: `search?Ntt=<termino>`.
- Paginación: sufijo `?page=N` sobre la URL de categoría (funciona, cambia productos).

## Listing / Grid

| Dato | Selector |
|------|----------|
| Contenedor grid | `[class*="search-results-4-grid"]`, `section[class*="pod-group--products"]` |
| Card producto | `a[data-pod="catalyst-pod"]` |
| SKU | `data-key` del pod |
| Variante | `id="testId-pod-<variante>"` |
| Marca | `.pod-title` |
| Nombre | `.pod-subTitle` |
| Vendedor | `.pod-sellerText` (texto `Por <vendedor>`) |
| Imagen | `img` dentro del pod (src `media.falabella...`) |
| Precio actual | `li[class*="prices-"]` atributos, en orden de prioridad: `data-event-price` → `data-internet-price` → `data-cmr-price` |
| Precio tachado | `li[class*="prices-"]` con `data-normal-price` |
| Patrocinado | `data-sponsored="true"` |

**Importante (bug encontrado):** los atributos de precio varían por producto. Unos usan `data-event-price`, otros `data-internet-price`, otros `data-cmr-price`. El collector usa cadena de fallback `event → internet → cmr`.

### Formato precios
Atributos en formato COP sin $: `4999900` / `4.999.900` (con puntos de miles). Parseo: quitar `$`, `.`, espacios → entero.

## Detalle (PDP) — referencia futuro

| Dato | Selector |
|------|----------|
| Marca | `.pdp-basic-info__brand-link` |
| Vendedor | `.pdp-basic-info__seller` (`Vendido por Falabella 4.5 (20)`) |
| Bloque precios | `.prices-container` (actual + tachado + % descuento) |

## Anti-bot

- Category cat70057 redirige a home en headless → usar categorías reales (cat50623).
- UA real + locale es-CO + viewport 1366x900 = funciona sin bloqueo headless (probado).
- Delay entre páginas recomendado ≥ 2-3s.

## Archivos de referencia
- `tmp/category.html` — homepage (redirigida)
- `tmp/listing_cat50623.html` — grid categoría real
- `tmp/card.html` — card carousel