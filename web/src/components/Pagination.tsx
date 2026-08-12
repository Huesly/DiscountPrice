import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  pages: number;
  total: number;
  onPage: (p: number) => void;
}

function PageBtn({ n, current, onClick }: { n: number; current: boolean; onClick: () => void }) {
  return (
    <button className={`btn page-btn ${current ? 'page-active' : ''}`} onClick={onClick}>
      {n}
    </button>
  );
}

export default function Pagination({ page, pages, total, onPage }: Props) {
  if (pages <= 1) return null;

  const window: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i++) window.push(i);

  return (
    <div className="pagination">
      <span className="muted pagination-total">
        {total.toLocaleString('es-CO')} productos
      </span>
      <div className="pagination-ctrls">
        <button className="btn page-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Anterior">
          <ChevronLeft size={15} />
        </button>
        {window[0] > 1 && <span className="pagination-ellipsis">…</span>}
        {window.map((n) => (
          <PageBtn key={n} n={n} current={n === page} onClick={() => onPage(n)} />
        ))}
        {window[window.length - 1] < pages && <span className="pagination-ellipsis">…</span>}
        <button className="btn page-btn" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Siguiente">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}