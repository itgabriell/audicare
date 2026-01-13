import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Wifi,
  WifiOff,
  Server,
  HardDrive,
  Cpu,
  Zap,
  Sparkles,
  Waves,
  Circle,
  Square,
  Triangle
} from 'lucide-react';

// Hook para gerenciar estados de loading inteligentes
export const useAdvancedLoading = (initialState = 'idle') => {
  const [state, setState] = useState(initialState);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);

  const startLoading = (msg = 'Carregando...', estTime = null) => {
    setState('loading');
    setProgress(0);
    setMessage(msg);
    setStartTime(Date.now());
    setEstimatedTime(estTime);
  };

  const updateProgress = (newProgress, msg = null) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
    if (msg) setMessage(msg);
  };

  const succeed = (msg = 'Concluído com sucesso!') => {
    setState('success');
    setProgress(100);
    setMessage(msg);
    setTimeout(() => setState('idle'), 2000);
  };

  const fail = (msg = 'Falha ao carregar') => {
    setState('error');
    setMessage(msg);
    setTimeout(() => setState('idle'), 3000);
  };

  const reset = () => {
    setState('idle');
    setProgress(0);
    setMessage('');
    setStartTime(null);
    setEstimatedTime(null);
  };

  const elapsedTime = startTime ? Date.now() - startTime : 0;
  const remainingTime = estimatedTime ? Math.max(0, estimatedTime - elapsedTime) : null;

  return {
    state,
    progress,
    message,
    elapsedTime,
    remainingTime,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    startLoading,
    updateProgress,
    succeed,
    fail,
    reset
  };
};

// Componente de loading skeleton inteligente
export const SmartSkeleton = ({
  variant = 'default',
  lines = 3,
  showAvatar = false,
  className,
  ...props
}) => {
  const getSkeletonLines = () => {
    switch (variant) {
      case 'card':
        return (
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        );
      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                {showAvatar && <div className="w-10 h-10 bg-muted rounded-full" />}
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        );
      case 'table':
        return (
          <div className="space-y-3">
            {Array.from({ length: lines }).map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        );
      default:
        return (
          <div className="space-y-2">
            {Array.from({ length: lines }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-4 bg-muted rounded",
                  i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
                )}
              />
            ))}
          </div>
        );
    }
  };

  return (
    <div className={cn("animate-pulse", className)} {...props}>
      {getSkeletonLines()}
    </div>
  );
};

