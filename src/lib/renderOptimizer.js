import { memo, useMemo, useCallback, useRef, useEffect } from 'react';

// Sistema de otimização de re-renders
export class RenderOptimizer {
  constructor() {
    this.renderStats = new Map();
    this.componentRegistry = new Set();
    this.performanceMode = 'balanced'; // 'performance' | 'balanced' | 'compatibility'
  }

  // Registrar componente para monitoramento
  registerComponent(componentName, component) {
    this.componentRegistry.add(componentName);

    // Adicionar métricas de render
    if (!this.renderStats.has(componentName)) {
      this.renderStats.set(componentName, {
        renderCount: 0,
        lastRender: null,
        avgRenderTime: 0,
        propsChanges: 0
      });
    }
  }

  // Registrar render
  recordRender(componentName, renderTime, propsChanged) {
    const stats = this.renderStats.get(componentName);
    if (stats) {
      stats.renderCount++;
      stats.lastRender = Date.now();
      stats.avgRenderTime = (stats.avgRenderTime + renderTime) / 2;
      if (propsChanged) stats.propsChanges++;
    }
  }

  // Obter estatísticas de performance
  getPerformanceStats() {
    return Array.from(this.renderStats.entries()).map(([name, stats]) => ({
      component: name,
      ...stats,
      efficiency: stats.renderCount > 0 ? stats.propsChanges / stats.renderCount : 0
    }));
  }

  // Modo de performance
  setPerformanceMode(mode) {
    this.performanceMode = mode;
  }

  // Cleanup
  cleanup() {
    this.renderStats.clear();
    this.componentRegistry.clear();
  }
}

// Instância global
export const renderOptimizer = new RenderOptimizer();

// Hook para monitoramento de renders
export function useRenderTracking(componentName) {
  const renderCountRef = useRef(0);
  const lastPropsRef = useRef(null);
  const renderStartRef = useRef(null);

  useEffect(() => {
    renderCountRef.current++;
    renderStartRef.current = performance.now();

    return () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current;
        const propsChanged = JSON.stringify(lastPropsRef.current) !== JSON.stringify(arguments[0]);
        renderOptimizer.recordRender(componentName, renderTime, propsChanged);
      }
    };
  });

  return {
    renderCount: renderCountRef.current,
    lastPropsChanged: lastPropsRef.current !== arguments[0]
  };
}

// HOC para otimização automática de componentes
export function withRenderOptimization(Component, options = {}) {
  const {
    memoCompare = defaultMemoCompare,
    trackRenders = true,
    name = Component.displayName || Component.name
  } = options;

  // Registrar componente
  renderOptimizer.registerComponent(name, Component);

  const OptimizedComponent = memo((props) => {
    // Tracking opcional
    if (trackRenders) {
      useRenderTracking(name);
    }

    return <Component {...props} />;
  }, memoCompare);

  OptimizedComponent.displayName = `Optimized(${name})`;

  return OptimizedComponent;
}

// Função de comparação padrão para memo
function defaultMemoCompare(prevProps, nextProps) {
  // Comparação superficial para objetos aninhados
  return shallowEqual(prevProps, nextProps);
}

// Comparação superficial otimizada
function shallowEqual(obj1, obj2) {
  if (obj1 === obj2) return true;

  if (!obj1 || !obj2) return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!(key in obj2)) return false;

    const val1 = obj1[key];
    const val2 = obj2[key];

    // Para funções, comparar referência
    if (typeof val1 === 'function' && typeof val2 === 'function') {
      if (val1 !== val2) return false;
    }
    // Para objetos, comparação superficial
    else if (typeof val1 === 'object' && val1 !== null &&
             typeof val2 === 'object' && val2 !== null) {
      if (val1 !== val2) return false; // Referência diferente
    }
    // Para valores primitivos
    else if (val1 !== val2) {
      return false;
    }
  }

  return true;
}

// Hook para memoização inteligente de callbacks
export function useSmartMemo(callback, deps, options = {}) {
  const {
    maxAge = 5000, // 5 segundos
    compare = shallowEqual
  } = options;

  const memoizedRef = useRef({
    callback: null,
    deps: null,
    timestamp: 0
  });

  return useMemo(() => {
    const now = Date.now();
    const { current } = memoizedRef;

    // Verificar se deps mudaram e se não expirou
    if (!current.callback ||
        !compare(current.deps, deps) ||
        (now - current.timestamp) > maxAge) {

      current.callback = callback;
      current.deps = deps;
      current.timestamp = now;
    }

    return current.callback;
  }, deps);
}

// Hook para memoização condicional baseada em contexto
export function useConditionalMemo(value, condition, deps = []) {
  const prevConditionRef = useRef(condition);
  const prevValueRef = useRef(value);

  // Só memoizar se condição for verdadeira
  if (condition) {
    return useMemo(() => value, deps);
  }

  // Se condição mudou de true para false, retornar último valor memoizado
  if (prevConditionRef.current && !condition) {
    return prevValueRef.current;
  }

  // Caso contrário, retornar valor atual
  prevConditionRef.current = condition;
  prevValueRef.current = value;
  return value;
}

