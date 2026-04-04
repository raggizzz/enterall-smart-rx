/**
 * Hook centralizado para acesso e mutação da sessão do usuário no localStorage.
 * Substitui os 22+ acessos diretos espalhados pelos componentes.
 *
 * Chaves do localStorage:
 *   local_session      – token JWT serializado como JSON { access_token, refresh_token? }
 *   userRole           – role do profissional logado
 *   userName           – nome do profissional
 *   userProfessionalId – UUID do profissional
 *   userHospitalId     – UUID do hospital selecionado
 *   userHospitalName   – nome exibível do hospital
 *   userWard           – nome do setor/ward selecionado
 */

import { useState, useCallback, useEffect } from 'react';
import { hasStoredAccessToken } from '@/lib/permissions';

const KEYS = {
  session: 'local_session',
  role: 'userRole',
  name: 'userName',
  professionalId: 'userProfessionalId',
  hospitalId: 'userHospitalId',
  hospitalName: 'userHospitalName',
  ward: 'userWard',
} as const;

/** Evento disparado quando a sessão muda para sincronizar outros hooks */
const SESSION_CHANGE_EVENT = 'enmeta-session-updated';

export interface SessionData {
  role: string | null;
  name: string | null;
  professionalId: string | null;
  hospitalId: string | null;
  hospitalName: string | null;
  ward: string | null;
  isAuthenticated: boolean;
}

function readSession(): SessionData {
  if (typeof window === 'undefined') {
    return {
      role: null, name: null, professionalId: null,
      hospitalId: null, hospitalName: null, ward: null,
      isAuthenticated: false,
    };
  }
  const role = localStorage.getItem(KEYS.role);
  const name = localStorage.getItem(KEYS.name);
  const hospitalId = localStorage.getItem(KEYS.hospitalId);
  return {
    role,
    name,
    professionalId: localStorage.getItem(KEYS.professionalId),
    hospitalId,
    hospitalName: localStorage.getItem(KEYS.hospitalName),
    ward: localStorage.getItem(KEYS.ward),
    isAuthenticated: Boolean(role && name && hospitalId && hasStoredAccessToken()),
  };
}

export function useSession() {
  const [session, setSession] = useState<SessionData>(readSession);

  // Sincroniza quando outro componente muda a sessão
  useEffect(() => {
    const handleChange = () => setSession(readSession());
    window.addEventListener(SESSION_CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(SESSION_CHANGE_EVENT, handleChange);
  }, []);

  const saveSession = useCallback((data: {
    token: string;
    refreshToken?: string;
    role: string;
    name: string;
    professionalId: string;
    hospitalId: string;
    hospitalName: string;
    ward?: string;
  }) => {
    let existingRefreshToken: string | undefined;
    try {
      const raw = localStorage.getItem(KEYS.session);
      if (raw) {
        existingRefreshToken = (JSON.parse(raw) as { refresh_token?: string }).refresh_token;
      }
    } catch {
      existingRefreshToken = undefined;
    }

    localStorage.setItem(KEYS.session, JSON.stringify({
      access_token: data.token,
      refresh_token: data.refreshToken ?? existingRefreshToken,
    }));
    localStorage.setItem(KEYS.role, data.role);
    localStorage.setItem(KEYS.name, data.name);
    localStorage.setItem(KEYS.professionalId, data.professionalId);
    localStorage.setItem(KEYS.hospitalId, data.hospitalId);
    localStorage.setItem(KEYS.hospitalName, data.hospitalName);
    if (data.ward) localStorage.setItem(KEYS.ward, data.ward);
    setSession(readSession());
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }, []);

  const updateHospital = useCallback((hospitalId: string, hospitalName: string) => {
    localStorage.setItem(KEYS.hospitalId, hospitalId);
    localStorage.setItem(KEYS.hospitalName, hospitalName);
    localStorage.removeItem(KEYS.ward);
    setSession(readSession());
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }, []);

  const updateWard = useCallback((ward: string) => {
    localStorage.setItem(KEYS.ward, ward);
    setSession(readSession());
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }, []);

  const clearSession = useCallback(() => {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    setSession(readSession());
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }, []);

  const getToken = useCallback((): string | null => {
    const raw = localStorage.getItem(KEYS.session);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { access_token?: string };
      return parsed.access_token ?? null;
    } catch {
      return null;
    }
  }, []);

  return {
    ...session,
    saveSession,
    updateHospital,
    updateWard,
    clearSession,
    getToken,
  };
}
