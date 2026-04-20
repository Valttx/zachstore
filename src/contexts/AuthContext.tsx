import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/lib/types';
import { loginUser, getCurrentUser, setCurrentUser } from '@/lib/store';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (usuario: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // "loading" es true mientras verificamos si hay un usuario guardado
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al iniciar la app, revisamos si hay un usuario en localStorage
    getCurrentUser().then(u => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // login ahora es async porque consulta Supabase
  const login = async (usuario: string, password: string): Promise<string | null> => {
    const found = await loginUser(usuario, password);
    if (!found) return 'Usuario o contraseña incorrectos';
    setUser(found);
    setCurrentUser(found);
    return null;
  };

  const logout = () => {
    setUser(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}