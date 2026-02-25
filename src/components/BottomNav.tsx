import { useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingBag, Wallet, Package } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { path: "/", label: "Home", icon: Home },
  { path: "/offers", label: "Ofertas", icon: ShoppingBag },
  { path: "/wallet", label: "Carteira", icon: Wallet },
  { path: "/orders", label: "Pedidos", icon: Package },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="grid grid-cols-4 h-16">
        {items.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary")} />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
