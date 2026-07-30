import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

const offer = {
  id: "80288214-fb56-4364-967c-b9da55717640", vendor_id: "v", title: "Pizza",
  description: "d", image_url: "http://x/y.webp", original_price: 29, offer_price: 20,
  min_quantity: 50, max_per_user: 3, start_date: "2026-07-29T23:27:09Z", end_date: "2026-08-11T02:59:00Z",
  delivery_available: true, delivery_fee: 5, pickup_available: true, estimated_delivery_time: "2",
  status: "ATIVA", sold_quantity: 0, created_at: "2026-07-29T23:27:09Z", category: "ALIMENTACAO",
  city: "Pirassununga", vendors: { company_name: "CC", description: "x" },
};

vi.mock("@/hooks/useOfferDetail", () => ({
  useOfferDetail: () => ({ data: offer, isLoading: false }),
  useOfferReviews: () => ({ data: [] }),
  useSubmitReview: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/useOfferImages", () => ({ useOfferImages: () => ({ data: [] }) }));
vi.mock("@/hooks/useOfferInterest", () => ({ useOfferInterest: () => ({ hasInterest: false, interestCount: 0, toggle: { mutate: vi.fn(), isPending: false } }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" }, roles: ["CLIENTE"], loading: false, signOut: vi.fn() }) }));

import OfferDetailPage from "@/pages/OfferDetailPage";

describe("detail", () => {
  it("renders", () => {
    const qc = new QueryClient();
    render(
      <HelmetProvider><QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/offers/1"]}>
          <Routes><Route path="/offers/:id" element={<OfferDetailPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider></HelmetProvider>
    );
  });
});
