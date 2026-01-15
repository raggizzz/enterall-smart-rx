/**
 * Database Provider Component
 * Initializes the local database and provides loading state
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useDatabaseInit } from '@/hooks/useDatabase';

interface DatabaseContextType {
    isReady: boolean;
    error: Error | null;
}

const DatabaseContext = createContext<DatabaseContextType>({
    isReady: false,
    error: null
});

export const useDatabaseContext = () => useContext(DatabaseContext);

interface DatabaseProviderProps {
    children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
    const { isReady, error } = useDatabaseInit();

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50">
                <div className="text-center p-8 max-w-md">
                    <div className="text-6xl mb-4">❌</div>
                    <h1 className="text-2xl font-bold text-red-700 mb-2">Erro no Banco de Dados</h1>
                    <p className="text-red-600 mb-4">
                        Não foi possível inicializar o banco de dados local.
                    </p>
                    <p className="text-sm text-gray-600">
                        {error.message}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    if (!isReady) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
                <div className="text-center p-8">
                    <div className="animate-pulse text-6xl mb-4">🏥</div>
                    <h1 className="text-2xl font-bold text-gray-700 mb-2">EnterAll Smart Rx</h1>
                    <p className="text-gray-500 mb-4">Inicializando banco de dados local...</p>
                    <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                        💾 Modo Offline - Seus dados são salvos localmente
                    </p>
                </div>
            </div>
        );
    }

    return (
        <DatabaseContext.Provider value={{ isReady, error }}>
            {children}
        </DatabaseContext.Provider>
    );
};

export default DatabaseProvider;
