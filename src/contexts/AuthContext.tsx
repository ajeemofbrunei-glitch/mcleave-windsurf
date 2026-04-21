import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, type User } from '../api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userRole: 'master_admin' | 'store_admin' | 'crew' | null;
  signIn: (email: string, password: string, type: 'admin' | 'crew') => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, storeName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'master_admin' | 'store_admin' | 'crew' | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const userData = localStorage.getItem('auth_user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setUserRole(parsedUser.role);
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string, type: 'admin' | 'crew') => {
    try {
      const response = await authApi.signIn(email, password, type);
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      setUser(response.user);
      setUserRole(response.user.role);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, storeName: string) => {
    try {
      const response = await authApi.signUp(email, password, storeName, 'admin');
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('auth_user', JSON.stringify(response.user));
      setUser(response.user);
      setUserRole(response.user.role);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, userRole, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
