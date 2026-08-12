# MCP Price — Falabella Price Tracker 🇨🇴

Sistema de monitoreo de precios y ofertas de **Falabella Colombia**. Un colector con Playwright barre categorías y búsquedas, guarda el historial de precios en MariaDB, un analizador detecta ofertas reales y una web + servidor MCP exponen los datos.

## Stack

- **Colector:** Playwright (Chromium headless)
- **Base de datos:** MariaDB/MySQL (`mysql2`)
- **Análisis de ofertas:** TypeScript puro
- **API:** Fastify (+ CORS)
- **Web:** React + Vite
- **MCP:** `@modelcontextprotocol/sdk` (stdio)

## Requisitos

- Node.js 20+
- MariaDB (o MySQL) corriendo en `127.0.0.1:3306`

## Setup

```bash
npm install                          # dependencias raíz (collector, API, MCP)
```

Crear el archivo `.env` (copia de `.env.example`):

```bash
cp .env.example .env
```

Crear la base de datos y las tablas (se ejecuta `src/db/schema.sql`, crea la BD automáticamente si no existe):

```bash
npm run init-db
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run collector` | Colecta productos de categorías + términos de búsqueda configurados (hasta `MAX_PAGES` páginas cada uno) |
| `npm run analyze` | Detecta ofertas activas (precio bajo promedio 30 días o bajo precio original) y las guarda en `deals` |
| `npm run dedupe` | Elimina capturas de precio duplicadas (mismo producto, minuto y precio) |
| `npm run api` | API REST en `http://127.0.0.1:3000` (endpoints en `/api/*`) |
| `npm run mcp` | Servidor MCP por stdio (cliente MCP: `search_products`, `get_price_history`, `get_price_stats`, `get_deals`) |
| `npm run schedule` | Cron que corre collector + analyzer cada 6 h (configurable) |
| `npm run discover` | Probes de descubrimiento del HTML de Falabella |

### Web (frontend)

```bash
cd web
npm install
npm run dev
```

Abre `http://localhost:5173`. El dev server de Vite proxya `/api` hacia `127.0.0.1:3000`.

## Configuración por variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `DB_HOST` | `127.0.0.1` | Host de MariaDB |
| `DB_PORT` | `3306` | Puerto |
| `DB_USER` | `root` | Usuario |
| `DB_PASSWORD` | *(vacía)* | Contraseña |
| `DB_NAME` | `falabella_prices` | Nombre de BD |
| `MAX_PAGES` | `10` | Máximo de páginas por listado (una página sin SKUs nuevos corta antes) |
| `PAGE_DELAY_MS` | `3000` | Pausa entre páginas (más 0–800 ms aleatorio) |
| `COLLECT_TERMS` | *(vacío)* | Correr solo un subconjunto de términos: `COLLECT_TERMS=ollas,platos npm run collector` |
| `API_HOST` | `127.0.0.1` | IP donde escucha la API (`0.0.0.0` para exponer a la LAN) |
| `API_PORT` | `3000` | Puerto de la API |
| `SCHEDULE_CRON` | `0 */6 * * *` | Cron del scheduler |
| `RUN_ON_START` | `true` | Scheduler corre un ciclo al arrancar |

## Categorías y términos

Las fuentes viven en `src/config.ts`:

- `CATEGORIES` — URLs de categorías de Falabella (`/category/catXXXXX/...`)
- `SEARCH_TERMS` — términos de búsqueda (`search/?Ntt=término`), cada uno con su `subcategory`

Para agregar productos de otra categoría o término: editar `config.ts` y volver a correr `npm run collector`.

> El colector **no duplica productos**: los SKU son únicos en la tabla `products` (`ON DUPLICATE KEY UPDATE`). Repetir una corrida refresca precios y agrega al historial, no crea filas duplicadas.

## Estructura

```
src/
  collector.ts      # Colector Playwright (categorías + búsquedas)
  analyzer.ts       # Detección de ofertas y deal_score
  dedupe.ts         # Limpieza de capturas de precio duplicadas
  config.ts         # Categorías, términos y constantes
  scheduler.ts      # Cron collector + analyzer
  parse.ts          # Parseo de precios COP y vendedores
  api/server.ts     # API Fastify
  mcp/server.ts     # Servidor MCP (stdio)
  db/
    schema.sql      # DDL (BD + tablas)
    init.ts         # Aplica schema
    repo.ts         # Capa de acceso a datos
web/                # Frontend React + Vite
docs/selectors.md   # Notas de selectores del HTML de Falabella
```

## Notas

- El colector es lento a propósito: respeta `PAGE_DELAY_MS` entre páginas para evitar bloqueos de Falabella.
- Los datos quedan **solo en tu MariaDB local**; no se sube nada a terceros.
- Las imágenes de productos son URL del CDN de Falabella (hotlink), no se descargan localmente.