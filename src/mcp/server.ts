import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  searchProducts,
  getProductBySku,
  getPriceHistory,
  getPriceStats,
  getActiveDeals,
  closePool,
} from '../db/repo.js';

const server = new McpServer({
  name: 'falabella-price-tracker',
  version: '0.1.0',
});

server.tool(
  'search_products',
  'Busca productos rastreados en Falabella por nombre, marca o SKU.',
  { query: z.string().describe('Término de búsqueda (nombre, marca o SKU)'), limit: z.number().int().min(1).max(100).default(20) },
  async ({ query, limit }) => {
    const rows = await searchProducts(query, limit);
    if (rows.length === 0) return { content: [{ type: 'text', text: 'Sin resultados.' }] };
    const text = rows
      .map((p) => {
        const price = p.price !== null ? `$${p.price.toLocaleString('es-CO')}` : 's/p';
        const original = p.original_price !== null ? `$${p.original_price.toLocaleString('es-CO')}` : '';
        return `${p.sku} | ${p.brand ?? '?'} | ${p.name}\n   ${price}${original ? ` (antes ${original})` : ''} | ${p.seller ?? '?'} | ${p.url}`;
      })
      .join('\n');
    return { content: [{ type: 'text', text: `Resultados (${rows.length}):\n${text}` }] };
  }
);

server.tool(
  'get_price_history',
  'Historial de precios de un producto por SKU.',
  { sku: z.string().describe('SKU del producto'), limit: z.number().int().min(1).max(500).default(30) },
  async ({ sku, limit }) => {
    const p = await getProductBySku(sku);
    if (!p) return { content: [{ type: 'text', text: `SKU ${sku} no encontrado.` }] };
    const history = await getPriceHistory(sku, limit);
    if (history.length === 0) return { content: [{ type: 'text', text: 'Sin historial de precios.' }] };
    const lines = history.map((h) => `${h.captured_at} | $${h.price.toLocaleString('es-CO')}${h.original_price ? ` (antes $${h.original_price.toLocaleString('es-CO')})` : ''}`);
    return {
      content: [
        {
          type: 'text',
          text: `${p.name}\nSKU: ${sku} | URL: ${p.url}\nÚltimos ${history.length} registros:\n${lines.join('\n')}`,
        },
      ],
    };
  }
);

server.tool(
  'get_price_stats',
  'Estadísticas de precio de un producto: actual, mínimo histórico, máximo, promedio, mediana.',
  { sku: z.string().describe('SKU del producto') },
  async ({ sku }) => {
    const p = await getProductBySku(sku);
    if (!p) return { content: [{ type: 'text', text: `SKU ${sku} no encontrado.` }] };
    const s = await getPriceStats(sku);
    if (s.samples === 0) return { content: [{ type: 'text', text: `${p.name}: sin historial de precios.` }] };
    const down = s.min !== null && s.current !== null ? Math.round(((s.current - s.min) / s.min) * 100) : 0;
    const text = [
      p.name,
      `SKU: ${sku} | ${p.seller ?? ''} | ${p.url}`,
      `Precio actual   : $${s.current!.toLocaleString('es-CO')}`,
      `Mínimo histórico: $${s.min!.toLocaleString('es-CO')} (${down >= 0 ? '+' : ''}${down}% vs actual)`,
      `Máximo histórico: $${s.max!.toLocaleString('es-CO')}`,
      `Promedio        : $${Math.round(s.avg!).toLocaleString('es-CO')}`,
      `Mediana         : $${Math.round(s.median ?? 0).toLocaleString('es-CO')}`,
      `Muestras        : ${s.samples}`,
    ].join('\n');
    return { content: [{ type: 'text', text }] };
  }
);

server.tool(
  'get_deals',
  'Lista ofertas activas detectadas (precio por debajo del promedio histórico).',
  { limit: z.number().int().min(1).max(100).default(20) },
  async ({ limit }) => {
    const deals = await getActiveDeals(limit);
    if (deals.length === 0) return { content: [{ type: 'text', text: 'Sin ofertas activas.' }] };
    const text = deals
      .map((d) => {
        const drop = d.discount_pct !== null ? ` -${d.discount_pct}% vs promedio` : '';
        return `🔥 ${d.sku} | ${d.name}\n   $${d.price.toLocaleString('es-CO')} (min hist $${(d.min_historical ?? 0).toLocaleString('es-CO')}, avg30 $${(d.avg_30d ?? 0).toLocaleString('es-CO')})${drop} | score ${d.deal_score ?? 0}`;
      })
      .join('\n');
    return { content: [{ type: 'text', text: `Ofertas activas (${deals.length}):\n${text}` }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('MCP falabella-price-tracker corriendo (stdio).');

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});