// Componente de loading spinner avançado
export const AdvancedSpinner = ({
  size = 'md',
  variant = 'default',
  showProgress = false,
  progress = 0,
  message,
  className,
  ...props
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'xs': return 'h-3 w-3';
      case 'sm': return 'h-4 w-4';
      case 'lg': return 'h-8 w-8';
      case 'xl': return 'h-12 w-12';
      default: return 'h-6 w-6';
    }
  };

  const getVariantIcon = () => {
    switch (variant) {
      case 'pulse':
        return (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={cn("rounded-full bg-primary", getSizeClasses())}
          />
        );
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
                className="w-2 h-2 bg-primary rounded-full"
              />
            ))}
          </div>
        );
      case 'waves':
        return (
          <div className="flex space-x-0.5">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                animate={{ scaleY: [1, 2, 1] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1
                }}
                className="w-1 bg-primary rounded-full"
                style={{ height: '20px' }}
              />
            ))}
          </div>
        );
      case 'bouncing':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -20, 0] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                  ease: 'easeInOut'
                }}
                className="w-3 h-3 bg-primary rounded-full"
              />
            ))}
          </div>
        );
      default:
        return (
          <Loader2 className={cn("animate-spin text-primary", getSizeClasses())} />
        );
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)} {...props}>
      {getVariantIcon()}

      {message && (
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-muted-foreground text-center"
        >
          {message}
        </motion.p>
      )}

      {showProgress && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Componente de loading overlay para componentes específicos
export const ComponentLoadingOverlay = ({
  isLoading,
  variant = 'spinner',
  message,
  blur = true,
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("relative", className)} {...props}>
      {children}

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 flex items-center justify-center z-10",
              blur && "backdrop-blur-sm bg-background/50",
              !blur && "bg-background/80"
            )}
          >
            {variant === 'spinner' && (
              <AdvancedSpinner message={message} />
            )}
            {variant === 'pulse' && (
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-6 h-6 bg-primary rounded-full"
                />
                {message && (
                  <span className="text-sm text-muted-foreground">{message}</span>
                )}
              </div>
            )}
            {variant === 'skeleton' && (
              <SmartSkeleton variant="card" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente de loading state para botões
export const ButtonLoadingState = ({
  loading = false,
  loadingText = 'Carregando...',
  success = false,
  successText = 'Sucesso!',
  error = false,
  errorText = 'Erro',
  children,
  className,
  ...props
}) => {
  const getStateIcon = () => {
    if (error) return <XCircle className="h-4 w-4" />;
    if (success) return <CheckCircle2 className="h-4 w-4" />;
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    return null;
  };

  const getStateText = () => {
    if (error) return errorText;
    if (success) return successText;
    if (loading) return loadingText;
    return null;
  };

  return (
    <button
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        loading && "cursor-wait",
        success && "bg-green-600 hover:bg-green-700 text-white",
        error && "bg-red-600 hover:bg-red-700 text-white",
        !loading && !success && !error && "bg-primary hover:bg-primary/90 text-primary-foreground",
        className
      )}
      disabled={loading}
      {...props}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={loading ? 'loading' : success ? 'success' : error ? 'error' : 'default'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          {getStateIcon()}
          <span>
            {getStateText() || children}
          </span>
        </motion.div>
      </AnimatePresence>
    </button>
  );
};

// Hook para loading states contextuais
export const useContextualLoading = (context) => {
  const [loadingStates, setLoadingStates] = useState({});

  const setLoading = (key, isLoading, message = '') => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: { isLoading, message }
    }));
  };

  const getLoadingState = (key) => {
    return loadingStates[key] || { isLoading: false, message: '' };
  };

  // Estados contextuais comuns
  const contextStates = {
    dashboard: {
      stats: { isLoading: false, message: 'Carregando estatísticas...' },
      charts: { isLoading: false, message: 'Carregando gráficos...' },
      analytics: { isLoading: false, message: 'Analisando dados...' }
    },
    appointments: {
      list: { isLoading: false, message: 'Carregando agendamentos...' },
      calendar: { isLoading: false, message: 'Carregando calendário...' },
      form: { isLoading: false, message: 'Salvando consulta...' }
    },
    patients: {
      list: { isLoading: false, message: 'Carregando pacientes...' },
      search: { isLoading: false, message: 'Buscando pacientes...' },
      form: { isLoading: false, message: 'Salvando paciente...' }
    }
  };

  return {
    loadingStates,
    setLoading,
    getLoadingState,
    contextStates: contextStates[context] || {}
  };
};

// Componente de loading para estados vazios
export const EmptyStateLoading = ({
  isLoading,
  isEmpty,
  loadingComponent,
  emptyComponent,
  children,
  ...props
}) => {
  if (isLoading) {
    return loadingComponent || <SmartSkeleton variant="card" />;
  }

  if (isEmpty) {
    return emptyComponent || (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Database className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhum dado encontrado</h3>
        <p className="text-muted-foreground">Comece adicionando alguns itens.</p>
      </div>
    );
  }

  return children;
};

// Componente de loading com retry
export const RetryableLoading = ({
  isLoading,
  error,
  onRetry,
  loadingComponent,
  errorComponent,
  children,
  retryDelay = 3000,
  maxRetries = 3,
  ...props
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (retryCount >= maxRetries) return;

    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    setTimeout(() => {
      onRetry();
      setIsRetrying(false);
    }, retryDelay);
  };

  if (isLoading || isRetrying) {
    return loadingComponent || (
      <div className="flex flex-col items-center justify-center py-8">
        <AdvancedSpinner
          variant="pulse"
          message={isRetrying ? `Tentativa ${retryCount + 1} de ${maxRetries}...` : 'Carregando...'}
        />
      </div>
    );
  }

  if (error) {
    return errorComponent || (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        {retryCount < maxRetries && (
          <Button onClick={handleRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente ({retryCount}/{maxRetries})
          </Button>
        )}
      </div>
    );
  }

  return children;
};

export default AdvancedSpinner;
