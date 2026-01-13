# 🎨 Design System Profissional - Componentes Avançados

Este documento demonstra o uso dos componentes avançados implementados no sistema Audicare.

## 📋 Componentes Disponíveis

### 1. **AdvancedToast** - Notificações Inteligentes
```jsx
import { useAdvancedToast, AdvancedToastContainer } from '@/components/ui/advanced-toast';

// Hook para gerenciar toasts
const { success, error, warning, info, loading } = useAdvancedToast();

// Uso básico
success("Paciente cadastrado com sucesso!", {
  title: "Sucesso!",
  actions: [
    {
      label: "Ver Paciente",
      icon: Eye,
      onClick: () => navigate('/patients/123')
    }
  ]
});

// Toast com barra de progresso
loading("Enviando lembretes...", {
  duration: 10000, // 10 segundos
  actions: [
    {
      label: "Cancelar",
      variant: "outline",
      onClick: () => cancelOperation()
    }
  ]
});

// Container obrigatório no App
function App() {
  return (
    <>
      <AdvancedToastContainer />
      {/* resto da aplicação */}
    </>
  );
}
```

**Características:**
- ✅ Micro-interações fluidas
- ✅ Ícones contextuais automáticos
- ✅ Ações clicáveis com botões
- ✅ Barra de progresso para ações longas
- ✅ Auto-fechamento inteligente
- ✅ Efeitos de hover e focus

---

### 2. **SmartTooltip** - Tooltips Contextuais Inteligentes
```jsx
import { SmartTooltip, ContextualTooltip, OnboardingTooltip } from '@/components/ui/smart-tooltip';

// Tooltip inteligente básico
<SmartTooltip
  content="Este botão permite agendar uma nova consulta"
  variant="help"
  icon={Calendar}
  shortcut="Ctrl+N"
  actions={[
    { label: "Ver Tutoriais", icon: BookOpen, onClick: () => openTutorials() }
  ]}
  learnMore={{ label: "Documentação", url: "/docs/appointments" }}
>
  <Button>Nova Consulta</Button>
</SmartTooltip>

// Tooltip contextual (adapta baseado no contexto)
<ContextualTooltip context="dashboard" userLevel="beginner">
  <StatsCard title="Total de Pacientes" value={stats.totalPatients} />
</ContextualTooltip>

// Tooltip para onboarding
<OnboardingTooltip
  step={2}
  totalSteps={5}
  onNext={() => nextStep()}
  onSkip={() => skipTutorial()}
>
  <Button>Próximo</Button>
</OnboardingTooltip>
```

**Características:**
- ✅ Detecção automática de usuários novatos
- ✅ Ajuste de delay baseado na interação
- ✅ Atalhos de teclado exibidos
- ✅ Ações contextuais
- ✅ Links para documentação
- ✅ Indicadores visuais para primeira vez

---

### 3. **AdvancedModal** - Modais com Backdrop Blur
```jsx
import { AdvancedModal, AdvancedConfirmModal, AdvancedSuccessModal } from '@/components/ui/advanced-modal';

// Modal avançado básico
<AdvancedModal
  open={isOpen}
  onOpenChange={setIsOpen}
  title="Editar Paciente"
  subtitle="Atualize as informações do paciente"
  icon={User}
  size="lg"
  variant="default"
  glassEffect={true}
  actions={[
    {
      label: "Salvar",
      onClick: () => savePatient(),
      loading: saving
    },
    {
      label: "Cancelar",
      variant: "outline",
      onClick: () => setIsOpen(false)
    }
  ]}
>
  <PatientForm />
</AdvancedModal>

// Modal de confirmação
<AdvancedConfirmModal
  open={confirmDelete}
  onOpenChange={setConfirmDelete}
  title="Excluir Paciente"
  message="Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita."
  variant="danger"
  onConfirm={() => deletePatient()}
  loading={deleting}
/>

// Modal de sucesso com auto-fechamento
<AdvancedSuccessModal
  open={showSuccess}
  onOpenChange={setShowSuccess}
  title="Consulta Agendada!"
  message="O paciente foi notificado automaticamente."
  autoClose={true}
  autoCloseDelay={3000}
/>
```

**Características:**
- ✅ Backdrop blur avançado
- ✅ Efeitos de glass morphism
- ✅ Responsivo para mobile
- ✅ Botões de maximizar/minimizar
- ✅ Barras de progresso para formulários multi-etapa
- ✅ Estados de loading integrados

---

