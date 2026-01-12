import React from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FilterPanel = () => {
  return (
    <Button variant="outline" size="sm" className="gap-2">
      <Filter className="h-4 w-4" />
      Filtros
    </Button>
  );
};

export default FilterPanel;