import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const STORAGE_KEY = "pwa_install_banner_dismissed";

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

const isIosInstallFlow = () =>
  /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !isStandalone();

const PwaInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
    setInstalled(isStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const shouldShow = useMemo(() => {
    if (installed || dismissed || typeof window === "undefined") return false;
    return Boolean(deferredPrompt) || isIosInstallFlow();
  }, [deferredPrompt, dismissed, installed]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 rounded-2xl border border-primary/20 bg-card/95 p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-6 sm:w-[420px]">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Instalar ENMeta neste aparelho</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            O modo instalado ajuda no uso clinico diario, abre em tela cheia e deixa a experiencia mais estavel no plantao.
          </p>
          {isIosInstallFlow() ? (
            <p className="mt-2 text-xs text-foreground">
              No iPhone/iPad, abra o menu de compartilhamento do Safari e toque em <strong>Adicionar a Tela de Inicio</strong>.
            </p>
          ) : (
            <Button size="sm" className="mt-3" onClick={() => void handleInstall()}>
              <Download className="h-4 w-4" />
              Instalar app
            </Button>
          )}
        </div>
        <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PwaInstallBanner;
