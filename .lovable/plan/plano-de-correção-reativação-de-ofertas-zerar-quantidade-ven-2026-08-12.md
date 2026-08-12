# Plano de Correção: Reativação de Ofertas (Zerar Quantidade Vendida)

Ao reativar uma oferta (seja VALIDADA ou EXPIRADA), o sistema deve tratá-la como uma nova instância da oferta. Atualmente, a coluna `sold_quantity` permanece com o valor acumulado da rodada anterior, o que faz com que a meta apareça como já atingida.

## Alterações Propostas

### Backend (Supabase)
- Atualizar a função RPC `public.reactivate_vendor_offer` para zerar a coluna `sold_quantity` da oferta ao mudar o status para `ATIVA`.

## Detalhes Técnicos
- **Arquivo:** Migração SQL para atualizar a função existente.
- **Lógica:** Adicionar `sold_quantity = 0` no comando `UPDATE` dentro da função `reactivate_vendor_offer`.

## Considerações
- Isso garante que o contador de progresso da oferta comece do zero para a nova data de validade.
- Reservas anteriores já foram processadas (ou canceladas/validadas), portanto, a nova rodada deve começar limpa.