### 4. **Advanced Loading States** - Estados de Carregamento Inteligentes
```jsx
import {
  AdvancedSpinner,
  SmartSkeleton,
  ComponentLoadingOverlay,
  ButtonLoadingState,
  useAdvancedLoading,
  EmptyStateLoading
} from '@/components/ui/advanced-loading';

// Hook para estados avançados de loading
const { isLoading, progress, succeed, fail } = useAdvancedLoading();

// Spinner com múltiplas variantes
<AdvancedSpinner
  variant="dots" // pulse, dots, waves, bouncing
  size="lg"
  message="Carregando dados..."
  showProgress={true}
  progress={75}
/>

// Skeleton inteligente adaptável
<SmartSkeleton
  variant="card" // card, list, table
  lines={3}
  showAvatar={true}
/>

// Overlay de loading para componentes
<ComponentLoadingOverlay
  isLoading={loading}
  variant="spinner"
  message="Salvando alterações..."
  blur={true}
>
  <PatientForm />
</ComponentLoadingOverlay>

// Botão com estados de loading
<ButtonLoadingState
  loading={saving}
  loadingText="Salvando..."
  success={saved}
  successText="Salvo!"
  error={error}
  errorText="Erro ao salvar"
  onClick={handleSave}
>
  Salvar Paciente
</ButtonLoadingState>

// Estados vazios inteligentes
<EmptyStateLoading
  isLoading={loading}
  isEmpty={!patients.length}
  loadingComponent={<SmartSkeleton variant="list" />}
  emptyComponent={
    <div className="text-center py-8">
      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3>Nenhum paciente encontrado</h3>
      <Button>Adicionar Primeiro Paciente</Button>
    </div>
  }
>
  <PatientList patients={patients} />
</EmptyStateLoading>
```

**Características:**
- ✅ Múltiplas variantes de spinner
- ✅ Skeletons contextuais (card, list, table)
- ✅ Overlays com blur
- ✅ Estados de botão inteligentes
- ✅ Estados vazios customizáveis
- ✅ Retry automático com contagem

---

## 🎯 Exemplos de Uso no Sistema

### Dashboard com Tooltips Contextuais
```jsx
function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Cards com tooltips contextuais */}
      <div className="grid grid-cols-4 gap-6">
        <ContextualTooltip context="dashboard" userLevel="beginner">
          <StatsCard title="Pacientes" value={stats.patients} icon={Users} />
        </ContextualTooltip>

        <ContextualTooltip context="appointments" userLevel="advanced">
          <StatsCard title="Consultas" value={stats.appointments} icon={Calendar} />
        </ContextualTooltip>
      </div>

      {/* Modal avançado para configurações */}
      <AdvancedModal
        open={showSettings}
        onOpenChange={setShowSettings}
        title="Configurações do Sistema"
        icon={Settings}
        size="xl"
        glassEffect={true}
      >
        <SettingsForm />
      </AdvancedModal>
    </div>
  );
}
```

### Formulário com Loading States
```jsx
function PatientForm({ onSubmit, loading }) {
  const { isLoading, progress, succeed } = useAdvancedLoading();

  const handleSubmit = async (data) => {
    startLoading("Salvando paciente...");
    try {
      await savePatient(data);
      succeed("Paciente salvo com sucesso!");
    } catch (error) {
      fail("Erro ao salvar paciente");
    }
  };

  return (
    <ComponentLoadingOverlay isLoading={isLoading} message="Salvando...">
      <form onSubmit={handleSubmit}>
        <SmartSkeleton variant="form" isLoading={isLoading}>
          <Input name="name" placeholder="Nome do paciente" />
          <ButtonLoadingState loading={isLoading} success={success}>
            Salvar
          </ButtonLoadingState>
        </SmartSkeleton>
      </form>
    </ComponentLoadingOverlay>
  );
}
```

---

## 🎨 Temas e Personalização (Próxima Fase)

### Sistema de Temas Avançado
- **Temas**: Light, Dark, Auto
- **Customização**: Cores da clínica
- **Acessibilidade**: High contrast mode
- **Fontes**: Variables e acessibilidade

### Implementação Planejada
```jsx
// Hook para gerenciamento de temas
const { theme, setTheme, colors, setColors } = useAdvancedTheme();

// Tema customizado por clínica
<ThemeProvider
  theme={{
    primary: '#3b82f6',
    secondary: '#64748b',
    clinic: {
      logo: '/logo-clinica.png',
      colors: { ... },
      fonts: { ... }
    }
  }}
>
  <App />
</ThemeProvider>
```

---

## 🚀 Benefícios do Design System

### Para Desenvolvedores
- **Produtividade**: Componentes prontos e consistentes
- **Manutenibilidade**: Código reutilizável e testado
- **Acessibilidade**: Componentes WCAG compliant
- **Performance**: Otimizados com lazy loading

### Para Usuários
- **Experiência**: Micro-interações fluidas
- **Acessibilidade**: Suporte completo a leitores de tela
- **Intuitividade**: Tooltips e guias contextuais
- **Performance**: Loading states informativos

### Para a Clínica
- **Branding**: Personalização visual mantida
- **Profissionalismo**: Interface moderna e polida
- **Eficiência**: Workflows otimizados
- **Escalabilidade**: Design system expansível

---

## 📚 Próximos Passos

1. **Implementar Sistema de Temas**
2. **Adicionar Mais Componentes** (DatePicker, Select avançado, etc.)
3. **Criar Biblioteca de Ícones Contextuais**
4. **Implementar Design Tokens**
5. **Adicionar Testes Automatizados**

O Design System está pronto para uso e pode ser expandido conforme as necessidades da clínica crescem! 🎉
