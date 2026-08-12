# Mejoras propuestas

Roadmap pendiente para el tracker de precios. Estado: **agendado, sin ejecutar**.
Reanudar leyendo este archivo + el README.

## Datos (mayor impacto)
1. **Categoría Hogar completa** — hoy muebles solo por términos sueltos. Scrapear el menú de categorías (homepage de Falabella) para descubrir IDs reales → catálogo completo de Hogar/otras áreas. Cubre también investigar `cat70057` (dio 0 pods, se quitaron del config el 2026-08-12).
2. **Variantes** — un producto puede salir como varios pods (colores/tamaños, distinto `data-key`). Hoy infla el conteo de productos y duplica. Agrupar por producto padre normalizaría número y detalle.
3. **Ficha técnica** — el colector solo lee la card del listado. Opcional: entrar al detalle y guardar specs/descripción/disponibilidad. Costo alto (1 navegación extra x producto); solo por catálogo puntual o a demanda.
4. **Relleno de fotos pendientes** — solucionado en collector (scroll → lazy-load) el 2026-08-12; las viejas sin URL se rellenan solas en la próxima corrida completa (`npm run collector`).

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

## Notas de contexto (sesión 2026-08-12)
- Config actual: 2 categoría (solo `cat50623` Electrohogar) + 28 términos en `src/config.ts`.
- Colector soporta `COLLECT_TERMS=term1,term2` para correr subconjuntos y corta en página sin SKUs nuevos.
- BD: ~12.2k SKUs únicos; `npm run dedupe` limpia capturas espejo.
- Fotos de Falabella son lazy-load → el collector hace 3 pasadas de scroll + 3s antes de extraer.