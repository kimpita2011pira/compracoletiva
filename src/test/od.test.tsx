import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, roles: [], loading: false, signOut: vi.fn() }) }));

import OfferDetailPage from "@/pages/OfferDetailPage";

describe("detail-live", () => {
  it("renders with live data", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <HelmetProvider><QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/offers/80288214-fb56-4364-967c-b9da55717640"]}>
          <Routes><Route path="/offers/:id" element={<OfferDetailPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider></HelmetProvider>
    );
    await waitFor(() => expect(document.body.textContent).toContain("Pizza"), { timeout: 15000 });
    console.log(document.body.textContent?.slice(0, 600));
  }, 20000);
});
