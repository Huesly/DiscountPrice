import { TrendingDown } from 'lucide-react';

export default function Header() {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <div className="logo">
          <div className="logo-icon">
            <TrendingDown size={20} />
          </div>
          <div>
            <div className="logo-title">Rastreador de precios Falabella</div>
            <div className="logo-sub">Electrohogar · Colombia</div>
          </div>
        </div>
      </div>
    </header>
  );
}