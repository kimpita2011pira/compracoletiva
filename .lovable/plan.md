# Plan: Wallet Reconciliation Expansion and Testing Tools

Expansion of the financial reconciliation routine to include external Mercado Pago validation, implementation of notification testing tools, and minor UI improvements as per the suggested steps.

## Proposed Changes

### 1. Database & Backend (Supabase)

#### [NEW] Edge Function: `mercadopago-reconciliation`
- Fetches recent `approved` payments from Mercado Pago (last 7 days).
- Compares each payment with `wallet_transactions` (filtering by description `MP #<id>`).
- Returns a list of discrepancies (payments approved in MP but not found in the wallet ledger).

#### RPC Updates: `public.run_external_reconciliation(discrepancies jsonb)`
- A helper RPC to record the findings from the Edge Function into the `reconciliation_reports` table with a new type `external_mismatch`.

#### [NEW] RPC: `public.test_commission_notification()`
- A secure admin-only function that triggers a mock commission transaction (and thus the `notify_commission_and_refunds` trigger) to allow the admin to verify notifications are working correctly.

### 2. Frontend (React)

#### Hook: `src/hooks/useReconciliation.tsx`
- Add `runExternalReconciliation` mutation which calls the `mercadopago-reconciliation` Edge Function and then persists results via RPC.

#### Component: `src/components/AdminReconciliation.tsx`
- Add a new button "Verificar Pagamentos Externos (Mercado Pago)".
- Update the table to display `external_mismatch` types correctly.
- Add a "Testar Notificações" section to trigger the test RPC.

### 3. Visual & UX
- Ensure the transaction status in `WalletPage.tsx` is clear.
- Validate the "Invisible Separator" request (if found during implementation, apply it; otherwise, focus on the functional steps).

## Verification Plan

### Automated Tests
- Run the reconciliation Edge Function manually via `supabase--curl_edge_functions` to verify it fetches MP data correctly.
- Call the test notification RPC and verify a notification is created in the `notifications` table for the admin.

### Manual Verification
- Navigate to Admin Dashboard > Financeiro.
- Click "Executar Nova Análise" (Internal).
- Click "Verificar Pagamentos Externos" (External).
- Verify the list of discrepancies matches expected test data.
