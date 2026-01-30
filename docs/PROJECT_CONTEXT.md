# PROJECT CONTEXT

## Estrutura do Projeto (Principais Pastas)

- **Root**: Configurações do projeto (Vite, Tailwind, ESLint), documentação (.md files) e scripts de automação.
- **`src/`**: Código fonte Frontend da aplicação.
    - **`src/components/ui/`**: Componentes reutilizáveis do Design System (Baseados em Radix UI / Tailwind).
    - **`src/database.js`**: Centralizador de acesso ao Supabase. **IMPORTANTE**: Todo acesso a dados deve passar por aqui.
    - **`src/lib/`**: Configurações de clientes (Supabase, Utils).
    - **`src/services/`** (Inferido): Serviços de integração.
- **`backend/`**: Código Backend Node.js/Express.
    - Serve como Proxy/Gateway para APIs externas.
    - Gerencia integrações com WhatsApp e outros serviços.
- **`supabase/`**: Migrations e configurações do banco de dados.
- **`public/`**: Assets estáticos (imagens, ícones).

## Stack & Principais Bibliotecas (`package.json`)

**Frontend Core:**
- `react`, `react-dom` (v18)
- `vite` (Build tool/Server)
- `react-router-dom` (Roteamento)

**UI & Styling:**
- `tailwindcss` (Estilização principal)
- `@radix-ui/*` (Primitivos de componentes acessíveis)
- `framer-motion` (Animações)
- `lucide-react` (Ícones)
- `class-variance-authority`, `clsx`, `tailwind-merge` (Utilitários de classe)

**Data & State:**
- `@supabase/supabase-js` (Cliente Supabase)
- `@tanstack/react-query` (Gerenciamento de estado serveless/cache)
- `zod`, `react-hook-form` (Validação e formulários)
- `date-fns`, `moment` (Manipulação de datas)

**Features:**
- `@fullcalendar/*` (Calendário/Agenda)
- `recharts` (Gráficos)
- `@dnd-kit/*`, `react-beautiful-dnd` (Drag and drop)

**Backend:**
- `express` (Servidor)
- `cors`, `dotenv`

## Regras de Desenvolvimento (Vibecoding)

1.  **Estilo (MVP > Over-engineering)**:
    - Priorizar soluções práticas e funcionais.
    - Evitar complexidade desnecessária.

2.  **Banco de Dados (Supabase)**:
    - **Centralização Obrigatória**: Toda interação com o banco de dados deve ser feita EXCLUSIVAMENTE através de `src/database.js` ou hooks dedicados.
    - **Proibido**: Chamadas diretas ao `supabase` espalhadas pelos componentes.

3.  **Backend Node.js**:
    - **Gateway Central**: O Frontend deve utilizar o Backend Node para chamadas sensíveis ou orquestrações.
    - **APIs Externas**: O Frontend só chama APIs externas (Meta/WhatsApp) diretamente se estritamente necessário (ex: facilitação de envio), mas a regra geral é passar pelo Backend para registro e controle.

4.  **Interface de Usuário (UI)**:
    - **Consistência**: Manter fidelidade ao Design System atual.
    - **Reuso**: Utilizar componentes existentes em `src/components/ui`.
    - **Estilo**: Seguir o padrão Berry Template adaptado (Tailwind + Material UI concepts).

## Status Atual (Contexto Imediato)

- **Foco**: Refinamento, resolução de bugs e validação operacional.
- **Dashboards**: Recentemente corrigidos (Tabela `repair_tickets`, Intervalo 00:00-23:59, Métricas de Leads).
- **Features Recentes**: Clara (Secretária Virtual), CRM de Leads, Controle de Reparos, Base de Conhecimento.
