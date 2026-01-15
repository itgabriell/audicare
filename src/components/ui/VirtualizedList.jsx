import React, { memo } from 'react';

// Componente base para listas virtualizadas (simplificado por enquanto)
const VirtualizedList = memo(({
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  renderItem,
  className = '',
  overscanCount = 5
}) => {
  if (!items || items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
      >
        <p className="text-muted-foreground">Nenhum item encontrado</p>
      </div>
    );
  }

  // Versão simplificada sem react-window por enquanto
  return (
    <div className={className} style={{ height: containerHeight, overflow: 'auto' }}>
      {items.map((item, index) => (
        <div key={item.id || index} style={{ height: itemHeight }}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
});

// Hook para detectar quando o usuário chegou ao final da lista
export const useInfiniteScroll = (hasNextPage, isFetchingNextPage, fetchNextPage) => {
  const observerRef = React.useRef();

  const lastItemRef = React.useCallback(
    (node) => {
      if (isFetchingNextPage) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasNextPage) {
            fetchNextPage();
          }
        },
        { threshold: 0.1 }
      );

      if (node) observerRef.current.observe(node);
    },
    [isFetchingNextPage, fetchNextPage, hasNextPage]
  );

  React.useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return lastItemRef;
};

// Componente para listas com paginação infinita
const InfiniteList = memo(({
  items = [],
  renderItem,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  itemHeight = 50,
  containerHeight = 400,
  loadingComponent,
  className = ''
}) => {
  const lastItemRef = useInfiniteScroll(hasNextPage, isFetchingNextPage, fetchNextPage);

  if (!items || items.length === 0) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height: containerHeight }}
      >
        <p className="text-muted-foreground">Nenhum item encontrado</p>
      </div>
    );
  }

  return (
    <div className={className} style={{ height: containerHeight, overflow: 'auto' }}>
      {items.map((item, index) => {
        const isLastItem = index === items.length - 1;
        return (
          <div
            key={item.id || index}
            ref={isLastItem ? lastItemRef : null}
            style={{ height: itemHeight }}
          >
            {renderItem(item, index)}
          </div>
        );
      })}

      {isFetchingNextPage && loadingComponent && (
        <div style={{ height: itemHeight }}>
          {loadingComponent}
        </div>
      )}
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';
InfiniteList.displayName = 'InfiniteList';

export { VirtualizedList, InfiniteList };
