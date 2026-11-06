import GIcon from './GIcon';
import { animateTap, runSmoothTransition } from '../utils/smoothAnimations';

export interface CategoryDef {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  variables: {
    label: string;
    term: string;
    icon: string;
    subVariables?: { label: string; term: string }[];
  }[];
}

export const MAIN_CATEGORIES: CategoryDef[] = [
  {
    id: '',
    name: 'Todo el Catálogo',
    shortName: 'Todo',
    icon: 'dashboard',
    description: 'Explora más de 30.000 productos y ofertas en todas las tiendas',
    variables: [
      { label: 'Todos los productos', term: '', icon: 'apps' },
      { label: '💡 Lámparas e Iluminación', term: 'lampara', icon: 'lightbulb' },
      { label: '❄️ Neveras Económicas', term: 'nevera', icon: 'ac_unit' },
      { label: '🍚 Arroz y Granos', term: 'arroz', icon: 'grain' },
      { label: '🖥️ Escritorios', term: 'escritorio', icon: 'desk' },
      { label: '🪑 Sillas de Oficina', term: 'silla', icon: 'chair' },
      { label: '🍳 Freidoras de Aire', term: 'freidora', icon: 'skillet' },
      { label: '🥛 Leche y Lácteos', term: 'leche', icon: 'water_drop' },
      { label: '📱 Celulares Samsung', term: 'samsung', icon: 'smartphone' },
    ],
  },
  {
    id: 'Muebles y Hogar',
    name: 'Muebles y Decoración',
    shortName: 'Muebles',
    icon: 'chair',
    description: 'Iluminación, escritorios, salas y muebles de IKEA, Homecenter y Falabella',
    variables: [
      {
        label: '💡 Lámparas e Iluminación',
        term: 'lampara',
        icon: 'lightbulb',
        subVariables: [
          { label: 'Todas las lámparas', term: 'lampara' },
          { label: 'Lámparas de Mesa', term: 'lampara de mesa' },
          { label: 'Lámparas de Pie', term: 'lampara de pie' },
          { label: 'Lámparas de Techo', term: 'lampara de techo' },
          { label: 'Bombillos LED', term: 'bombillo' },
        ],
      },
      { label: '🖥️ Escritorios', term: 'escritorio', icon: 'desk' },
      { label: '🪑 Sillas y Oficina', term: 'silla', icon: 'chair_alt' },
      { label: '🛏️ Camas y Colchones', term: 'colchon', icon: 'bed' },
      { label: '🛋️ Sofás y Salas', term: 'sofa', icon: 'weekend' },
      { label: '🍽️ Comedores y Mesas', term: 'comedor', icon: 'table_restaurant' },
      { label: '🗄️ Estantes y Repisas', term: 'estante', icon: 'shelves' },
      { label: '🚪 Closets y Armarios', term: 'closet', icon: 'door_sliding' },
      { label: '🪟 Persianas y Cortinas', term: 'persiana', icon: 'blinds' },
      { label: '🪞 Espejos y Decoración', term: 'espejo', icon: 'crop_portrait' },
    ],
  },
  {
    id: 'Electrohogar y Cocina',
    name: 'Electrohogar y Cocina',
    shortName: 'Electrohogar',
    icon: 'kitchen',
    description: 'Neveras Tipo A, freidoras de aire, licuadoras y electrodomésticos',
    variables: [
      {
        label: '❄️ Neveras y Refrigeración',
        term: 'nevera',
        icon: 'ac_unit',
        subVariables: [
          { label: 'Todas las Neveras', term: 'nevera' },
          { label: '⚡ Neveras Tipo A (Ahorro)', term: 'nevera' },
          { label: 'Minibares', term: 'minibar' },
          { label: 'Nevecones', term: 'nevecon' },
        ],
      },
      { label: '🍳 Freidoras de Aire (Airfryers)', term: 'freidora', icon: 'skillet' },
      { label: '🥤 Licuadoras y Batidoras', term: 'licuadora', icon: 'blender' },
      { label: '🍲 Ollas y Sartenes', term: 'olla', icon: 'cooking' },
      { label: '☕ Cafeteras', term: 'cafetera', icon: 'coffee_maker' },
      { label: '🍿 Hornos y Microondas', term: 'microondas', icon: 'microwave' },
      { label: '🧺 Lavadoras y Secado', term: 'lavadora', icon: 'local_laundry_service' },
    ],
  },
  {
    id: 'Comidas y Supermercado',
    name: 'Supermercado y Alimentos',
    shortName: 'Supermercado',
    icon: 'shopping_basket',
    description: 'Canasta básica de Tiendas D1, Ara y Éxito con unidad de medida',
    variables: [
      { label: 'Toda la Despensa', term: '', icon: 'storefront' },
      { label: '🍚 Arroz y Granos', term: 'arroz', icon: 'grain' },
      { label: '🫒 Aceites Vegetales', term: 'aceite', icon: 'opacity' },
      { label: '🥛 Leche y Lácteos', term: 'leche', icon: 'water_drop' },
      { label: '🥚 Huevos y Proteínas', term: 'huevos', icon: 'egg' },
      { label: '☕ Café y Bebidas', term: 'cafe', icon: 'local_cafe' },
      { label: '🥫 Atún y Enlatados', term: 'atun', icon: 'bento' },
      { label: '🍝 Pastas y Harinas', term: 'pasta', icon: 'ramen_dining' },
      { label: '🧀 Quesos y Derivados', term: 'queso', icon: 'bakery_dining' },
      { label: '🍞 Panadería y Galletas', term: 'pan', icon: 'breakfast_dining' },
      { label: '🥣 Azúcar y Avena', term: 'azucar', icon: 'nutrition' },
    ],
  },
  {
    id: 'Tecnología y Celulares',
    name: 'Tecnología y Celulares',
    shortName: 'Tecnología',
    icon: 'devices',
    description: 'Celulares, Smart TVs, portátiles y accesorios',
    variables: [
      { label: 'Toda la Tecnología', term: '', icon: 'devices' },
      { label: '📱 Celulares Samsung', term: 'samsung', icon: 'smartphone' },
      { label: '🍏 iPhone y Apple', term: 'iphone', icon: 'phone_iphone' },
      { label: '⚡ Xiaomi y Android', term: 'xiaomi', icon: 'android' },
      { label: '📺 Smart TVs y Pantallas', term: 'televisor', icon: 'tv' },
      { label: '💻 Portátiles y Laptops', term: 'portatil', icon: 'laptop' },
      { label: '🎧 Audífonos y Sonido', term: 'audifonos', icon: 'headphones' },
    ],
  },
];

