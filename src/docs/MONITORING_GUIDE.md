# Guia de Monitoramento (Monitoring Dashboard)

O **Monitoring Dashboard** é uma ferramenta centralizada para visualizar a saúde, performance e estabilidade do sistema de mensagens e integração com o WhatsApp.

## Como Acessar

O painel pode ser acessado clicando no ícone de **"Monitoramento" (Activity)** no cabeçalho da página **Inbox**.

## Métricas Monitoradas

### 1. Status de Saúde (Health Check)
*   **Conectividade:** Indica se o frontend consegue se comunicar com o backend (`api.audicarefono.com.br`).
*   **Status:** Online (Verde), Offline (Vermelho) ou Degradado (Amarelo).
*   **Atualização:** Verificado automaticamente a cada polling ou manualmente via botão de refresh.

### 2. Latência de API
*   **Gráfico em Tempo Real:** Mostra a latência das últimas requisições HTTP ao backend.
*   **Interpretação:**
    *   `< 200ms`: Excelente.
    *   `200ms - 500ms`: Aceitável.
    *   `> 500ms`: Atenção, possível lentidão na rede ou sobrecarga no servidor.

### 3. Taxa de Mensagens (Throughput)
*   **Enviadas vs. Recebidas:** Gráfico de área comparando o volume de mensagens saindo e entrando.
*   **Uso:** Útil para identificar picos de tráfego ou falhas (ex: muitas enviadas mas zero recebidas pode indicar problema no webhook).

### 4. Taxa de Erros
*   **Contador de Erros:** Total de falhas de requisição, erros de parsing ou falhas críticas na sessão atual.
*   **Alertas:** Se a taxa de erros subir muito, um alerta visual será exibido.

### 5. Webhooks & Integração
*   **Estatísticas Detalhadas:**
    *   **Eventos Recebidos:** Total de payloads brutos recebidos via Supabase Realtime.
    *   **Mensagens:** Quantas mensagens de chat foram processadas com sucesso.
    *   **Status:** Updates de entrega/leitura processados.

## Alertas Automáticos

O sistema gera alertas automáticos para condições críticas:
*   **Sistema Offline:** Conexão perdida com a internet ou backend.
*   **Alta Taxa de Erros:** Mais de 5 erros em um curto período.
*   **Fila Offline:** Mensagens acumuladas aguardando envio.

## Troubleshooting com o Dashboard

1.  **Se a Latência estiver alta:** Verifique sua conexão local. Se persistir, pode ser instabilidade no servidor.
2.  **Se "Eventos Recebidos" pararem:** Verifique se a conexão Realtime está ativa na aba "Status & Webhooks" do Debug Panel.
3.  **Se houver "Fila Offline":** O sistema tentará reenviar automaticamente quando a conexão voltar. Não feche a aba se houver itens na fila.