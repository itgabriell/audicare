import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const StatsCard = ({ title, value, icon: Icon, trend, trendUp, variant = 'default' }) => {
  const variantStyles = {
    default: 'border',
    destructive: 'border-destructive/50 bg-destructive/5',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-card rounded-xl shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all",
        variantStyles[variant] || variantStyles.default
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trendUp ? 'text-green-600' : 'text-muted-foreground'}`}>
            {trendUp && <TrendingUp className="h-4 w-4" />}
            <span>{trend}</span>
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-foreground mb-1">{value}</h3>
      <p className="text-sm text-muted-foreground">{title}</p>
    </motion.div>
  );
};

export default StatsCard;