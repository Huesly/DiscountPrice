import { TrendingDown, Scale } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <NavLink to="/" className="logo">
          <div className="logo-icon">
            <TrendingDown size={20} />
          </div>
          <div>
            <div className="logo-title">Rastreador de precios Falabella</div>
            <div className="logo-sub">Electrohogar · Colombia</div>
          </div>
        </NavLink>
        <nav className="main-nav">
          <NavLink to="/comparar" className={({ isActive }) => `nav-link ${isActive ? 'nav-active' : ''}`}>
            <Scale size={16} />
            Comparar
          </NavLink>
        </nav>
      </div>
    </header>
  );
}