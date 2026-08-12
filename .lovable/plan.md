# Plano de Implementação - Reorganização Financeira Admin

O objetivo é mover a funcionalidade de transferência da carteira da plataforma da aba **Configurações** para a aba **Financeiro** e corrigir o campo de entrada de valor para permitir a digitação correta em dispositivos móveis/navegadores.

## Alterações Técnicas

### 1. Painel Administrativo (`src/pages/AdminDashboard.tsx`)
- Renomear a aba interna `reconciliacao` para `financeiro` para clareza semântica.
- Mover o componente `PlatformWalletLedger` da `TabsContent` de `config` para a nova `TabsContent` de `financeiro`.
- Remover `PlatformWalletLedger` da aba de configurações.

### 2. Modal de Transferência (`src/components/PlatformWithdrawModal.tsx`)
- Ajustar a lógica de validação do campo `Input` para permitir caracteres decimais (ponto e vírgula) de forma mais fluida.
- Garantir que a máscara não impeça a digitação do valor desejado.

## User Interface (UI)
- A aba **Financeiro** agora exibirá primeiro o saldo e extrato da plataforma com o botão de transferência, seguido pelas ferramentas de reconciliação.
- O botão "Transferir para minha carteira" estará visível e funcional dentro do contexto financeiro.
