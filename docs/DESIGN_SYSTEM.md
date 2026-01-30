# AudiCare - Design System

Este documento detalha o sistema de design utilizado na aplicação AudiCare, cobrindo paleta de cores, tipografia, espaçamento, componentes e princípios de animação.

## 1. Paleta de Cores

A paleta de cores é definida através de variáveis CSS e é gerida pelo Tailwind CSS, suportando temas claro e escuro. O tema escuro é o padrão e principal foco de design.

### Cores Principais (Tema Escuro)

-   **Primary:** `hsl(157 37% 43%)` (Verde esmeralda para ações principais, destaques)
    -   `primary-foreground`: `hsl(40 100% 98%)` (Texto sobre primary)
-   **Secondary:** `hsl(220 13% 25%)` (Fundo de elementos secundários, estados de hover)
    -   `secondary-foreground`: `hsl(210 40% 98%)` (Texto sobre secondary)
-   **Accent:** `hsl(14 78% 50%)` (Laranja para elementos interativos, feedback)
    -   `accent-foreground`: `hsl(0 0% 100%)` (Texto sobre accent)
-   **Destructive:** `hsl(0 62.8% 30.6%)` (Vermelho para ações perigosas, erros)
    -   `destructive-foreground`: `hsl(210 40% 98%)` (Texto sobre destructive)
-   **Background:** `hsl(220 13% 10%)` (Fundo principal da aplicação)
-   **Foreground:** `hsl(210 40% 98%)` (Cor padrão do texto)
-   **Card:** `hsl(220 13% 15%)` (Fundo de cards, painéis)
    -   `card-foreground`: `hsl(210 40% 98%)` (Texto sobre card)
-   **Muted:** `hsl(217.2 32.6% 17.5%)` (Textos e elementos secundários, menos proeminentes)
    -   `muted-foreground`: `hsl(215 20.2% 65.1%)` (Texto muted)
-   **Border:** `hsl(217.2 32.6% 22.5%)` (Cor padrão das bordas)
-   **Input:** `hsl(217.2 32.6% 22.5%)` (Borda de inputs)
-   **Ring:** `hsl(157 37% 43%)` (Anel de foco para acessibilidade)

### Cores de Canais (para o módulo Inbox)

-   **WhatsApp:** `text-green-500`
-   **Instagram:** `text-pink-500`
-   **Facebook:** `text-blue-600`

## 2. Tipografia

-   **Família da Fonte:** 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'
    -   **`font-sans`**: Padrão para todo o texto.
-   **Tamanhos:** Utiliza as classes de tamanho do Tailwind (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc.).
-   **Pesos:** `font-light`, `font-normal`, `font-medium`, `font-semibold`, `font-bold`.
    -   `font-semibold` é frequentemente usado para títulos e elementos de navegação.

## 3. Espaçamento e Grid

-   **Unidade Base:** O sistema utiliza uma unidade de espaçamento base de `4px` (Tailwind CSS escala em múltiplos de `0.25rem`). Isso garante consistência vertical e horizontal.
-   **Espaçamento Comum:**
    -   `p-X`, `m-X`: Paddings e margins com `X` sendo múltiplos de 4 (ex: `p-2` = 8px, `p-4` = 16px).
    -   `gap-X`: Espaçamento entre itens em `flex` ou `grid` layouts.
-   **Grid Layouts:** Utilização do `grid` do Tailwind para layouts complexos, como o dashboard e o inbox, garantindo alinhamento e flexibilidade.

## 4. Componentes Reutilizáveis (Shadcn/ui)

A aplicação utiliza uma biblioteca de componentes robusta (shadcn/ui), construída sobre Radix UI e estilizada com Tailwind CSS. Isso garante acessibilidade, responsividade e consistência visual.

-   **Botões (`Button`):** Diferentes variantes (`default`, `secondary`, `ghost`, `outline`, `destructive`, `link`) e tamanhos (`default`, `sm`, `lg`, `icon`).
-   **Cards (`Card`):** Usados para agrupar conteúdo relacionado, como painéis no dashboard ou detalhes no Inbox.
-   **Formulários (`Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, `Select`):** Elementos padronizados para interação do usuário.
-   **Navegação (`DropdownMenu`, `Tabs`):** Menus de contexto e abas.
-   **Feedback (`Toast`, `Alert`):** Notificações para o usuário.
-   **Overlays (`Dialog`, `AlertDialog`, `Popover`, `Tooltip`):** Modais, tooltips e popovers para exibir informações adicionais ou interações.
-   **Outros:** `Avatar`, `Badge`, `ScrollArea`, `Separator`.

## 5. Animações e Transições

-   **Framer Motion:** Utilizado para animar componentes React, proporcionando transições suaves e feedback visual.
    -   **Exemplos:**
        -   Transições de rota no `DashboardLayout` (`initial`, `animate`, `transition`).
        -   `whileHover` para efeitos sutis em itens de navegação.
-   **Transições CSS:** Utilização das classes `transition-colors`, `transition-transform` do Tailwind para efeitos de hover e estado.
-   **Duração Padrão:** Geralmente `duration-150` ou `duration-300` para transições rápidas e responsivas.

## 6. Consistência Visual

A chave para a consistência é a utilização rigorosa do Tailwind CSS e dos componentes shadcn/ui, garantindo que novos componentes ou modificações sigam as cores, tipografia e espaçamento definidos. O uso de variantes (`variant`) e classes utilitárias evita a redefinição de estilos globais.