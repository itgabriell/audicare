import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  HelpCircle,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Target,
  TrendingUp,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Settings,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Hook para detectar interações do usuário
const useUserInteraction = () => {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [interactionType, setInteractionType] = useState(null);

  useEffect(() => {
    const handleInteraction = (event) => {
      if (!hasInteracted) {
        setHasInteracted(true);
        setInteractionType(event.type);
      }
    };

    // Detectar diferentes tipos de interação
    document.addEventListener('click', handleInteraction, { once: true });
    document.addEventListener('keydown', handleInteraction, { once: true });
    document.addEventListener('scroll', handleInteraction, { once: true });
    document.addEventListener('mousemove', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('scroll', handleInteraction);
      document.removeEventListener('mousemove', handleInteraction);
    };
  }, [hasInteracted]);

  return { hasInteracted, interactionType };
};

// Hook para detectar contexto e preferências do usuário
const useSmartTooltipBehavior = (content, triggerRef) => {
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [userPreference, setUserPreference] = useState(null);
  const { hasInteracted, interactionType } = useUserInteraction();

  // Verificar se é primeira vez que o usuário vê este tooltip
  useEffect(() => {
    const tooltipKey = `tooltip_${content?.id || 'default'}`;
    const seen = localStorage.getItem(tooltipKey);
    setIsFirstTime(!seen);

    // Marcar como visto após primeira interação
    if (hasInteracted && !seen) {
      localStorage.setItem(tooltipKey, 'seen');
    }
  }, [content?.id, hasInteracted]);

  // Detectar preferências do usuário baseado no comportamento
  useEffect(() => {
    if (interactionType === 'keydown' && !userPreference) {
      setUserPreference('keyboard');
    } else if (interactionType === 'click' && !userPreference) {
      setUserPreference('mouse');
    }
  }, [interactionType, userPreference]);

  return {
    isFirstTime,
    userPreference,
    hasInteracted,
    shouldShowHelp: isFirstTime && !hasInteracted
  };
};

// Componente principal do SmartTooltip
export const SmartTooltip = ({
  children,
  content,
  title,
  variant = 'default',
  size = 'default',
  icon: Icon,
  actions = [],
  learnMore,
  shortcut,
  context = 'general',
  delay = 300,
  side = 'top',
  align = 'center',
  className,
  ...props
}) => {
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const { isFirstTime, shouldShowHelp } = useSmartTooltipBehavior(content, triggerRef);

  // Ajustar delay baseado no contexto
  const adjustedDelay = shouldShowHelp ? delay * 2 : delay;

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'help':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100';
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';
      case 'info':
        return 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100';
      default:
        return 'bg-popover border-border text-popover-foreground';
    }
  };

  const getIcon = () => {
    if (Icon) return Icon;
    switch (variant) {
      case 'help': return HelpCircle;
      case 'warning': return AlertTriangle;
      case 'success': return CheckCircle2;
      case 'error': return XCircle;
      case 'info': return Info;
      default: return null;
    }
  };

  const IconComponent = getIcon();

  return (
    <TooltipPrimitive.Provider delayDuration={adjustedDelay}>
      <TooltipPrimitive.Root
        open={isOpen}
        onOpenChange={setIsOpen}
        delayDuration={adjustedDelay}
      >
        <TooltipPrimitive.Trigger asChild ref={triggerRef}>
          <div className="relative inline-flex">
            {children}
            {/* Indicador visual para primeira vez */}
            {shouldShowHelp && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1.5 h-1.5 bg-white rounded-full"
                />
              </motion.div>
            )}
          </div>
        </TooltipPrimitive.Trigger>

        <TooltipPrimitive.Content
          side={side}
          align={align}
          className={cn(
            'z-50 max-w-xs overflow-hidden rounded-xl border shadow-lg backdrop-blur-sm',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            getVariantStyles(),
            size === 'lg' && 'max-w-md',
            className
          )}
          sideOffset={8}
          {...props}
        >
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="p-4"
            >
              {/* Header com ícone e título */}
              {(IconComponent || title) && (
                <div className="flex items-start gap-3 mb-2">
                  {IconComponent && (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                      className="flex-shrink-0 mt-0.5"
                    >
                      <IconComponent className="h-4 w-4" />
                    </motion.div>
                  )}
                  {title && (
                    <div className="font-semibold text-sm leading-tight">
                      {title}
                      {isFirstTime && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                          Novo
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Conteúdo principal */}
              <div className="text-sm leading-relaxed">
                {typeof content === 'string' ? content : content}
              </div>

              {/* Atalho de teclado */}
              {shortcut && (
                <div className="mt-2 flex items-center gap-2 text-xs opacity-75">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    {shortcut}
                  </kbd>
                  <span>Atalho</span>
                </div>
              )}

              {/* Ações */}
              {actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {actions.map((action, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          action.onClick();
                          setIsOpen(false);
                        }}
                        className="h-6 px-2 text-xs"
                      >
                        {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                        {action.label}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Link "Saiba mais" */}
              {learnMore && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-3 pt-2 border-t border-border/50"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      window.open(learnMore.url, '_blank');
                      setIsOpen(false);
                    }}
                    className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    {learnMore.label || 'Saiba mais'}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Efeitos visuais */}
          <motion.div
            className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))'
            }}
          />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};

