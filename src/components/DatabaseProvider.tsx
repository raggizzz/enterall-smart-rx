import React, { createContext, useContext, ReactNode } from "react";
import { useDatabaseInit } from "@/hooks/useDatabase";

interface DatabaseContextType {
  isReady: boolean;
  error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
  isReady: false,
  error: null,
});

export const useDatabaseContext = () => useContext(DatabaseContext);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const { isReady, error } = useDatabaseInit();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="text-center p-8 max-w-md bg-white rounded-xl border border-red-200 shadow-sm">
          <h1 className="text-2xl font-bold text-red-700 mb-2">Erro de Conexao com o Banco</h1>
          <p className="text-red-600 mb-4">
            Nao foi possivel inicializar o acesso ao Supabase.
          </p>
          <p className="text-sm text-gray-600">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-medical-green-light to-background p-4">
        <div className="text-center p-8 max-w-md bg-white/80 backdrop-blur rounded-xl border shadow-sm">
          <h1 className="text-2xl font-bold text-medical-green-dark mb-2">ENMeta</h1>
          <p className="text-gray-600 mb-4">Inicializando servicos da plataforma...</p>
          <div className="w-56 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "70%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Dados sincronizados por unidade hospitalar
          </p>
        </div>
      </div>
    );
  }

  return <DatabaseContext.Provider value={{ isReady, error }}>{children}</DatabaseContext.Provider>;
};

export default DatabaseProvider;
