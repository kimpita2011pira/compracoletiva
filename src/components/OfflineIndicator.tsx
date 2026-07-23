import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 md:bottom-8 md:left-auto md:right-8 md:w-80">
      <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive backdrop-blur-md shadow-lg">
        <WifiOff className="h-5 w-5 shrink-0" />
        <div className="flex-1 text-sm">
          <p className="font-bold">Você está offline</p>
          <p className="opacity-90">Algumas funcionalidades podem estar indisponíveis. O app funcionará normalmente assim que a conexão for restabelecida.</p>
        </div>
      </div>
    </div>
  );
}
