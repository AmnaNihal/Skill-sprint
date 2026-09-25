import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { getToken, setToken, getStoredUser, setStoredUser } from '../lib/token';
import type { UserRole } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  employee_id?: string;
}

interface AuthResponse {
  access_token: string;
  user: {
    id: string | number;
    email: string;
    full_name: string;
    role: UserRole;
    employee_id?: string | null;
  };
}

interface AuthContextType {
  user: AuthUser | null;
  session: null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<{ needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(u: AuthResponse['user']): AuthUser {
  return {
    id: String(u.id),
    email: u.email || '',
    full_name: u.full_name || '',
    role: (u.role as UserRole) || 'learner',
    employee_id: u.employee_id || undefined,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredUser<AuthUser>();
    if (getToken() && stored) {
      setUser(stored);
    }
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    if (!res.access_token) throw new Error('Login failed');
    setToken(res.access_token);
    const authUser = toAuthUser(res.user);
    setStoredUser(authUser);
    setUser(authUser);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: UserRole) => {
    const res = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      full_name: fullName,
      role,
    });
    if (res.access_token) {
      setToken(res.access_token);
      const authUser = toAuthUser(res.user);
      setStoredUser(authUser);
      setUser(authUser);
      return {};
    }
    return { needsConfirmation: true };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setToken(null);
    setStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, session: null, loading, signIn, signUp, signOut }),
    [user, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
