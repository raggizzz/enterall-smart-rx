import { createContext, ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useConnectivity, type ConnectivityState } from "@/hooks/useConnectivity";

const ConnectivityContext = createContext<ConnectivityState | null>(null);

export const useConnectivityContext = () => {
  const value = useContext(ConnectivityContext);
  if (!value) {
    throw new Error("useConnectivityContext must be used within ConnectivityProvider");
  }
  return value;
};

interface ConnectivityProviderProps {
  children: ReactNode;
}

const ConnectivityProvider = ({ children }: ConnectivityProviderProps) => {
  const connectivity = useConnectivity();
  const previousRef = useRef({
    isOnline: connectivity.isOnline,
    isServerReachable: connectivity.isServerReachable,
  });

  useEffect(() => {
    const previous = previousRef.current;

    if (previous.isOnline && !connectivity.isOnline) {
      toast.error("Sem conexao com a rede. O app pode operar com limitacoes.");
    }

    if (!previous.isOnline && connectivity.isOnline) {
      toast.success("Conexao de rede restabelecida.");
    }

    if (
      previous.isOnline &&
      previous.isServerReachable &&
      connectivity.isOnline &&
      !connectivity.isServerReachable
    ) {
      toast.error("Servidor da unidade indisponivel. Confira a rede local e a API.");
    }

    if (
      connectivity.isOnline &&
      !previous.isServerReachable &&
      connectivity.isServerReachable
    ) {
      toast.success("Servidor da unidade respondeu novamente.");
    }

    previousRef.current = {
      isOnline: connectivity.isOnline,
      isServerReachable: connectivity.isServerReachable,
    };
  }, [connectivity.isOnline, connectivity.isServerReachable]);

  const value = useMemo(() => connectivity, [connectivity]);

  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
};

export default ConnectivityProvider;
