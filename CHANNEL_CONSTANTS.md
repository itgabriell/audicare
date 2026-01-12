# Documentação de Constantes de Canal

Este documento detalha a estrutura de dados e as constantes utilizadas para gerenciar os múltiplos canais de comunicação no sistema.

## 1. Estrutura de Dados Principal

A lógica de canais é centralizada no arquivo `src/lib/channels.js`. Ele exporta um objeto principal, `CHANNEL_CONFIG`, que serve como a "fonte da verdade" para todas as informações relacionadas a canais.

### `CHANNEL_CONFIG`

Este é um objeto onde cada chave é um `ChannelType` (ex: 'whatsapp') e o valor é um objeto de configuração (`ChannelConfig`).

**Exemplo de Estrutura:**