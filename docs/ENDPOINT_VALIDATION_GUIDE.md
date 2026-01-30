# Guia de Validação de Endpoints da API

Este guia fornece procedimentos passo-a-passo para validar os endpoints críticos da integração do WhatsApp (UAZAPI) no sistema AudiCare. Use este guia para verificar a saúde, funcionalidade e resiliência da API.

---

## 1. Validação de Health-Check (`/wa/health-check`)

**Objetivo:** Verificar se a conexão entre o backend (Supabase Edge Functions) e a instância do WhatsApp está ativa.

**Procedimento:**
1.  Abra o **API Debug Panel** na aplicação (`/inbox` > Botão "API Debug").
2.  Selecione o método `GET`.
3.  Endpoint: `/wa/health-check`.
4.  Envie a requisição.

**Comando cURL:**