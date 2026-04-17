-- Allow franchisee withdrawals (no vendor)
ALTER TABLE public.withdrawal_requests ALTER COLUMN vendor_id DROP NOT NULL;

-- New RLS: franchisees can insert their own withdrawals (no vendor required)
CREATE POLICY "Franchisees insert own withdrawals"
ON public.withdrawal_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND vendor_id IS NULL
  AND EXISTS (SELECT 1 FROM public.franchises f WHERE f.user_id = auth.uid() AND f.active = true)
);

CREATE POLICY "Franchisees view own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id AND vendor_id IS NULL);