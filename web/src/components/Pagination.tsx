import Icon from './Icons';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}

export default function Pagination({
  page,
  pages,
  total,
  onPage,
}: PaginationProps) {
  if (pages <= 1) return null;

  const windowPages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i++) windowPages.push(i);

  return (
    <nav className="df-pagination-wrap" aria-label="Navegación de páginas">
      <span className="df-pagination-count">
        Página <strong className="font-mono text-slate-900">{page}</strong> de <span className="font-mono">{pages}</span> (Total: <span className="font-mono">{total.toLocaleString('es-CO')}</span>)
      </span>

      <div className="df-pagination-buttons">
        <button
          type="button"
          className="df-page-btn"
          disabled={page <= 1}
          onClick={() => {
            onPage(page - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Página anterior"
        >
          <span className="transform rotate-180 inline-block">
            <Icon name="chevron_right" size={14} />
          </span>
          <span className="hidden sm:inline">Anterior</span>
        </button>

        {windowPages[0] > 1 && (
          <>
            <button
              type="button"
              className="df-page-btn font-mono"
              onClick={() => {
                onPage(1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              1
            </button>
            {windowPages[0] > 2 && <span className="df-page-ellipsis">…</span>}
          </>
        )}

        {windowPages.map((n) => (
          <button
            key={n}
            type="button"
            className={`df-page-btn font-mono ${n === page ? 'active' : ''}`}
            onClick={() => {
              onPage(n);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-current={n === page ? 'page' : undefined}
          >
            {n}
          </button>
        ))}

        {windowPages[windowPages.length - 1] < pages && (
          <>
            {windowPages[windowPages.length - 1] < pages - 1 && (
              <span className="df-page-ellipsis">…</span>
            )}
            <button
              type="button"
              className="df-page-btn font-mono"
              onClick={() => {
                onPage(pages);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              {pages}
            </button>
          </>
        )}

        <button
          type="button"
          className="df-page-btn"
          disabled={page >= pages}
          onClick={() => {
            onPage(page + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="Página siguiente"
        >
          <span className="hidden sm:inline">Siguiente</span>
          <Icon name="chevron_right" size={14} />
        </button>
      </div>
    </nav>
  );
}
