import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  X,
  Loader2,
  ChevronRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Variants para diferentes tipos de toast
const advancedToastVariants = cva(
  'group relative overflow-hidden rounded-xl border p-4 pr-12 shadow-lg backdrop-blur-sm transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-background/95 border-border text-foreground',
        success: 'bg-green-50/95 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
        error: 'bg-red-50/95 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
        warning: 'bg-amber-50/95 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
        info: 'bg-blue-50/95 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
        loading: 'bg-slate-50/95 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100'
      },
      size: {
        sm: 'p-3 pr-8 text-sm',
        md: 'p-4 pr-10 text-sm',
        lg: 'p-5 pr-12 text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
);

// Hook personalizado para gerenciar toasts avançados
export const useAdvancedToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      duration: toast.duration || 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remover após duração
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const updateToast = (id, updates) => {
    setToasts(prev => prev.map(toast =>
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  };

  return {
    toasts,
    addToast,
    removeToast,
    updateToast,
    success: (message, options = {}) => addToast({ ...options, message, variant: 'success', icon: CheckCircle2 }),
    error: (message, options = {}) => addToast({ ...options, message, variant: 'error', icon: XCircle }),
    warning: (message, options = {}) => addToast({ ...options, message, variant: 'warning', icon: AlertCircle }),
    info: (message, options = {}) => addToast({ ...options, message, variant: 'info', icon: Info }),
    loading: (message, options = {}) => addToast({ ...options, message, variant: 'loading', icon: Loader2 }),
  };
};

// Componente principal do AdvancedToast
export const AdvancedToast = ({
  id,
  title,
  message,
  variant = 'default',
  size = 'md',
  icon: Icon,
  actions = [],
  onClose,
  className,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Animação de progresso se houver actions
    if (actions.length > 0) {
      const interval = setInterval(() => {
        setProgress(prev => Math.max(0, prev - 2));
      }, 50);
      return () => clearInterval(interval);
    }
  }, [actions]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(id), 300);
  };

  const getIconColor = () => {
    switch (variant) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      case 'info': return 'text-blue-600 dark:text-blue-400';
      case 'loading': return 'text-slate-600 dark:text-slate-400';
      default: return 'text-foreground';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(advancedToastVariants({ variant, size }), className)}
          {...props}
        >
          {/* Barra de progresso para toasts com ações */}
          {actions.length > 0 && (
            <motion.div
              className="absolute top-0 left-0 right-0 h-1 bg-primary/20 rounded-t-xl overflow-hidden"
              initial={{ width: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            >
              <div className="h-full bg-primary rounded-r-xl" />
            </motion.div>
          )}

          <div className="flex items-start gap-3">
            {/* Ícone */}
            {Icon && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 500 }}
                className={cn('flex-shrink-0 mt-0.5', getIconColor())}
              >
                {variant === 'loading' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </motion.div>
            )}

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              {title && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-semibold text-sm"
                >
                  {title}
                </motion.div>
              )}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: title ? 0.3 : 0.2 }}
                className="text-sm opacity-90 leading-relaxed"
              >
                {message}
              </motion.div>

              {/* Ações */}
              {actions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex flex-wrap gap-2 mt-3"
                >
                  {actions.map((action, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        size="sm"
                        variant={action.variant || 'outline'}
                        onClick={() => {
                          action.onClick();
                          if (action.closeOnClick !== false) {
                            handleClose();
                          }
                        }}
                        className="h-7 px-3 text-xs"
                      >
                        {action.icon && <action.icon className="h-3 w-3 mr-1.5" />}
                        {action.label}
                        {action.external && <ExternalLink className="h-3 w-3 ml-1.5" />}
                      </Button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Botão de fechar */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              onClick={handleClose}
              className={cn(
                'absolute top-3 right-3 p-1 rounded-md transition-colors opacity-60 hover:opacity-100',
                'hover:bg-black/5 dark:hover:bg-white/5'
              )}
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>

          {/* Efeitos de hover */}
          <motion.div
            className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background: variant === 'success' ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.02))' :
                        variant === 'error' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(239, 68, 68, 0.02))' :
                        variant === 'warning' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), rgba(245, 158, 11, 0.02))' :
                        variant === 'info' ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02))' :
                        'linear-gradient(135deg, rgba(0, 0, 0, 0.02), rgba(0, 0, 0, 0.01))'
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Container para múltiplos toasts avançados
export const AdvancedToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <AdvancedToast
            key={toast.id}
            {...toast}
            onClose={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Hook simplificado para uso comum
export const toast = {
  success: (message, options = {}) => {
    // Integra com o sistema de toast existente se disponível
    // Por enquanto, usa console.log para demo
    console.log('🍎 Success:', message, options);
  },
  error: (message, options = {}) => {
    console.log('❌ Error:', message, options);
  },
  warning: (message, options = {}) => {
    console.log('⚠️ Warning:', message, options);
  },
  info: (message, options = {}) => {
    console.log('ℹ️ Info:', message, options);
  },
  loading: (message, options = {}) => {
    console.log('⏳ Loading:', message, options);
  }
};

export default AdvancedToast;
