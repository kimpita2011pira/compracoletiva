# Plano de Correção: Estorno de Reserva de Oferta

O usuário `compracoletivapira@gmail.com` relatou que, após a não efetivação de uma oferta, o valor reservado em sua carteira não foi devolvido.

## Diagnóstico
A função `public.validate_expired_offers()` é responsável por processar ofertas que atingiram a data de término. Quando uma oferta não atinge a quantidade mínima (`sold_quantity < min_quantity`), ela é marcada como `CANCELADA` e os pedidos `RESERVADO` devem ser estornados.

Problemas potenciais identificados:
1.  **Concorrência/Race Condition**: Se a função for executada múltiplas vezes ou falhar no meio, pode haver estados inconsistentes.
2.  **Filtro de Status**: A função processa apenas pedidos com status `RESERVADO`. Se por algum motivo o status do pedido mudou ou não foi atualizado corretamente, o estorno não ocorre.
3.  **Logs de Auditoria**: Atualmente, as mensagens de cancelamento nas notificações estão sendo usadas para depuração interna (conforme visto na última migração), o que dificulta a comunicação com o usuário final.

## Ações Propostas

### 1. Banco de Dados (Supabase)
-   **Reforçar Idempotência**: Garantir que o processo de estorno seja atômico e registre de forma inequívoca que o estorno foi realizado para evitar duplicidade ou omissão.
-   **Melhorar Logs**: Adicionar logs na tabela `audit_log` (se existir) ou criar uma tabela de logs de sistema para rastrear falhas específicas no processamento de estornos.
-   **Corrigir Mensagem de Notificação**: Restaurar uma mensagem útil para o usuário na função `notify_customers_on_offer_validation`.

### 2. Verificação de Dados
-   Executar uma query para identificar pedidos da oferta em questão que ficaram "presos" no status `RESERVADO` mesmo com a oferta cancelada.
-   Criar uma migração de correção (fix-up) para processar estornos pendentes para o usuário mencionado.

## Verificação
-   Simular o cancelamento de uma oferta com reservas e verificar se o saldo retorna para a carteira.
-   Validar se a notificação enviada contém as informações corretas sobre o estorno.

---
**Próximo Passo**: Criar a migração para corrigir o saldo do usuário e melhorar a robustez da função de validação.