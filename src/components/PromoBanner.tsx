import { useState, useEffect } from "react";
import { X } from "lucide-react";

const promoMessages = [
  "🔥 Ofertas imperdíveis com até 60% de desconto!",
  "🛒 Quanto mais gente compra, mais todo mundo economiza!",
  "🎉 Novos produtos adicionados diariamente — confira!",
  "💰 Cadastre-se e ganhe bônus na sua primeira compra!",
];

export function PromoBanner() {
  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promoMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden bg-primary text-primary-foreground">
      <div className="container flex h-8 items-center justify-center text-sm font-medium">
        <div className="animate-marquee whitespace-nowrap">
          {promoMessages[currentIndex]}
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-primary-foreground/20 transition-colors"
        aria-label="Fechar banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
