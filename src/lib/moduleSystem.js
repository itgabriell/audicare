// Sistema de Micro-frontends para escalabilidade modular
// Permite carregar módulos dinamicamente e gerenciar dependências

export class ModuleSystem {
  constructor() {
    this.modules = new Map();
    this.loadedModules = new Set();
    this.loadingPromises = new Map();
  }

  /**
   * Registra um módulo no sistema
   */
  registerModule(name, config) {
    this.modules.set(name, {
      ...config,
      name,
      loaded: false,
      dependencies: config.dependencies || [],
    });
  }

  /**
   * Carrega um módulo e suas dependências
   */
  async loadModule(moduleName) {
    // Verificar se já está carregado
    if (this.loadedModules.has(moduleName)) {
      return this.modules.get(moduleName);
    }

    // Verificar se já está carregando
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    const loadingPromise = this._loadModuleInternal(moduleName);
    this.loadingPromises.set(moduleName, loadingPromise);

    try {
      const module = await loadingPromise;
      this.loadedModules.add(moduleName);
      this.loadingPromises.delete(moduleName);
      return module;
    } catch (error) {
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }

  /**
   * Carrega um módulo internamente (com dependências)
   */
  async _loadModuleInternal(moduleName) {
    const moduleConfig = this.modules.get(moduleName);

    if (!moduleConfig) {
      throw new Error(`Módulo '${moduleName}' não registrado`);
    }

    // Carregar dependências primeiro
    if (moduleConfig.dependencies.length > 0) {
      await Promise.all(
        moduleConfig.dependencies.map(dep => this.loadModule(dep))
      );
    }

    // Carregar o módulo principal
    try {
      const moduleExports = await this._importModule(moduleConfig);

      // Marcar como carregado
      moduleConfig.loaded = true;
      moduleConfig.exports = moduleExports;

      // Executar função de inicialização se existir
      if (typeof moduleExports.init === 'function') {
        await moduleExports.init(this);
      }

      return moduleConfig;
    } catch (error) {
      console.error(`Erro ao carregar módulo '${moduleName}':`, error);
      throw error;
    }
  }

  /**
   * Importa o módulo baseado na configuração
   */
  async _importModule(moduleConfig) {
    if (moduleConfig.importPath) {
      // Lazy import dinâmico
      const module = await import(moduleConfig.importPath);
      return module;
    }

    if (moduleConfig.factory) {
      // Função factory para módulos criados dinamicamente
      return await moduleConfig.factory();
    }

    throw new Error(`Módulo '${moduleConfig.name}' não tem método de importação válido`);
  }

  /**
   * Verifica se um módulo está carregado
   */
  isModuleLoaded(moduleName) {
    return this.loadedModules.has(moduleName);
  }

  /**
   * Obtém um módulo carregado
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * Lista todos os módulos registrados
   */
  getAllModules() {
    return Array.from(this.modules.values());
  }

  /**
   * Lista módulos carregados
   */
  getLoadedModules() {
    return Array.from(this.loadedModules).map(name => this.modules.get(name));
  }

  /**
   * Descarrega um módulo (para desenvolvimento/debugging)
   */
  unloadModule(moduleName) {
    const module = this.modules.get(moduleName);
    if (module && typeof module.exports?.destroy === 'function') {
      module.exports.destroy();
    }

    this.loadedModules.delete(moduleName);
    module.loaded = false;
    module.exports = null;
  }
}

// Instância global do sistema de módulos
export const moduleSystem = new ModuleSystem();

// Módulos pré-registrados
moduleSystem.registerModule('dashboard', {
  importPath: '@/pages/Dashboard.jsx',
  dependencies: ['charts'],
  description: 'Dashboard principal com métricas e analytics',
});

moduleSystem.registerModule('inbox', {
  importPath: '@/pages/Inbox.jsx',
  dependencies: ['chat', 'notifications'],
  description: 'Sistema de mensagens e conversas',
});

moduleSystem.registerModule('patients', {
  importPath: '@/pages/Patients.jsx',
  dependencies: ['forms', 'search'],
  description: 'Gerenciamento de pacientes',
});

moduleSystem.registerModule('appointments', {
  importPath: '@/pages/Appointments.jsx',
  dependencies: ['calendar', 'forms'],
  description: 'Sistema de agendamentos',
});

// Módulos de infraestrutura
moduleSystem.registerModule('charts', {
  importPath: 'recharts',
  description: 'Biblioteca de gráficos',
});

moduleSystem.registerModule('forms', {
  importPath: 'react-hook-form',
  description: 'Gerenciamento de formulários',
});

moduleSystem.registerModule('calendar', {
  importPath: 'react-day-picker',
  description: 'Componente de calendário',
});

moduleSystem.registerModule('search', {
  importPath: 'cmdk',
  description: 'Sistema de busca e comandos',
});

moduleSystem.registerModule('chat', {
  importPath: '@/hooks/useWhatsApp.js',
  description: 'Sistema de chat WhatsApp',
});

moduleSystem.registerModule('notifications', {
  importPath: '@/components/notifications',
  description: 'Sistema de notificações',
});

// Hook para usar módulos em componentes React
export function useModule(moduleName) {
  const [module, setModule] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!moduleName) return;

    setLoading(true);
    setError(null);

    moduleSystem.loadModule(moduleName)
      .then(setModule)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [moduleName]);

  return { module, loading, error };
}

// Componente para renderizar módulos dinamicamente
export function ModuleRenderer({ moduleName, componentName, props = {} }) {
  const { module, loading, error } = useModule(moduleName);

  if (loading) {
    return <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">
      Erro ao carregar módulo {moduleName}: {error.message}
    </div>;
  }

  if (!module || !module.exports) {
    return <div className="text-gray-500 p-4">
      Módulo {moduleName} não encontrado
    </div>;
  }

  // Renderizar componente específico ou default
  const Component = componentName
    ? module.exports[componentName] || module.exports.default
    : module.exports.default;

  if (!Component) {
    return <div className="text-yellow-500 p-4">
      Componente '{componentName}' não encontrado no módulo {moduleName}
    </div>;
  }

  return <Component {...props} />;
}

// Utilitários para desenvolvimento
if (process.env.NODE_ENV === 'development') {
  window.ModuleSystem = {
    load: (name) => moduleSystem.loadModule(name),
    unload: (name) => moduleSystem.unloadModule(name),
    list: () => moduleSystem.getAllModules(),
    loaded: () => moduleSystem.getLoadedModules(),
    isLoaded: (name) => moduleSystem.isModuleLoaded(name),
  };
}
