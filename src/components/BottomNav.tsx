import { useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingBag, Wallet, Package, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const items = [
  { path: "/", label: "Home", icon: Home },
  { path: "/offers", label: "Ofertas", icon: ShoppingBag },
  { path: "/favorites", label: "Favoritos", icon: Heart },
  { path: "/wallet", label: "Carteira", icon: Wallet },
  { path: "/orders", label: "Pedidos", icon: Package },
];

export function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="grid grid-cols-5 h-16">
        {items.map(({ path, label, icon: Icon }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                active
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 h-[3px] w-10 rounded-b-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.span
                animate={active ? { scale: 1.15 } : { scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Icon className="h-5 w-5" />
              </motion.span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
