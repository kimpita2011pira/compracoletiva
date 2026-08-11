# Plan - Fix Vendor Wallet Credits and Commission Fee

The user reported that credits from two successful offers for `kimpita2011@gmail.com` were incorrectly directed to "receitas" (likely the platform ledger) instead of the vendor's wallet, and the 10% commission was not correctly applied/deducted.

## User Review Required

> [!IMPORTANT]
> Since I cannot directly check the database content to see exactly which offers were affected, I will provide an "Emergency Recovery" tool in the Admin panel to manually re-process specific offers or adjust balances if needed.

## Proposed Changes

### Database Logic (Supabase)

#### 1. Audit and Fix `validate_expired_offers`
- Ensure the vendor's wallet is correctly identified using the `user_id` linked to the vendor record.
- Verify that `v_vendor_amount` (90%) is credited to the vendor and `v_platform_cut` (10%) is directed to the platform.
- Add extra logging/audit trails to `platform_wallet_transactions` to clarify the source of every cent.

#### 2. Reconciliation Tool Enhancement
- Create a specific RPC `public.fix_vendor_offer_credits(p_offer_id uuid)` that can be called by an Admin to manually trigger the credit/split logic if a background job failed or miscalculated.

### Frontend (React)

#### 1. Admin Dashboard
- Update the "Financeiro" or "Reconciliação" tab to show `platform_wallet_transactions` so admins can see exactly what entered "receitas".
- Add a button to "Re-processar Oferta" using the new RPC for manual fixes.

## Technical Details

### SQL Migration
```sql
-- Enhancement to validate_expired_offers for better reliability
CREATE OR REPLACE FUNCTION public.validate_expired_offers()
-- ... (Logic to ensure vendor wallet is found correctly)

-- New manual fix RPC
CREATE OR REPLACE FUNCTION public.fix_vendor_offer_credits(p_offer_id uuid)
RETURNS jsonb
SECURITY DEFINER
AS $$
-- ... (Atomic logic to credit vendor and platform if not already done)
$$;
```

### Affected Files
- `supabase/migrations/`: New migration for logic fixes and manual RPC.
- `src/components/AdminReconciliation.tsx`: UI for manual fixes and platform ledger view.
- `src/hooks/useReconciliation.tsx`: Hook updates to support the fix RPC.

## Verification Plan

### Automated Tests
- Run `run_wallet_reconciliation()` to check if it now flags the missing vendor credits as discrepancies.
- Test the new `fix_vendor_offer_credits` RPC with a mock offer.

### Manual Verification
- Navigate to Admin Dashboard -> Financeiro.
- Check the "Receitas da Plataforma" list.
- Use the reconciliation report to identify the affected offers and apply the fix.
