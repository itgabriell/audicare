import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap,
  Shield,
  Crown,
  Sparkles,
  Maximize2,
  Minimize2,
  Settings,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Hook para detectar tamanho da tela e ajustar modal
const useResponsiveModal = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return { isMobile, isFullscreen, setIsFullscreen };
};

// Hook para gerenciar estados de loading do modal
const useModalState = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);

  const startLoading = (steps = 1) => {
    setLoading(true);
    setProgress(0);
    setStep(1);
    setTotalSteps(steps);
  };

  const updateProgress = (currentStep, newProgress) => {
    setStep(currentStep);
    setProgress(newProgress);
  };

  const completeLoading = () => {
    setLoading(false);
    setProgress(100);
  };

  return {
    loading,
    progress,
    step,
    totalSteps,
    startLoading,
    updateProgress,
    completeLoading,
    setLoading
  };
};

// Componente de overlay avançado com backdrop blur
const AdvancedDialogOverlay = React.forwardRef(({
  className,
  blur = 'md',
  variant = 'default',
  ...props
}, ref) => {
  const getBlurClass = () => {
    switch (blur) {
      case 'sm': return 'backdrop-blur-sm';
      case 'lg': return 'backdrop-blur-lg';
      case 'xl': return 'backdrop-blur-xl';
      case 'none': return '';
      default: return 'backdrop-blur-md';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'glass':
        return 'bg-background/20 backdrop-blur-xl border border-white/20';
      case 'dark':
        return 'bg-black/60 backdrop-blur-lg';
      case 'blur':
        return 'bg-background/40 backdrop-blur-2xl';
      default:
        return 'bg-background/80 backdrop-blur-sm';
    }
  };

  return (
    <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        getBlurClass(),
        getVariantStyles(),
        className
      )}
      {...props}
    />
  );
});
AdvancedDialogOverlay.displayName = "AdvancedDialogOverlay";

