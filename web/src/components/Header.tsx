import { NavLink } from 'react-router-dom';
import Icon from './Icons';

interface HeaderProps {
  favCount?: number;
  totalProducts?: number;
}

export default function Header({ favCount = 0, totalProducts }: HeaderProps) {
  return (
    <header className="df-header">
      <div className="df-container df-header-inner">
        {/* Brand / Logo */}
        <NavLink to="/" className="df-brand" aria-label="DealFinder Pro Inicio">
          <div className="df-brand-icon">
            <Icon name="trending_down" size={20} strokeWidth={2.2} />
          </div>
          <div className="df-brand-text">
            <div className="df-brand-title">
              DEALFINDER <span className="df-brand-badge">PRO</span>
            </div>
            <div className="df-brand-sub">
              Shopping Intelligence · Colombia
            </div>
          </div>
        </NavLink>

        {/* Verification & Trust Badge */}
        <div className="df-header-badge-trust" title="Precios y descuentos verificados directamente en los comercios">
          <Icon name="verified" size={15} className="text-emerald-600" />
          <span>7 tiendas nacionales monitoreadas</span>
          {totalProducts !== undefined && totalProducts > 0 && (
            <span className="df-header-pill-count font-mono">
              {totalProducts.toLocaleString('es-CO')} ofertas
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="df-nav" aria-label="Navegación principal">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `df-nav-btn ${isActive ? 'active' : ''}`}
          >
            <Icon name="storefront" size={17} />
            <span className="df-nav-label">Catálogo Nacional</span>
          </NavLink>

          <NavLink
            to="/comparar"
            className={({ isActive }) => `df-nav-btn ${isActive ? 'active' : ''}`}
          >
            <Icon name="compare_arrows" size={17} />
            <span className="df-nav-label">Comparador</span>
          </NavLink>

          {favCount > 0 && (
            <NavLink
              to="/?favs=1"
              className="df-nav-fav-pill"
              aria-label={`${favCount} productos guardados`}
            >
              <Icon name="heart_filled" size={14} />
              <span className="font-mono text-xs">{favCount}</span>
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
