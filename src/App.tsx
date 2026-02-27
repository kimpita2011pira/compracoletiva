import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import VendorDashboard from "./pages/VendorDashboard";
import VendorOnboarding from "./pages/VendorOnboarding";
import VendorCreateOffer from "./pages/VendorCreateOffer";
import AdminDashboard from "./pages/AdminDashboard";
import OffersMarketplace from "./pages/OffersMarketplace";
import OfferDetailPage from "./pages/OfferDetailPage";
import WalletPage from "./pages/WalletPage";
import MyOrders from "./pages/MyOrders";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import AboutPage from "./pages/AboutPage";
import TermsPage from "./pages/TermsPage";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/vendor" element={<ProtectedRoute requiredRole="VENDEDOR"><VendorDashboard /></ProtectedRoute>} />
        <Route path="/vendor/onboarding" element={<ProtectedRoute requiredRole="VENDEDOR"><VendorOnboarding /></ProtectedRoute>} />
        <Route path="/vendor/create-offer" element={<ProtectedRoute requiredRole="VENDEDOR"><VendorCreateOffer /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="ADMIN"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/offers" element={<ProtectedRoute><OffersMarketplace /></ProtectedRoute>} />
        <Route path="/offers/:id" element={<ProtectedRoute><OfferDetailPage /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