// Componente de conteúdo avançado do modal
const AdvancedDialogContent = React.forwardRef(({
  className,
  children,
  variant = 'default',
  size = 'default',
  showCloseButton = true,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  draggable = false,
  fullscreen = false,
  glassEffect = false,
  ...props
}, ref) => {
  const { isMobile } = useResponsiveModal();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const getSizeClasses = () => {
    if (fullscreen) {
      return 'w-full h-full max-w-none rounded-none';
    }

    switch (size) {
      case 'sm': return 'max-w-md';
      case 'lg': return 'max-w-2xl';
      case 'xl': return 'max-w-4xl';
      case '2xl': return 'max-w-6xl';
      case 'full': return 'max-w-full mx-4';
      default: return 'max-w-lg';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'glass':
        return 'bg-background/80 backdrop-blur-xl border-white/20 shadow-2xl';
      case 'minimal':
        return 'bg-background border shadow-lg';
      case 'elevated':
        return 'bg-background border shadow-2xl ring-1 ring-black/5';
      default:
        return 'bg-background border shadow-lg';
    }
  };

  return (
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 p-6 duration-200",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
        "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        getSizeClasses(),
        getVariantClasses(),
        isMobile && 'mx-4 max-h-[90vh] overflow-y-auto',
        fullscreen && 'fixed inset-4',
        className
      )}
      style={draggable && !fullscreen ? {
        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`
      } : undefined}
      {...props}
    >
      {children}

      {/* Botão de fechar avançado */}
      {showCloseButton && (
        <motion.button
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 500 }}
          className={cn(
            "absolute right-4 top-4 z-10 rounded-full p-2 transition-all duration-200",
            "opacity-70 hover:opacity-100 hover:bg-accent hover:scale-110",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "group"
          )}
          onClick={() => props.onOpenChange?.(false)}
        >
          <X className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
          <span className="sr-only">Fechar</span>
        </motion.button>
      )}

      {/* Efeitos de glass/hover */}
      {glassEffect && (
        <motion.div
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))'
          }}
        />
      )}
    </DialogPrimitive.Content>
  );
});
AdvancedDialogContent.displayName = "AdvancedDialogContent";

// Componente de header avançado
const AdvancedDialogHeader = React.forwardRef(({
  className,
  title,
  subtitle,
  icon: Icon,
  variant = 'default',
  showProgress = false,
  progress = 0,
  step,
  totalSteps,
  ...props
}, ref) => {
  const getIconColor = () => {
    switch (variant) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-amber-600 dark:text-amber-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      case 'info': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-primary';
    }
  };

  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-3 pb-4 border-b", className)}
      {...props}
    >
      {/* Título com ícone */}
      <div className="flex items-center gap-3">
        {Icon && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500 }}
            className={cn("p-2 rounded-lg bg-primary/10", getIconColor())}
          >
            <Icon className="h-5 w-5" />
          </motion.div>
        )}

        <div className="flex-1">
          <motion.h2
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-lg font-semibold leading-none tracking-tight"
          >
            {title}
          </motion.h2>
          {subtitle && (
            <motion.p
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm text-muted-foreground mt-1"
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      {showProgress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{step && totalSteps ? `Passo ${step} de ${totalSteps}` : 'Progresso'}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </motion.div>
      )}
    </div>
  );
});
AdvancedDialogHeader.displayName = "AdvancedDialogHeader";

// Componente de footer avançado
const AdvancedDialogFooter = React.forwardRef(({
  className,
  actions = [],
  loading = false,
  loadingText = 'Salvando...',
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse gap-2 pt-4 border-t sm:flex-row sm:justify-end sm:gap-2",
        className
      )}
      {...props}
    >
      {actions.map((action, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant={action.variant || 'outline'}
            onClick={action.onClick}
            disabled={loading || action.disabled}
            className="w-full sm:w-auto"
          >
            {action.icon && <action.icon className="h-4 w-4 mr-2" />}
            {action.label}
          </Button>
        </motion.div>
      ))}

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </motion.div>
      )}
    </div>
  );
});
AdvancedDialogFooter.displayName = "AdvancedDialogFooter";

// Modal avançado completo
export const AdvancedModal = ({
  children,
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  variant = 'default',
  size = 'default',
  actions = [],
  loading = false,
  loadingText,
  showProgress = false,
  progress = 0,
  step,
  totalSteps,
  glassEffect = false,
  draggable = false,
  fullscreen: initialFullscreen = false,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  ...props
}) => {
  const { isFullscreen, setIsFullscreen } = useResponsiveModal();
  const [fullscreen, setFullscreen] = useState(initialFullscreen);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      modal={!closeOnOutsideClick}
    >
      <DialogPrimitive.Portal>
        <AdvancedDialogOverlay
          variant={glassEffect ? 'glass' : 'default'}
        />

        <AdvancedDialogContent
          variant={variant}
          size={size}
          fullscreen={fullscreen}
          glassEffect={glassEffect}
          draggable={draggable && !fullscreen}
          className="relative"
          {...props}
        >
          <AdvancedDialogHeader
            title={title}
            subtitle={subtitle}
            icon={icon}
            variant={variant}
            showProgress={showProgress}
            progress={progress}
            step={step}
            totalSteps={totalSteps}
          />

          <div className="flex-1 py-4">
            {children}
          </div>

          <AdvancedDialogFooter
            actions={[
              ...actions,
              // Botão de fullscreen se não for mobile
              !useResponsiveModal().isMobile && {
                label: fullscreen ? 'Minimizar' : 'Maximizar',
                icon: fullscreen ? Minimize2 : Maximize2,
                variant: 'ghost',
                onClick: () => setFullscreen(!fullscreen)
              }
            ].filter(Boolean)}
            loading={loading}
            loadingText={loadingText}
          />
        </AdvancedDialogContent>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

// Modal de confirmação avançado
export const AdvancedConfirmModal = ({
  open,
  onOpenChange,
  title = 'Confirmar Ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'warning',
  icon: Icon = AlertTriangle,
  onConfirm,
  loading = false,
  ...props
}) => {
  const getConfirmVariant = () => {
    switch (variant) {
      case 'danger': return 'destructive';
      case 'success': return 'default';
      default: return 'default';
    }
  };

  return (
    <AdvancedModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={Icon}
      variant={variant}
      size="sm"
      actions={[
        {
          label: cancelLabel,
          variant: 'outline',
          onClick: () => onOpenChange(false)
        },
        {
          label: confirmLabel,
          variant: getConfirmVariant(),
          onClick: onConfirm,
          disabled: loading
        }
      ]}
      {...props}
    >
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
    </AdvancedModal>
  );
};

// Modal de loading avançado
export const AdvancedLoadingModal = ({
  open,
  title = 'Processando...',
  message,
  progress,
  step,
  totalSteps,
  icon: Icon = Loader2,
  ...props
}) => {
  return (
    <AdvancedModal
      open={open}
      title={title}
      icon={Icon}
      variant="info"
      size="sm"
      showProgress={!!progress}
      progress={progress}
      step={step}
      totalSteps={totalSteps}
      closeOnEscape={false}
      closeOnOutsideClick={false}
      {...props}
    >
      <div className="flex flex-col items-center gap-4 py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="p-4 bg-primary/10 rounded-full"
        >
          <Icon className="h-8 w-8 text-primary" />
        </motion.div>

        {message && (
          <p className="text-center text-sm text-muted-foreground">
            {message}
          </p>
        )}

        {progress !== undefined && (
          <div className="w-full max-w-xs">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-xs text-muted-foreground mt-2">
              {Math.round(progress)}% concluído
            </p>
          </div>
        )}
      </div>
    </AdvancedModal>
  );
};

// Modal de sucesso avançado
export const AdvancedSuccessModal = ({
  open,
  onOpenChange,
  title = 'Sucesso!',
  message,
  icon: Icon = CheckCircle2,
  actions = [],
  autoClose = true,
  autoCloseDelay = 3000,
  ...props
}) => {
  useEffect(() => {
    if (open && autoClose && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        onOpenChange(false);
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [open, autoClose, autoCloseDelay, onOpenChange]);

  return (
    <AdvancedModal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      icon={Icon}
      variant="success"
      size="sm"
      actions={actions.length > 0 ? actions : [
        { label: 'Fechar', onClick: () => onOpenChange(false) }
      ]}
      glassEffect
      {...props}
    >
      <div className="flex flex-col items-center gap-4 py-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, delay: 0.2 }}
          className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full"
        >
          <Icon className="h-8 w-8 text-green-600 dark:text-green-400" />
        </motion.div>

        {message && (
          <p className="text-center text-sm text-muted-foreground">
            {message}
          </p>
        )}

        {autoClose && (
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: autoCloseDelay / 1000, ease: 'linear' }}
            className="h-1 bg-green-500 rounded-full"
          />
        )}
      </div>
    </AdvancedModal>
  );
};

export default AdvancedModal;