// Hook para debounce de updates
export function useDebouncedValue(value, delay) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Hook para throttle de renders
export function useThrottledValue(value, limit) {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Hook para lazy computation (cálculos pesados só quando necessário)
export function useLazyComputation(computeFn, deps, options = {}) {
  const {
    lazy = true,
    debounceMs = 0,
    priority = 'normal' // 'low' | 'normal' | 'high'
  } = options;

  const [result, setResult] = React.useState(null);
  const [computing, setComputing] = React.useState(false);
  const computationRef = useRef(null);

  const compute = useCallback(async () => {
    if (computing) return;

    setComputing(true);

    try {
      // Usar requestIdleCallback para baixa prioridade
      if (priority === 'low' && 'requestIdleCallback' in window) {
        await new Promise(resolve => {
          requestIdleCallback(() => {
            computationRef.current = computeFn();
            resolve();
          });
        });
      } else {
        computationRef.current = await computeFn();
      }

      setResult(computationRef.current);
    } catch (error) {
      console.error('[useLazyComputation] Erro na computação:', error);
    } finally {
      setComputing(false);
    }
  }, [computeFn, computing, priority]);

  useEffect(() => {
    if (!lazy) {
      compute();
    }
  }, deps);

  return {
    result,
    computing,
    compute: lazy ? compute : undefined,
    ref: computationRef
  };
}

// Hook para virtual scrolling inteligente
export function useVirtualScroll(items, itemHeight, containerHeight, options = {}) {
  const {
    overscan = 5,
    dynamicHeight = false
  } = options;

  const [scrollTop, setScrollTop] = React.useState(0);
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 0 });

  const totalHeight = useMemo(() => {
    if (dynamicHeight) {
      return items.reduce((sum, item) => sum + (item.height || itemHeight), 0);
    }
    return items.length * itemHeight;
  }, [items, itemHeight, dynamicHeight]);

  // Calcular range visível
  const updateVisibleRange = useCallback(() => {
    const start = Math.floor(scrollTop / itemHeight) - overscan;
    const end = Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan;

    setVisibleRange({
      start: Math.max(0, start),
      end: Math.min(items.length, end)
    });
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  useEffect(() => {
    updateVisibleRange();
  }, [updateVisibleRange]);

  // Itens visíveis
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      ...item,
      virtualIndex: visibleRange.start + index,
      offsetTop: dynamicHeight ?
        items.slice(0, visibleRange.start + index).reduce((sum, i) => sum + (i.height || itemHeight), 0) :
        (visibleRange.start + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight, dynamicHeight]);

  return {
    scrollTop,
    setScrollTop,
    visibleItems,
    totalHeight,
    visibleRange
  };
}

// Hook para otimização de listas grandes
export function useOptimizedList(items, options = {}) {
  const {
    itemHeight = 50,
    containerHeight = 400,
    virtualization = true,
    memoization = true
  } = options;

  // Memoização condicional
  const memoizedItems = useConditionalMemo(
    items,
    memoization,
    [items]
  );

  // Virtualização condicional
  const virtualScroll = useVirtualScroll(
    memoizedItems,
    itemHeight,
    containerHeight,
    { overscan: 3 }
  );

  // Retornar dados otimizados
  if (virtualization && memoizedItems.length > 50) {
    return {
      items: virtualScroll.visibleItems,
      totalHeight: virtualScroll.totalHeight,
      isVirtualized: true,
      scrollTop: virtualScroll.scrollTop,
      setScrollTop: virtualScroll.setScrollTop
    };
  }

  return {
    items: memoizedItems,
    totalHeight: memoizedItems.length * itemHeight,
    isVirtualized: false
  };
}

// Componente base otimizado
export const OptimizedDiv = withRenderOptimization('div', {
  memoCompare: (prevProps, nextProps) => {
    // Comparação customizada para elementos DOM
    return (
      prevProps.children === nextProps.children &&
      prevProps.className === nextProps.className &&
      prevProps.style === nextProps.style &&
      shallowEqual(prevProps, nextProps)
    );
  }
});

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.RenderOptimizer = {
    stats: () => renderOptimizer.getPerformanceStats(),
    clear: () => renderOptimizer.cleanup(),
    mode: (mode) => renderOptimizer.setPerformanceMode(mode),
    getMode: () => renderOptimizer.performanceMode
  };
}

// Hook para monitoramento de performance em produção
export function usePerformanceMonitor(componentName, options = {}) {
  const {
    logThreshold = 100, // ms
    enableLogging = process.env.NODE_ENV === 'development'
  } = options;

  const renderStartRef = useRef(null);
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderStartRef.current = performance.now();
    renderCountRef.current++;

    return () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current;

        if (enableLogging && renderTime > logThreshold) {
          console.warn(`[Performance] ${componentName} render lento: ${renderTime.toFixed(2)}ms (render #${renderCountRef.current})`);
        }
      }
    };
  });

  return {
    renderCount: renderCountRef.current
  };
}

// Hook para batch updates
export function useBatchUpdate(updates, batchSize = 10) {
  const [batches, setBatches] = React.useState([]);
  const [currentBatch, setCurrentBatch] = React.useState(0);

  useEffect(() => {
    if (updates.length === 0) return;

    const newBatches = [];
    for (let i = 0; i < updates.length; i += batchSize) {
      newBatches.push(updates.slice(i, i + batchSize));
    }

    setBatches(newBatches);
    setCurrentBatch(0);
  }, [updates, batchSize]);

  const processNextBatch = useCallback(() => {
    if (currentBatch < batches.length) {
      const batch = batches[currentBatch];
      // Process batch here
      console.log(`Processing batch ${currentBatch + 1}/${batches.length}:`, batch);
      setCurrentBatch(prev => prev + 1);
    }
  }, [batches, currentBatch]);

  return {
    batches,
    currentBatch,
    totalBatches: batches.length,
    processNextBatch,
    isComplete: currentBatch >= batches.length
  };
}
