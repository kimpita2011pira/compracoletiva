# Plano de Ação - Sistema de Saque e Conciliação da Plataforma

Este plano visa resolver a retenção de comissões no "Caixa Plataforma" e permitir que o administrador realize saques ou transferências desse saldo para sua carteira pessoal.

## Alterações Técnicas

### 1. Banco de Dados (Supabase)
- **Função `public.process_platform_withdrawal(p_amount numeric)`**: Criar uma nova função `SECURITY DEFINER` para permitir que o ADMIN realize saques do `platform_wallet`.
  - Deduz o valor de `platform_wallet.balance`.
  - Registra a transação em `platform_wallet_transactions` com o tipo `SAQUE_PLATAFORMA`.
  - Transfere o valor para a carteira (`wallets`) do usuário ADMIN.
- **Ajuste na `platform_wallet_transactions`**: Adicionar o tipo `SAQUE_PLATAFORMA` ao enum/check constraint da coluna `type`.
- **Correção da função `fix_vendor_offer_credits`**: Garantir que o valor retido seja SEMPRE creditado no `platform_wallet`.

### 2. Frontend (React)
- **Novo Hook `usePlatformWallet`**: Para gerenciar o saldo e as ações da carteira da plataforma.
- **Componente `PlatformWithdrawModal`**: Criar um modal para o administrador informar o valor a ser transferido do caixa da plataforma para sua carteira.
- **Atualização do `PlatformWalletLedger`**:
  - Adicionar botão "Transferir para minha carteira".
  - Exibir o saldo atual de forma destacada.
- **Atualização do `AdminDashboard`**: Garantir que as métricas reflitam o saldo disponível após saques.

## User Review Required

> [!IMPORTANT]
> A transferência será feita do **Caixa da Plataforma** (global) para a **Carteira Pessoal** do administrador que estiver logado. Uma vez na carteira, o administrador poderá solicitar um saque via Pix normalmente através da aba "Financeiro/Saques".

- Você concorda com este fluxo de "Caixa Plataforma -> Carteira Admin -> Saque Pix"?
- O valor da taxa de 1% (franquias) e 10% (sem franquia) deve ser transferido integralmente ou você deseja manter um fundo de reserva no caixa da plataforma?
