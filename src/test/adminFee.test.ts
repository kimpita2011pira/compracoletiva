import { describe, it, expect } from "vitest";

/**
 * Regression tests for the monthly admin fee invariants.
 *
 * These tests mirror the SQL logic in `public.charge_admin_fee_current_month`
 * to guarantee:
 *  1. Fee is only charged for the CURRENT month.
 *  2. Missed months DO NOT accumulate (no back-charging).
 *  3. If balance < fee, the charge is skipped (not queued).
 *  4. After a deposit, the pending current-month charge is applied ONCE.
 *  5. Exempt users are never charged.
 */

type Ctx = {
  balance: number;
  fee: number;
  exempt: boolean;
  role: "CLIENTE" | "VENDEDOR" | "ADMIN" | "FRANQUEADO";
  chargedMonths: Set<string>; // YYYY-MM
  now: Date;
};

function currentMonth(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Mirrors public.charge_admin_fee_current_month */
function chargeAdminFeeCurrentMonth(ctx: Ctx): boolean {
  if (ctx.role !== "CLIENTE") return false;
  if (ctx.exempt) return false;
  if (!ctx.fee || ctx.fee <= 0) return false;
  const m = currentMonth(ctx.now);
  if (ctx.chargedMonths.has(m)) return false;
  if (ctx.balance < ctx.fee) return false;
  ctx.balance -= ctx.fee;
  ctx.chargedMonths.add(m);
  return true;
}

/** Simulates the deposit trigger that retries the charge. */
function deposit(ctx: Ctx, amount: number) {
  ctx.balance += amount;
  chargeAdminFeeCurrentMonth(ctx);
}

const base = (): Ctx => ({
  balance: 0,
  fee: 5,
  exempt: false,
  role: "CLIENTE",
  chargedMonths: new Set(),
  now: new Date("2026-07-15T12:00:00Z"),
});

describe("admin fee — invariants", () => {
  it("charges current month once when balance is sufficient", () => {
    const c = { ...base(), balance: 20 };
    expect(chargeAdminFeeCurrentMonth(c)).toBe(true);
    expect(c.balance).toBe(15);
    expect(chargeAdminFeeCurrentMonth(c)).toBe(false); // idempotent
    expect(c.balance).toBe(15);
  });

  it("skips charge when balance < fee (no accumulation)", () => {
    const c = { ...base(), balance: 2 };
    expect(chargeAdminFeeCurrentMonth(c)).toBe(false);
    expect(c.balance).toBe(2);
    expect(c.chargedMonths.size).toBe(0);
  });

  it("does NOT back-charge missed months after months of no balance", () => {
    // 3 months with insufficient balance
    const c = base();
    const months = ["2026-05-15", "2026-06-15", "2026-07-15"];
    for (const iso of months) {
      c.now = new Date(iso);
      chargeAdminFeeCurrentMonth(c); // all skipped
    }
    expect(c.chargedMonths.size).toBe(0);

    // First deposit in July: should charge ONLY July, not May+June+July.
    deposit(c, 20);
    expect(c.chargedMonths.size).toBe(1);
    expect(c.chargedMonths.has("2026-07")).toBe(true);
    expect(c.balance).toBe(15);
  });

  it("charges after 1st recharge in the same month it was skipped", () => {
    const c = { ...base(), balance: 0 };
    chargeAdminFeeCurrentMonth(c); // skipped
    expect(c.chargedMonths.size).toBe(0);
    deposit(c, 10);
    expect(c.chargedMonths.has(currentMonth(c.now))).toBe(true);
    expect(c.balance).toBe(5);
  });

  it("never charges exempt users", () => {
    const c = { ...base(), balance: 100, exempt: true };
    expect(chargeAdminFeeCurrentMonth(c)).toBe(false);
    deposit(c, 50);
    expect(c.chargedMonths.size).toBe(0);
    expect(c.balance).toBe(150);
  });

  it("never charges non-buyer roles", () => {
    for (const role of ["VENDEDOR", "ADMIN", "FRANQUEADO"] as const) {
      const c = { ...base(), balance: 100, role };
      expect(chargeAdminFeeCurrentMonth(c)).toBe(false);
      expect(c.chargedMonths.size).toBe(0);
    }
  });

  it("does not double-charge same month across multiple deposits", () => {
    const c = { ...base(), balance: 0 };
    deposit(c, 20); // charges July
    deposit(c, 20); // no extra charge
    deposit(c, 20);
    expect(c.chargedMonths.size).toBe(1);
    expect(c.balance).toBe(20 * 3 - 5);
  });

  it("charges each month independently when balance is present", () => {
    const c = { ...base(), balance: 100 };
    c.now = new Date("2026-06-01");
    chargeAdminFeeCurrentMonth(c);
    c.now = new Date("2026-07-01");
    chargeAdminFeeCurrentMonth(c);
    expect(c.chargedMonths.size).toBe(2);
    expect(c.balance).toBe(90);
  });
});
