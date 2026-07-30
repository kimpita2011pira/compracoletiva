import { render, waitFor } from "@testing-library/react";
import { describe, it, vi, expect } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "f95c610e-83b9-4bc5-9afb-c9c0be4ac074", email: "t@t.com" }, roles: ["CLIENTE"], loading: false, signOut: vi.fn() }) }));

import OfferDetailPage from "@/pages/OfferDetailPage";

const ids = ["8e8fdb59-0406-4825-abe5-2cea671a01fd","73de1248-1bad-48a7-a7b4-ecc30c4fb5c8","e553d85d-30fe-40ac-8341-77aa0db01973","75200995-3cd3-4be3-afa4-adb3c3140023","95614880-85fc-4fc9-9b19-ed95ddc73fb6","1c939307-cfc3-496e-823f-d85d978dda7e","9e315ac8-acdd-4013-a0f7-b16c5f1a8c93","4cf15814-3d93-499e-aab7-aa181b73e720","26feda41-7c08-4dc6-a670-b38aa0786827","e1de5695-dc41-4fa4-9cb8-7e4065036395","7412767e-319f-4092-be62-ebd461a3352e","d4d4792c-7acd-473a-9d6f-f7bf8a15157f","953aa16a-eae7-4b66-9bfe-04867289d5e5","5ffea628-f4f5-469c-9625-6e92cef05af3","e147b0ba-e505-4626-a144-cb2975eaf563","677b8da9-e1e0-44c0-a7a2-affb7ce7125d","705d67e5-e7eb-4559-8ac2-b7ae0dc85fce","69a1af90-e8d9-47a4-b49f-9443f0541d1f","7d025339-6450-42fb-a588-f471e8e4eca8","45420100-7068-450b-8cbb-8b50655f6be1","80288214-fb56-4364-967c-b9da55717640"];

describe("detail-live-all", () => {
  for (const id of ids) {
    it("renders " + id, async () => {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const { unmount } = render(
        <HelmetProvider><QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={["/offers/" + id]}>
            <Routes><Route path="/offers/:id" element={<OfferDetailPage />} /></Routes>
          </MemoryRouter>
        </QueryClientProvider></HelmetProvider>
      );
      await waitFor(() => expect(document.body.textContent).toContain("Avaliações"), { timeout: 15000 });
      unmount();
    }, 20000);
  }
});
