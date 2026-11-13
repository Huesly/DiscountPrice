import type { SVGProps } from 'react';

export type IconName =
  | 'search'
  | 'tune'
  | 'open_in_new'
  | 'verified'
  | 'close'
  | 'swap_vert'
  | 'trending_down'
  | 'content_copy'
  | 'heart'
  | 'heart_filled'
  | 'compare_arrows'
  | 'storefront'
  | 'bolt'
  | 'technology'
  | 'laptop'
  | 'smartphone'
  | 'tablet'
  | 'appliances'
  | 'furniture'
  | 'groceries'
  | 'check'
  | 'chevron_down'
  | 'chevron_up'
  | 'chevron_right'
  | 'refresh'
  | 'share'
  | 'tag'
  | 'shield'
  | 'arrow_back'
  | 'add'
  | 'chat';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName | string;
  size?: number | string;
  className?: string;
}

export default function Icon({
  name,
  size = 20,
  className = '',
  strokeWidth = 1.75,
  ...rest
}: IconProps) {
  const s = typeof size === 'number' ? `${size}px` : size;

  const renderPath = () => {
    switch (name) {
      // 1. Buscador: Lupa geométrica
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </>
        );

      // 2. Filtros: Sliders deslizantes
      case 'tune':
      case 'filter_list':
        return (
          <>
            <path d="M4 6h16M4 12h16M4 18h16" />
            <circle cx="8" cy="6" r="2" fill="currentColor" fillOpacity="0.15" />
            <circle cx="16" cy="12" r="2" fill="currentColor" fillOpacity="0.15" />
            <circle cx="10" cy="18" r="2" fill="currentColor" fillOpacity="0.15" />
          </>
        );

      // 3. Comercio Externo: Cuadrado con flecha diagonal de salida
      case 'open_in_new':
        return (
          <>
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </>
        );

      // 4. Verificación: Insignia circular con check
      case 'verified':
        return (
          <>
            <path d="M12 2l2.4 2.1 3.2-.3 1.1 3 3 1.2-.4 3.2 2.1 2.4-2.1 2.4.4 3.2-3 1.2-1.1 3-3.2-.3L12 22l-2.4-2.1-3.2.3-1.1-3-3-1.2.4-3.2L.6 10.4 2.7 8l-.4-3.2 3-1.2 1.1-3 3.2.3L12 2z" />
            <path d="m9 12 2 2 4-4" />
          </>
        );

      // 5. Remover Filtro: Cruz delgada y minimalista
      case 'close':
        return <path d="M18 6 6 18M6 6l12 12" />;

      // 6. Ordenamiento: Flechas bidireccionales arriba/abajo
      case 'swap_vert':
        return (
          <>
            <path d="m7 15 5 5 5-5" />
            <path d="m7 9 5-5 5 5" />
          </>
        );

      // 7. Historial de Precio: Gráfico de tendencia descendente
      case 'trending_down':
        return (
          <>
            <path d="M22 17h-6m6 0v-6" />
            <path d="M22 17l-8.5-8.5-5 5L2 7" />
          </>
        );

      // 8. Copiar Cupón: Doble rectángulo superpuesto
      case 'content_copy':
        return (
          <>
            <rect width="13" height="13" x="9" y="9" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        );

      // Favoritos
      case 'heart':
      case 'favorite':
        return (
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        );

      case 'heart_filled':
        return (
          <path
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
            fill="currentColor"
          />
        );

      // Comparador
      case 'compare_arrows':
        return (
          <>
            <path d="M8 7h12m0 0-4-4m4 4-4 4" />
            <path d="M16 17H4m0 0 4 4m-4-4 4-4" />
          </>
        );

      // Tienda
      case 'storefront':
      case 'store':
        return (
          <>
            <path d="m2 7 2-4h16l2 4" />
            <path d="M4 7v13a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7" />
            <path d="M9 21v-7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v7" />
          </>
        );

      // Eficiencia Energética / Rayo
      case 'bolt':
        return <path d="M13 2 4 14h7l-2 8 11-12h-7l2-8z" />;

      // Categorías & Dispositivos
      case 'technology':
        return (
          <>
            <rect width="18" height="12" x="3" y="4" rx="2" />
            <path d="M2 18h20M12 16v4" />
          </>
        );

      case 'laptop':
        return (
          <>
            <rect width="16" height="10" x="4" y="5" rx="1.5" />
            <path d="M2 19h20M9 19v-1h6v1" />
          </>
        );

      case 'smartphone':
        return (
          <>
            <rect width="12" height="18" x="6" y="3" rx="2" />
            <path d="M11 17h2" />
          </>
        );

      case 'tablet':
        return (
          <>
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <circle cx="12" cy="18" r="0.8" fill="currentColor" />
          </>
        );

      case 'appliances':
        return (
          <>
            <rect width="14" height="18" x="5" y="3" rx="2" />
            <path d="M5 10h14M9 6h1M9 14h1" />
          </>
        );

      case 'furniture':
        return (
          <>
            <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
            <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
            <path d="M5 18v3M19 18v3" />
          </>
        );

      case 'groceries':
        return (
          <>
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </>
        );

      // Utilidades
      case 'check':
        return <path d="M20 6 9 17l-5-5" />;

      case 'chevron_down':
        return <path d="m6 9 6 6 6-6" />;

      case 'chevron_up':
        return <path d="m18 15-6-6-6 6" />;

      case 'chevron_right':
        return <path d="m9 18 6-6-6-6" />;

      case 'refresh':
        return (
          <>
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            <path d="M8 16H3v5" />
          </>
        );

      case 'share':
        return (
          <>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
          </>
        );

      case 'tag':
        return (
          <>
            <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
            <path d="M7 7h.01" />
          </>
        );

      case 'shield':
        return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;

      case 'arrow_back':
        return <path d="M19 12H5M12 19l-7-7 7-7" />;

      case 'add':
        return <path d="M12 5v14M5 12h14" />;

      case 'chat':
        return (
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        );

      default:
        return (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </>
        );
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={s}
      height={s}
      className={`inline-svg-icon ${className}`}
      aria-hidden="true"
      {...rest}
    >
      {renderPath()}
    </svg>
  );
}
