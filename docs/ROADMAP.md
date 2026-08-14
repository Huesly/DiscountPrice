# Mejoras propuestas

Roadmap pendiente para el tracker de precios. Estado actualizado al 2026-08-13.

## Hecho (2026-08-13)
- ✅ **Extracción JSON vía `__NEXT_DATA__`** — sin scroll, 100% imágenes, más rápido.
- ✅ **Cache de cambios (`price_hash`)** — `products.price_hash` + upsert batch. Metadata siempre refresca, `price_history` solo si cambia.
- ✅ **Deadlock-safe batch** — retry 3x con backoff + `READ COMMITTED` + SKUs ordenados alfabéticamente.
- ✅ **`terms.txt` con grupos** — 30 términos, 2 grupos. `collector:1` / `collector:2`.
- ✅ **Términos antes de categorías** — si la categoría falla, los términos ya se procesaron.
- ✅ **Port 3100** — evita conflicto con servicio Windows en puerto 3000.

## Datos (mayor impacto)
1. **Categoría Hogar completa** — hoy solo `cat50623` Electrohogar. Scrapear el menú de categorías (homepage de Falabella) para descubrir IDs reales → catálogo completo de Hogar/otras áreas. Cubre también investigar `cat70057` (dio 0 pods, se quitaron del config).
2. **Variantes** — un producto puede salir como varios pods (colores/tamaños, distinto `data-key`). Hoy infla el conteo de productos y duplica. Agrupar por producto padre normalizaría número y detalle.
3. **Ficha técnica** — el colector solo lee la card del listado. Opcional: entrar al detalle y guardar specs/descripción/disponibilidad. Costo alto (1 navegación extra x producto); solo por catálogo puntual o a demanda.
4. **Relleno de fotos pendientes** — solucionado en collector (JSON extraction) el 2026-08-13; las viejas sin URL se rellenan solas en la próxima corrida completa.

## Detección de ofertas / análisis
5. **Alertas de oferta** — cuando `analyzer` detecte oferta nueva → notificar (toast Windows, webhook Discord). Simple y útil.
6. **Ventanas/umbrales por categoría** — hoy un umbral global (`DEAL_MIN_*` en `analyzer.ts`). Permitir % distinto por categoría.
7. **Limpieza previa al analyze** — correr `npm run dedupe` dentro del `analyzer.ts` (hoy hay que acordarse).

## Web / UX
8. **Export CSV** de productos y ofertas (1 endpoint + botón).
9. **Favoritos en BD** — hoy en localStorage (`useFavorites`); ir a tabla para persistir multi-equipo.
10. **Push web** "precio de favorito bajó" (Notification API).
11. **Comparador** — seleccionar 2-3 productos y superponer curvas en el `PriceChart`.
12. **Dashboard de salud del colector** — última corrida, % fotos, capturas/hora, bloqueos.

## Operación / robustez
13. **Tests** — hoy 0. Agregar Vitest: parseo de precios COP (`parse.ts`), analyzer, upsert (`repo.ts`).
14. **CI en GitHub** — `tsc` + lint + tests en cada push (repo ya existe).
15. **Logs a archivo rotativo** — hoy stdout se pierde si el scheduler corre en segundo plano.
16. **Detección de bloqueo/captcha** — backoff + alarma (Falabella puede bloquear IP).
17. **Docker Compose** — MariaDB + API + web + cron con 2 comandos.
18. **Auth en `POST /api/collect`** — token simple; hoy cualquier proceso en la red dispara Playwright.
19. **`/api/health`** + métricas básicas.

## Roadmap sugerido
- **Rápido (alto valor):** 7, 13, 14, 15, 8, 18.
- **Fase datos:** 1, 2, 5, 4.
- **Fase web:** 9-12.
- **Ops:** 16, 17.

## Notas de contexto (sesión 2026-08-13)
- Config actual: 1 categoría (`cat50623` Electrohogar) + 30 términos en `terms.txt` (grupos 1 y 2).
- Colector soporta `terms.txt` con `# grupo N` y `COLLECT_TERMS=term1,term2` como override.
- BD: ~12k+ SKUs únicos; `npm run dedupe` limpia capturas espejo.
- Fotos 100% vía `__NEXT_DATA__` (`mediaUrls[0]`).
