import { useEffect, useCallback, useState } from 'react';

// Hook para gerenciamento de foco e navegação por teclado
export function useKeyboardNavigation() {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [items, setItems] = useState([]);

  const registerItem = useCallback((element) => {
    if (element && !items.includes(element)) {
      setItems(prev => [...prev, element]);
    }
  }, [items]);

  const unregisterItem = useCallback((element) => {
    setItems(prev => prev.filter(item => item !== element));
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (!items.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => prev === 0 ? items.length - 1 : prev - 1);
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && items[focusedIndex]) {
          items[focusedIndex].click();
        }
        break;
    }
  }, [items, focusedIndex]);

  // Focar o elemento quando o índice mudar
  useEffect(() => {
    if (focusedIndex >= 0 && items[focusedIndex]) {
      items[focusedIndex].focus();
    }
  }, [focusedIndex, items]);

  return {
    focusedIndex,
    registerItem,
    unregisterItem,
    handleKeyDown,
    setFocusedIndex
  };
}

// Hook para anúncios de tela (screen reader)
export function useScreenReader() {
  const announce = useCallback((message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.setAttribute('class', 'sr-only');
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remover após anunciar
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  const announceError = useCallback((message) => {
    announce(`Erro: ${message}`, 'assertive');
  }, [announce]);

  const announceSuccess = useCallback((message) => {
    announce(`Sucesso: ${message}`, 'polite');
  }, [announce]);

  const announceLoading = useCallback((message) => {
    announce(message, 'polite');
  }, [announce]);

  return {
    announce,
    announceError,
    announceSuccess,
    announceLoading
  };
}

// Hook para gerenciamento de foco em modais e overlays
export function useFocusTrap(containerRef, isActive = true) {
  const [focusedElement, setFocusedElement] = useState(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Salvar elemento focado anteriormente
    const previouslyFocused = document.activeElement;

    // Focar primeiro elemento
    if (firstElement) {
      firstElement.focus();
      setFocusedElement(firstElement);
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }

      // Escape para fechar
      if (event.key === 'Escape') {
        event.preventDefault();
        // Emitir evento customizado para o componente pai
        const escapeEvent = new CustomEvent('focustrap:escape');
        container.dispatchEvent(escapeEvent);
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      // Restaurar foco anterior
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [containerRef, isActive]);

  return { focusedElement };
}

// Hook para reduzir movimento (prefers-reduced-motion)
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

// Hook para alto contraste
export function useHighContrast() {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (event) => {
      setPrefersHighContrast(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
}

// Hook para modo de cor (prefers-color-scheme)
export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState('light');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setColorScheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (event) => {
      setColorScheme(event.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return colorScheme;
}

// Utilitários de acessibilidade
export const a11y = {
  // Gera IDs únicos para labels
  generateId: (prefix = 'a11y') => `${prefix}-${Math.random().toString(36).substr(2, 9)}`,

  // Verifica se elemento está visível na tela
  isVisible: (element) => {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  // Move foco para elemento
  moveFocus: (element, options = {}) => {
    if (!element) return;

    const { preventScroll = false } = options;

    if (typeof element.focus === 'function') {
      element.focus({ preventScroll });
    }
  },

  // Anuncia mensagem para screen readers
  announce: (message, priority = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  },

  // Trap focus em container
  trapFocus: (container, event) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }
};
