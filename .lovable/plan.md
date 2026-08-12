# Implementação de Fluxo de Crédito de Ofertas e Ajustes Visuais

Este plano visa unificar a terminologia de "Receita Total" e garantir que os valores arrecadados por ofertas sejam creditados nas carteiras dos vendedores com descritivos claros, mantendo a distinção de acessibilidade para o Administrador.

## Mudanças do Usuário
- **Vendedores:** Verão "Valor arrecadado" em vez de "Receita Total" no dashboard.
- **Franqueados:** Verão "Valor arrecadado" em vez de "Receita Total" no dashboard.
- **Admin:** Verá "Receita Total" como um indicador global, refletindo o volume total de vendas da plataforma.
- **Transações:** Créditos de ofertas nas carteiras dos vendedores terão descritivos específicos (ex: "Crédito Oferta [Título] - tx adm").

## Detalhes Técnicos

### UI (Dashboards)
1.  **VendorDashboard.tsx:** Alterar o rótulo do KPI de receita para "Valor arrecadado (inc. entregas)".
2.  **FranchiseeDashboard.tsx:** Alterar o rótulo do KPI de receita para "Valor arrecadado".
3.  **AdminDashboard.tsx:** Manter "Receita Total" para o administrador como métrica de volume bruto.

### Backend (Lógica de Crédito)
1.  **Função SQL `fix_vendor_offer_credits`:** Atualizar o descritivo da transação para incluir a menção à taxa administrativa, seguindo o padrão sugerido: `'Crédito Oferta "' || v_offer.title || '" - tx adm'`.
2.  **Trigger de Validação de Ofertas:** Se houver uma rotina automática de fechamento de ofertas, ela será revisada para garantir que o descritivo da transação siga o mesmo padrão de clareza.

### Histórico da Carteira
1.  **WalletPage.tsx:** Garantir que o componente de exibição de transações renderize corretamente esses novos descritivos longos.

## Cronograma
1. Atualizar textos nos Dashboards (Vendor e Franchisee).
2. Modificar função SQL de correção de créditos para incluir o novo padrão de descritivo.
3. Verificar triggers automáticos de crédito para consistência no banco de dados.
