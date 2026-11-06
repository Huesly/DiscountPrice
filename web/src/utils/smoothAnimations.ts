import { useEffect, useRef, useState } from 'react';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Ejecuta un cambio de estado dentro de View Transitions API si el navegador lo soporta,
 * logrando una transición ultra suave entre vistas y filtros.
 */
export function runSmoothTransition(updateFn: () => void): void {
  if (prefersReducedMotion()) {
    updateFn();
    return;
  }
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  if (typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(() => {
      updateFn();
    });
  } else {
    updateFn();
  }
}

/**
 * Micro-animación elástica en JS (Web Animations API) al tocar un botón o filtro.
 */
export function animateTap(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return;
  el.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1.02)' },
      { transform: 'scale(1)' },
    ],
    {
      duration: 260,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    }
  );
}

/**
 * Animación de pulso suave al guardar/quitar un favorito.
 */
export function animateHeartPop(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return;
  el.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.32)' },
      { transform: 'scale(0.9)' },
      { transform: 'scale(1)' },
    ],
    {
      duration: 340,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    }
  );
}

/**
 * Hook de JS que anima en cascada (stagger) las tarjetas hijas de un contenedor
 * usando la Web Animations API (manteniendo opacity + transform en el compositor).
 */
export function useStaggerCards<T extends HTMLElement>(
  depKey: string | number,
  selector = '.product-card, .compare-card, .group-card'
) {
  const containerRef = useRef<T | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || prefersReducedMotion()) return;

    const cards = Array.from(container.querySelectorAll<HTMLElement>(selector));
    cards.forEach((card, idx) => {
      if (typeof card.animate !== 'function') return;
      const delay = Math.min(idx * 28, 360);
      card.animate(
        [
          { opacity: 0, transform: 'translateY(16px) scale(0.975)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ],
        {
          duration: 360,
          delay,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'both',
        }
      );
    });
  }, [depKey, selector]);

  return containerRef;
}

/**
 * Hook de JS con requestAnimationFrame para animar números suavemente al filtrar.
 */
export function useAnimatedNumber(target: number, durationMs = 320): number {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }
    const startVal = prevRef.current;
    const diff = target - startVal;
    if (diff === 0) return;

    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + diff * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevRef.current = target;
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return display;
}
