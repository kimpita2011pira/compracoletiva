import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.test("mercadopago-reconciliation function test", async () => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Invoke the function
  const { data, error } = await client.functions.invoke("mercadopago-reconciliation");

  if (error) {
    throw new Error(`Function invocation failed: ${error.message}`);
  }

  console.log("Reconciliation Data:", data);
  
  if (!data.discrepancies) {
    throw new Error("Response missing discrepancies field");
  }

  // If no MP_TOKEN is set in the test env, it might return empty or error, 
  // but we mostly want to check if it runs without crashing.
});