interface Props {
  activeCategory: string;
  activeTerm: string;
  activeEnergyA?: boolean;
  onSelectCategory: (categoryId: string) => void;
  onSelectVariable: (term: string, opts?: { category?: string; energyA?: boolean }) => void;
  onCollectFood: () => Promise<void>;
  collectingFood: boolean;
}

export default function CategoryBar({
  activeCategory,
  activeTerm,
  activeEnergyA,
  onSelectCategory,
  onSelectVariable,
  onCollectFood,
  collectingFood,
}: Props) {
  // Encontrar la categoría actual o predeterminar la primera
  const currentCategory =
    MAIN_CATEGORIES.find((c) => c.id === activeCategory) ?? MAIN_CATEGORIES[0];

  // Identificar si una variable con sub-variables está abierta
  const activeVarWithSub = currentCategory.variables.find(
    (v) => v.subVariables && activeTerm.toLowerCase().includes(v.term.toLowerCase())
  );

  return (
    <section className="dynamic-categories-section" aria-label="Explorador de Categorías y Variables">
      {/* 1. Selector de Categorías Principales */}
      <div className="cat-selector-header">
        <div className="cat-selector-title-wrap">
          <GIcon name="filter_list" size={18} className="cat-header-icon" />
          <h2 className="cat-selector-heading">Categorías Principales</h2>
        </div>
        <p className="cat-selector-hint">{currentCategory.description}</p>
      </div>

      <div className="main-cat-tabs" role="tablist">
        {MAIN_CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id || 'all'}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`main-cat-tab ${isSelected ? 'is-selected' : ''}`}
              onClick={(e) => {
                animateTap(e.currentTarget);
                runSmoothTransition(() => onSelectCategory(cat.id));
              }}
            >
              <div className="cat-tab-icon-wrap">
                <GIcon name={cat.icon} size={20} className="cat-tab-icon" />
              </div>
              <div className="cat-tab-text">
                <span className="cat-tab-name-full">{cat.name}</span>
                <span className="cat-tab-name-short">{cat.shortName}</span>
              </div>
              {isSelected && <span className="cat-tab-indicator" />}
            </button>
          );
        })}
      </div>

      {/* 2. Variables de Producto Independientes (Nivel 2) */}
      <div className="cat-variables-panel">
        <div className="variables-header-row">
          <div className="variables-title-wrap">
            <span className="variables-badge">Variables</span>
            <span className="variables-title">
              Filtrar en {currentCategory.name}:
            </span>
          </div>

          {currentCategory.id === 'Comidas y Supermercado' && (
            <button
              type="button"
              className="btn-refresh-food-clean"
              onClick={onCollectFood}
              disabled={collectingFood}
              title="Consultar precios en vivo en Tiendas D1, Ara y Éxito"
            >
              <GIcon
                name="sync"
                size={16}
                className={collectingFood ? 'spin' : ''}
              />
              <span>{collectingFood ? 'Actualizando...' : 'Actualizar Precios en Vivo'}</span>
            </button>
          )}
        </div>

        <div className="variables-chips-grid">
          {currentCategory.variables.map((v) => {
            const isSelected =
              activeTerm.toLowerCase() === v.term.toLowerCase() &&
              (!v.subVariables || !activeEnergyA);

            return (
              <button
                key={v.label}
                type="button"
                className={`variable-chip ${isSelected ? 'is-selected' : ''}`}
                onClick={(e) => {
                  animateTap(e.currentTarget);
                  runSmoothTransition(() => {
                    const nextTerm = isSelected ? '' : v.term;
                    const isNevera = nextTerm.toLowerCase() === 'nevera';
                    onSelectVariable(nextTerm, {
                      category: currentCategory.id,
                      energyA: nextTerm ? isNevera : false,
                    });
                  });
                }}
              >
                <GIcon name={v.icon} size={16} className="var-chip-icon" />
                <span className="var-chip-label">{v.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Sub-Variables Específicas (ej. Lámparas o Neveras) */}
        {activeVarWithSub && (
          <div className="sub-variables-row">
            <span className="sub-vars-label">Tipo específico:</span>
            <div className="sub-vars-list">
              {activeVarWithSub.subVariables?.map((sub) => {
                const isSubActive =
                  sub.label.includes('Tipo A')
                    ? activeEnergyA
                    : activeTerm.toLowerCase() === sub.term.toLowerCase() && !activeEnergyA;

                return (
                  <button
                    key={sub.label}
                    type="button"
                    className={`sub-var-pill ${isSubActive ? 'is-active' : ''}`}
                    onClick={(e) => {
                      animateTap(e.currentTarget);
                      runSmoothTransition(() => {
                        const isTipoA = sub.label.includes('Tipo A');
                        onSelectVariable(sub.term, {
                          category: currentCategory.id,
                          energyA: isTipoA,
                        });
                      });
                    }}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
