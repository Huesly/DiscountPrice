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
  - **Windows:** se recomienda XAMPP (`C:\xampp\xampp-control.exe` → Start MySQL)
  - Sin contraseña por defecto (`DB_PASSWORD=` vacío en `.env`)

## Setup

```bash
npm install                          # dependencias raíz (collector, API, MCP)
cd web && npm install                # dependencias del frontend
cd ..
```

Crear el archivo `.env` (copia de `.env.example`):

```bash
cp .env.example .env
```

Ajustar en `.env` si es necesario:
- `DB_PASSWORD=` (vacío si XAMPP sin password)
- `API_PORT=3100` (evitar `3000` si está ocupado por sistema)

Crear la base de datos y las tablas (se ejecuta `src/db/schema.sql`, crea la BD automáticamente si no existe):

```bash
npm run init-db
```

## Comandos

### Colector (principal)

| Comando | Qué hace |
|---|---|
| `npm run collector` | Colecta categorías + **todos** los términos de `terms.txt` |
| `npm run collector:1` | Colecta **grupo 1** de `terms.txt` (consola 1) |
| `npm run collector:2` | Colecta **grupo 2** de `terms.txt` (consola 2) |
| `npm run analyze` | Detecta ofertas activas y las guarda en `deals` |
| `npm run dedupe` | Elimina capturas de precio duplicadas (mismo producto, minuto y precio) |
| `npm run api` | API REST en `http://127.0.0.1:3100` (endpoints en `/api/*`) |
| `npm run mcp` | Servidor MCP por stdio |
| `npm run schedule` | Cron que corre collector + analyzer cada 6 h (configurable) |
| `npm run discover` | Probes de descubrimiento del HTML de Falabella |

**Ejecución paralela recomendada:** abrir **dos** consolas de PowerShell:

```powershell
# Consola 1
npm run collector:1

# Consola 2
npm run collector:2
```

El colector procesa primero los **términos de búsqueda** y luego la **categoría**. Cada término se busca en Falabella (`search/?Ntt=<término>`) con paginación automática. Si una consola pega bloqueo o deadlock, reintenta automáticamente (3 intentos con backoff).

### Web (frontend)

```bash
cd web
npm run dev
```

Abre `http://localhost:5173`. El dev server de Vite proxya `/api` hacia `127.0.0.1:3100`.

## Configuración por variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `DB_HOST` | `127.0.0.1` | Host de MariaDB |
| `DB_PORT` | `3306` | Puerto |
| `DB_USER` | `root` | Usuario |
| `DB_PASSWORD` | *(vacía)* | Contraseña |
| `DB_NAME` | `falabella_prices` | Nombre de BD |
| `MAX_PAGES` | `10` | Máximo de páginas por listado (una página sin SKUs nuevos corta antes) |
| `PAGE_DELAY_MS` | `1200` | Pausa base entre páginas (más jitter aleatorio 0–1400 ms) |
| `COLLECT_TERMS` | *(vacío)* | Override temporal: `COLLECT_TERMS=ollas,platos npm run collector` (ignora `terms.txt`) |
| `API_HOST` | `127.0.0.1` | IP donde escucha la API |
| `API_PORT` | `3100` | Puerto de la API (evitar `3000` en Windows) |
| `SCHEDULE_CRON` | `0 */6 * * *` | Cron del scheduler |
| `RUN_ON_START` | `true` | Scheduler corre un ciclo al arrancar |

## Términos de búsqueda (`terms.txt`)

Los términos viven en `terms.txt` (raíz del proyecto), **uno por línea**. Comentarios con `#`.

Separar en grupos con `# grupo N` para correr en paralelo:

```text
# grupo 1
aspiradora
licuadora
microondas
...

# grupo 2
estante
sofa
cama
...
maquina afeitar
```

- `npm run collector:1` → grupo 1
- `npm run collector:2` → grupo 2

> **Prioridad:** `COLLECT_TERMS` env var > `terms.txt`. Si `COLLECT_TERMS` está seteada, ignora el archivo.

Para agregar un término: editar `terms.txt`, guardar, y correr `collector:1` o `collector:2` según el grupo.

## Categorías

La categoría scrapeada está en `src/config.ts` → `CATEGORIES` (actualmente `cat50623` Electrohogar).

## Cómo funciona el colector

1. **Extracción vía `__NEXT_DATA__`** (JSON incrustado en la página) → más rápido y 100% imágenes.
2. Si falla, **fallback DOM** con un scroll rápido.
3. **Fingerprint de precio** (`price|original_price|stock`) en `products.price_hash`:
   - Si el fingerprint **cambió** → se inserta nueva fila en `price_history`.
   - Si **no cambió** → solo refresca metadata (nombre, imagen, URL, seller).
4. Los SKU son únicos (`ON DUPLICATE KEY UPDATE`).
5. Transacción por página con **READ COMMITTED** + retry automático ante deadlocks de InnoDB.

## Estructura

```
src/
  collector.ts      # Colector Playwright (términos + categorías)
  analyzer.ts       # Detección de ofertas y deal_score
  dedupe.ts         # Limpieza de capturas de precio duplicadas
  config.ts         # Categorías, parser de terms.txt y constantes
  scheduler.ts      # Cron collector + analyzer
  parse.ts          # Parseo de precios COP y vendedores
  api/server.ts     # API Fastify
  mcp/server.ts     # Servidor MCP (stdio)
  db/
    schema.sql      # DDL (BD + tablas)
    init.ts         # Aplica schema
    repo.ts         # Capa de acceso a datos (batch + cache)
terms.txt           # Términos de búsqueda (1 por línea, grupos con # grupo N)
web/                # Frontend React + Vite
docs/
  selectors.md      # Notas de selectores del HTML de Falabella
  ROADMAP.md        # Mejoras propuestas
```

## Notas

- El colector tiene delay + jitter entre páginas para evitar bloqueos de Falabella.
- Los datos quedan **solo en tu MariaDB local**; no se sube nada a terceros.
- Las imágenes de productos son URL del CDN de Falabella (hotlink), no se descargan localmente.
- Si MySQL/XAMPP no está corriendo, `npm run collector` falla con `ECONNREFUSED 127.0.0.1:3306`.
