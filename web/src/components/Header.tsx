import { NavLink } from 'react-router-dom';
import GIcon from './GIcon';

export default function Header() {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <NavLink to="/" className="logo">
          <div className="logo-icon">
            <GIcon name="trending_down" size={22} />
          </div>
          <div className="logo-text-wrap">
            <div className="logo-title">DiscountPrice Colombia</div>
            <div className="logo-sub">
              IKEA (Cali) · Falabella · Éxito · Alkosto · Homecenter · D1 · Ara
            </div>
          </div>
        </NavLink>
        <nav className="main-nav" aria-label="Navegación principal">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}>
            <GIcon name="storefront" size={18} />
            <span className="nav-label-full">Catálogo Multitienda</span>
            <span className="nav-label-short">Catálogo</span>
          </NavLink>
          <NavLink to="/comparar" className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}>
            <GIcon name="compare_arrows" size={18} />
            <span className="nav-label-full">Comparador de Precios</span>
            <span className="nav-label-short">Comparar</span>
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
