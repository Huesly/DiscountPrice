import { useEffect } from 'react';
import type { UrlFilters } from '../hooks/useUrlFilters';
import Icon from './Icons';
import SidebarFilters from './SidebarFilters';

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filters: UrlFilters;
  total: number;
  storeCounts?: Record<string, number>;
  onChange: (patch: Partial<UrlFilters>) => void;
  onReset: () => void;
  onCollect?: (term: string) => Promise<void>;
}

export default function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  total,
  storeCounts,
  onChange,
  onReset,
  onCollect,
}: MobileFilterDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="df-drawer-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Panel de Filtros">
      <div
        className="df-drawer-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="df-drawer-drag-handle-wrap">
          <div className="df-drawer-drag-handle" />
        </div>

        {/* Drawer Header */}
        <div className="df-drawer-header">
          <div className="df-drawer-title-group">
            <Icon name="tune" size={18} />
            <h2 className="df-drawer-title">Filtros Avanzados</h2>
          </div>
          <button
            type="button"
            className="df-drawer-close-btn"
            onClick={onClose}
            aria-label="Cerrar panel de filtros"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="df-drawer-content">
          <SidebarFilters
            filters={filters}
            storeCounts={storeCounts}
            onChange={onChange}
            onReset={onReset}
            onCollect={onCollect}
            isMobileDrawer={true}
          />
        </div>

        {/* Drawer Footer with Apply / Results button */}
        <div className="df-drawer-footer">
          <button
            type="button"
            className="df-drawer-apply-btn"
            onClick={onClose}
          >
            Ver {total.toLocaleString('es-CO')} resultados
          </button>
        </div>
      </div>
    </div>
  );
}
