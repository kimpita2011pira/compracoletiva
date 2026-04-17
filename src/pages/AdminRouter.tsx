import { useAuth } from "@/hooks/useAuth";
import AdminDashboard from "@/pages/AdminDashboard";
import FranchiseeDashboard from "@/pages/FranchiseeDashboard";

export default function AdminRouter() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("ADMIN");
  if (isAdmin) return <AdminDashboard />;
  return <FranchiseeDashboard />;
}
