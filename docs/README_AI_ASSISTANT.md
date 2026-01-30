# Assistente de IA - Google Gemini

## Funcionalidades Implementadas

- **Botão Flutuante**: Ícone de robô com gradiente azul-roxo no canto inferior direito
- **Modal de Conversa**: Interface limpa para interagir com a IA
- **Integração Google Gemini**: Conectado à API do Google Gemini 2.5 Flash
- **Tratamento de Erros**: Mensagens de erro claras para o usuário
- **Design Inteligente**: Visual que claramente indica ser um assistente de IA

## Como Configurar

### 1. Obter Chave da API do Google Gemini

1. Acesse [Google AI Studio](https://aistudio.google.com/)
2. Faça login com sua conta Google
3. Crie uma nova API Key
4. Copie a chave gerada

### 2. Configurar Variável de Ambiente

Adicione a chave no arquivo `.env.local`:

```env
VITE_GOOGLE_GEMINI_API_KEY="sua-chave-aqui"
```

### 3. Reiniciar o Servidor

Após configurar a chave, reinicie o servidor de desenvolvimento:

```bash
npm run dev
```

## Como Usar

1. **Clique no botão azul** no canto inferior direito da tela
2. **Digite sua pergunta** na caixa de texto
3. **Pressione Enter ou clique no botão enviar**
4. **Aguarde a resposta** da IA no painel superior

## Funcionalidades Técnicas

- **Modelo**: Gemini 2.5 Flash ⚡
- **Biblioteca**: @google/generative-ai (oficial - versão mais recente)
- **Contexto Especializado**: Treinado com informações completas do sistema Audicare
- **Conhecimento**: Funcionalidades, problemas comuns, soluções técnicas
- **Temperatura**: Padrão da biblioteca (otimizada)
- **Tratamento de erros**: Mensagens específicas para API key, permissões e quota
- **Interface responsiva**: Funciona em desktop e mobile
- **Acessibilidade**: Dialog com descrição para leitores de tela

## Contexto Inteligente do Audicare 🤖

O assistente tem conhecimento especializado sobre:

### 🏥 Sistema Audicare
- Gestão completa de clínicas de fonoaudiologia
- Stack técnico: React + Node.js + Supabase + WhatsApp

### ⚙️ Funcionalidades
- **Pacientes**: Cadastro, histórico, dados pessoais
- **Agendamentos**: Calendário, lembretes, horários
- **CRM**: Leads, conversas, oportunidades
- **Inbox**: WhatsApp integrado, atendimento unificado
- **Tasks**: Sistema de tarefas e acompanhamento
- **Automações**: n8n workflows, notificações

### 🔧 Suporte Técnico
- Problemas comuns e soluções
- Configuração de APIs (Supabase, WhatsApp)
- Troubleshooting de RLS policies
- Monitoramento e logs
- Deploy em VPS Hostinger

## Arquivos Criados/Modificados

- `src/components/AIAssistant.jsx` - Componente principal
- `src/services/aiAssistantService.js` - Serviço de integração com API
- `src/layouts/DashboardLayout.jsx` - Adicionado o componente globalmente
- `.env.example` - Adicionada variável de ambiente

## Próximas Melhorias Possíveis

- Histórico de conversas
- Múltiplas conversas simultâneas
- Suporte a arquivos/imagens
- Personalização do prompt do sistema
- Cache de respostas
- Modo offline com respostas pré-definidas
