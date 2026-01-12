# Diretrizes de Segurança do Projeto AudiCare

Este documento descreve as diretrizes e práticas de segurança implementadas e recomendadas para o projeto AudiCare, com foco na proteção de dados sensíveis e na integridade do sistema.

## 1. Row Level Security (RLS)

A RLS é a pedra angular da segurança multi-tenant no AudiCare.

*   **Princípio:** Cada usuário só pode acessar os dados pertencentes à sua clínica.
*   **Implementação:**
    *   Todas as tabelas que contêm dados específicos da clínica (`clinics`, `profiles`, `patients`, `appointments`, `conversations`, `messages`, `contacts`, `repairs`, `tasks`, `message_templates`, `channel_credentials`, etc.) possuem políticas de RLS ativadas.
    *   A função `is_member_of_clinic(clinic_id uuid)` é utilizada em quase todas as políticas para verificar se o `auth.uid()` (ID do usuário autenticado) é membro da `clinic_id` em questão.
    *   **Exemplo de Política:**