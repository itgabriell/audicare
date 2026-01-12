import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Breadcrumbs = ({ items, className }) => {
  return (
    <nav className={cn("flex items-center text-sm text-muted-foreground mb-4", className)}>
      <Link to="/home" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
          {item.href ? (
            <Link to={item.href} className="hover:text-foreground transition-colors font-medium">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-semibold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;