// Tooltip contextual inteligente que adapta baseado no contexto
export const ContextualTooltip = ({
  children,
  context = 'general',
  feature,
  userLevel = 'beginner',
  ...props
}) => {
  // Lógica de contexto inteligente
  const getContextualContent = () => {
    const contexts = {
      dashboard: {
        beginner: {
          title: 'Seu Centro de Comando',
          content: 'Aqui você vê todas as métricas importantes da sua clínica em tempo real.',
          learnMore: { label: 'Ver Tutoriais', url: '/help/dashboard' }
        },
        advanced: {
          content: 'Dashboard com analytics IA - use o botão "Analytics IA" para insights avançados.'
        }
      },
      appointments: {
        beginner: {
          title: 'Gerenciamento de Consultas',
          content: 'Agende, edite e acompanhe todas as consultas da sua clínica.',
          actions: [
            { label: 'Criar Consulta', icon: Target, onClick: () => console.log('Criar consulta') }
          ]
        }
      },
      patients: {
        beginner: {
          title: 'Cadastro de Pacientes',
          content: 'Gerencie os dados dos seus pacientes de forma organizada.',
          shortcut: 'Ctrl+P'
        }
      }
    };

    return contexts[context]?.[userLevel] || contexts[context]?.beginner || {
      content: 'Funcionalidade disponível.'
    };
  };

  const contextualProps = getContextualContent();

  return (
    <SmartTooltip
      {...contextualProps}
      context={context}
      {...props}
    >
      {children}
    </SmartTooltip>
  );
};

// Tooltip para onboarding/progressão do usuário
export const OnboardingTooltip = ({
  children,
  step,
  totalSteps,
  onNext,
  onSkip,
  ...props
}) => {
  return (
    <SmartTooltip
      variant="info"
      size="lg"
      title={`Passo ${step} de ${totalSteps}`}
      actions={[
        { label: 'Pular Tutorial', onClick: onSkip, variant: 'ghost' },
        { label: 'Próximo', icon: ChevronRight, onClick: onNext }
      ]}
      {...props}
    >
      {children}
    </SmartTooltip>
  );
};

// Tooltip para funcionalidades premium/experimentais
export const FeatureTooltip = ({
  children,
  feature,
  isPremium = false,
  isBeta = false,
  ...props
}) => {
  const badges = [];
  if (isPremium) badges.push('Premium');
  if (isBeta) badges.push('Beta');

  return (
    <SmartTooltip
      variant={isPremium ? 'success' : isBeta ? 'warning' : 'info'}
      title={
        <div className="flex items-center gap-2">
          <span>{feature}</span>
          {badges.map(badge => (
            <span key={badge} className="px-1.5 py-0.5 bg-primary/20 text-primary text-xs rounded-full">
              {badge}
            </span>
          ))}
        </div>
      }
      {...props}
    >
      {children}
    </SmartTooltip>
  );
};

export default SmartTooltip;
