# AudiCare - Design Responsivo

Este documento descreve a abordagem do design responsivo na aplicação AudiCare, detalhando os breakpoints utilizados e o comportamento dos layouts em diferentes tamanhos de tela.

## 1. Abordagem Mobile-First

O desenvolvimento da interface segue a filosofia mobile-first, onde o design e a implementação são iniciados para telas menores e, em seguida, progressivamente aprimorados para telas maiores. Isso garante que a experiência fundamental seja otimizada para dispositivos móveis, e as funcionalidades adicionais sejam introduzidas conforme o espaço disponível aumenta.

## 2. Breakpoints do Tailwind CSS

A aplicação utiliza os breakpoints padrão do Tailwind CSS, que são:

-   **`sm`**: `640px`
-   **`md`**: `768px`
-   **`lg`**: `1024px`
-   **`xl`**: `1280px`
-   **`2xl`**: `1536px`

Esses breakpoints são usados para aplicar estilos condicionalmente através das classes utilitárias do Tailwind (ex: `md:flex`, `lg:hidden`).

## 3. Layout Responsivo do Dashboard (`DashboardLayout.jsx`)

### Sidebar de Navegação

-   **Telas Pequenas (`< lg`):**
    -   A sidebar é escondida por padrão (`-translate-x-full`).
    -   Um botão de menu (`Menu` icon) é exibido no cabeçalho para alternar a visibilidade da sidebar.
    -   Quando aberta, a sidebar sobrepõe o conteúdo principal e um overlay (`bg-black/50`) é exibido para fechar a sidebar ao clicar fora dela.
-   **Telas Grandes (`>= lg`):**
    -   A sidebar é sempre visível (`translate-x-0`).
    -   O conteúdo principal (`main`) tem uma margem esquerda (`lg:ml-64`) para acomodar a sidebar.

### Cabeçalho

-   **Telas Pequenas:** O botão de menu para a sidebar é visível.
-   **Telas Grandes:** O botão de menu é escondido (`lg:hidden`).

## 4. Layout Responsivo do Módulo de Caixa de Entrada (`Inbox.jsx`)

O módulo de Caixa de Entrada é um exemplo primário de design responsivo de 3 colunas.

### Colunas de Layout

-   **Telas Pequenas (`< md`):**
    -   **Lista de Conversas (`ConversationList`):** Ocupa a largura total da tela (`w-full`).
    -   **Chat (`ChatWindow`):** Escondido (`hidden`) por padrão. Torna-se visível e ocupa a largura total quando uma conversa é selecionada.
    -   **Detalhes do Contato (`RightPanel`):** Escondido e acessível via um botão dentro do `ChatWindow` ou quando a conversa está selecionada. Em mobile, ele sobrepõe o `ChatWindow`.

-   **Telas Médias (`>= md` e `< lg`):**
    -   **Lista de Conversas (`ConversationList`):** Visível e ocupa uma largura fixa (`w-80`).
    -   **Chat (`ChatWindow`):** Ocupa o espaço restante (`flex-1`).
    -   **Detalhes do Contato (`RightPanel`):** Escondido por padrão. Acessível via um botão de alternância no `ChatWindow` que o revela, sobrepondo o `ChatWindow` ou ajustando seu tamanho.

-   **Telas Grandes (`>= lg`):**
    -   **Lista de Conversas (`ConversationList`):** Visível e ocupa uma largura fixa (`lg:w-96`).
    -   **Chat (`ChatWindow`):** Ocupa o espaço central (`flex-1`).
    -   **Detalhes do Contato (`RightPanel`):** Visível por padrão e ocupa uma largura fixa (`lg:w-96`) na coluna mais à direita. Pode ser ocultado via um botão de alternância.

### Comportamento de Interação

-   **Botão "Voltar" (`ArrowLeft` no `ChatWindow`):** Visível apenas em telas menores (`md:hidden`) para permitir que o usuário retorne da `ChatWindow` para a `ConversationList`.
-   **Botão de Alternância do `RightPanel` (`PanelRightOpen/Close`):** Visível no `ChatWindow` em telas maiores (`lg:flex`) para permitir que o usuário oculte/mostre o painel de detalhes do contato. Em telas pequenas, o `RightPanel` tem seu próprio botão de fechar (`X`).

## 5. Consistência e Manutenção

A utilização do Tailwind CSS facilita a manutenção do design responsivo. Novas funcionalidades devem aderir a esses breakpoints e padrões de layout, garantindo que a aplicação seja consistente e utilizável em qualquer dispositivo. A estratégia de flexbox e grid do Tailwind é fundamental para criar componentes que se adaptam naturalmente.