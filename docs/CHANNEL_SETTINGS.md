# Guia de Configuração de Canais

Este documento fornece um guia passo a passo sobre como configurar as credenciais para cada canal de comunicação no painel de configurações.

## Acessando o Painel de Configuração

1.  Navegue até a seção **Configurações** no menu lateral.
2.  Clique na aba **Canais** para visualizar o painel de configuração de canais.

---

## 1. Configurando o WhatsApp (via Z-API)

**Pré-requisitos:** Você precisa ter uma conta ativa na plataforma Z-API.

1.  **Encontre o Card do WhatsApp:** Localize o card com o ícone e título "WhatsApp".
2.  **Abra o Formulário:** Clique no botão **"Configurar"** ou **"Editar Credenciais"**.
3.  **Preencha as Credenciais:**
    *   **Token da Z-API:** Insira o `Token` fornecido no painel da sua instância na Z-API. Este token é usado para autorizar as requisições à API.
4.  **Salve:** Clique em **"Salvar"**. As credenciais serão armazenadas de forma segura.
5.  **Teste a Conexão:** Após salvar, o status do canal mudará para "Pendente". Clique no botão **"Testar Conexão"** para validar as credenciais. Se o teste for bem-sucedido, o status mudará para "Conectado".

---

## 2. Configurando o Instagram

**Pré-requisitos:** Você precisa de uma conta de Desenvolvedor Meta, uma Página do Facebook conectada a uma Conta Profissional do Instagram e as permissões necessárias (`instagram_basic`, `instagram_manage_messages`, `pages_messaging`).

1.  **Encontre o Card do Instagram:** Localize o card com o ícone e título "Instagram".
2.  **Abra o Formulário:** Clique no botão **"Configurar"**.
3.  **Preencha as Credenciais:**
    *   **ID da Página do Instagram:** Insira o ID da sua conta profissional do Instagram. Você pode encontrá-lo nas configurações da sua página no Meta Business Suite.
    *   **Token de Acesso da Meta:** Insira o Token de Acesso de Página (Page Access Token) gerado no seu App da Meta. Este token deve ter as permissões necessárias para enviar e receber mensagens.
4.  **Salve e Teste:** Salve as credenciais e clique em **"Testar Conexão"** para validar.

---

## 3. Configurando o Facebook Messenger

**Pré-requisitos:** Semelhante ao Instagram, você precisará de uma conta de Desenvolvedor Meta e uma Página do Facebook com a Plataforma Messenger configurada.

1.  **Encontre o Card do Facebook:** Localize o card com o ícone e título "Facebook".
2.  **Abra o Formulário:** Clique no botão **"Configurar"**.
3.  **Preencha as Credenciais:**
    *   **ID da Página do Facebook:** Insira o ID da sua Página do Facebook.
    *   **Token de Acesso da Meta:** Insira o Token de Acesso de Página (Page Access Token) com as permissões de `pages_messaging`.
4.  **Salve e Teste:** Salve as credenciais e clique em **"Testar Conexão"** para validar.

---

## Solução de Problemas

*   **Falha na Conexão:** Se o teste de conexão falhar, verifique se as credenciais foram copiadas corretamente, se não expiraram e se possuem as permissões necessárias.
*   **Erro ao Salvar:** Verifique se todos os campos obrigatórios foram preenchidos corretamente. Mensagens de erro específicas podem indicar qual campo está incorreto.