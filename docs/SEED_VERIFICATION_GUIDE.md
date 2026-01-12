# Guia de Verificação de Dados de Exemplo (Seed Data)

Este guia detalha como verificar se o script de seed de dados (`seedData.js`) foi executado com sucesso, tanto através de consultas SQL diretas no Supabase quanto pela inspeção visual na interface do usuário da aplicação AudiCare. Ele também oferece um guia de solução de problemas e instruções para limpar os dados semeados, se necessário.

---

## 🔍 Como Verificar o Sucesso do Seed

Após executar o script de seed, é crucial confirmar que os dados foram inseridos corretamente no banco de dados e são exibidos como esperado na aplicação.

### Verificação Via Consultas SQL (Supabase Studio)

Você pode usar o Supabase Studio (o painel de controle do seu projeto Supabase) para executar estas consultas na seção "SQL Editor" e verificar a contagem e o conteúdo dos dados.

1.  **Verificar a Clínica de Exemplo:**
    Primeiro, obtenha o `id` da clínica de exemplo que o script de seed criou.