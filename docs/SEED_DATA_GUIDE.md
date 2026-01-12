# Guia de Dados de Exemplo (Seed Data)

Este guia detalha o processo de popular o banco de dados Supabase do projeto AudiCare com dados de exemplo (seed data). Esses dados são cruciais para o desenvolvimento, teste e demonstração das funcionalidades do sistema, especialmente o módulo de Atendimento Multicanal.

**🚨 AVISO DE SEGURANÇA:** Não execute o script de seed em ambientes de produção ou com dados sensíveis. Ele foi projetado *apenas* para desenvolvimento e testes, e pode criar ou modificar registros.

---

## O que é Seed Data?

Seed data (ou dados de exemplo/população inicial) refere-se a um conjunto de dados predefinidos que são inseridos em um banco de dados vazio ou recém-criado. Seu propósito é fornecer um ponto de partida realista para o desenvolvimento e teste de uma aplicação, simulando um ambiente com dados úteis sem a necessidade de inserção manual.

---

## Por que Usar Seed Data?

O uso de seed data oferece diversos benefícios:

*   **Acelera o Desenvolvimento:** Permite que os desenvolvedores comecem a trabalhar nas funcionalidades imediatamente, sem esperar por dados reais.
*   **Facilita Testes:** Cria um ambiente consistente e repetível para testes unitários, de integração e end-to-end.
*   **Demonstração de Funcionalidades:** Essencial para apresentações e demonstrações do produto, mostrando como a aplicação funciona com dados representativos.
*   **Depuração Aprimorada:** Ajuda a identificar e depurar problemas em um contexto de dados mais realista.
*   **Consistência entre Ambientes:** Garante que todos os desenvolvedores e testadores estejam trabalhando com o mesmo conjunto de dados base.

---

## Como Executar o Script de Seed

O script de seed (`src/lib/seedData.js`) pode ser executado de três maneiras principais. Ele foi projetado para ser **idempotente**, ou seja, pode ser executado múltiplas vezes sem criar dados duplicados para a clínica base (`AudiCare Seed Clinic`).

### Método 1: Usando o Botão no Painel de Diagnóstico (Recomendado na UI)

Esta é a forma mais fácil e recomendada para desenvolvedores e testadores que estão executando a aplicação localmente.

1.  **Inicie a Aplicação:** Certifique-se de que sua aplicação React está sendo executada (ex: `npm run dev`).
2.  **Autentique-se:** Faça login na aplicação com qualquer conta de usuário. O script de seed requer um usuário autenticado para associar a clínica de exemplo ao seu `owner_id` e criar conversas em seu nome.
3.  **Acesse o Painel de Diagnóstico:** Navegue até a rota `/health-check` da sua aplicação (ex: `http://localhost:3000/health-check`).
4.  **Localize o Botão:** No Painel de Diagnóstico, você encontrará um cartão chamado "Diagnóstico do Sistema" com um botão rotulado "**Popular Banco de Dados**".
5.  **Clique para Executar:** Clique neste botão. Você receberá uma confirmação no navegador (`confirm()`) antes da execução. Confirme para continuar.
6.  **Aguarde a Confirmação:** Um `alert()` no navegador informará se o processo foi bem-sucedido ou se houve algum erro. O console do navegador também exibirá logs detalhados do processo de seed.

### Método 2: Via Console do Navegador (Para Debug ou Uso Rápido)

Este método é útil para depuração ou para iniciar o seed sem navegar até o `HealthCheckPanel`.

1.  **Inicie a Aplicação e Autentique-se:** Siga os passos 1 e 2 do Método 1.
2.  **Abra o Console do Desenvolvedor:** No seu navegador, pressione `F12` (ou `Ctrl+Shift+I` / `Cmd+Option+I`) para abrir as Ferramentas do Desenvolvedor.
3.  **Navegue até a aba "Console".**
4.  **Importe e Execute a Função:** Cole as seguintes linhas no console e pressione Enter: