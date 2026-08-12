# Ajuste de Descritivos Financeiros e Fluxo de Créditos

Este plano visa unificar a terminologia financeira no aplicativo e garantir que os créditos de vendas para vendedores e franqueados sejam registrados com descritivos claros sobre a origem e as taxas aplicadas.

## Mudanças para o Usuário
- **Vendedores e Franqueados:** O termo "Receita Total" será substituído por "Valor arrecadado" em seus respectivos dashboards, refletindo o volume bruto gerado pelas ofertas.
- **Transações da Carteira:** Novos créditos de vendas exibirão descrições detalhadas (ex: "Crédito Oferta [Título] - tx adm"), facilitando a conciliação financeira para o usuário.
- **Administrador:** Manterá a visão de "Receita Total" no Painel Admin, representando o volume transacional global da plataforma.

## Detalhes Técnicos

### UI (Frontend)
1.  **VendorDashboard.tsx:** Alterar o rótulo da métrica para "Valor arrecadado (inc. entregas)".
2.  **FranchiseeDashboard.tsx:** Alterar o rótulo da métrica para "Valor arrecadado".
3.  **AdminDashboard.tsx:** Assegurar que o termo "Receita Total" permaneça exclusivo para a visão administrativa global.

### Backend (Banco de Dados)
1.  **Função SQL `fix_vendor_offer_credits`:** Atualizar o comando `INSERT` na tabela `wallet_transactions` para usar o novo formato de descrição: `'Crédito Oferta "' || v_offer.title || '" - tx adm'`.
2.  **Lógica de Split Automático:** Verificar se existe função similar para o fechamento automático de ofertas e aplicar o mesmo padrão de descrição.

## Próximos Passos
1.  Aplicar as alterações de texto nos arquivos de dashboard.
2.  Atualizar a função RPC no banco de dados via migração SQL.
3.  Validar visualmente a renderização dos novos descritivos na página da carteira.
