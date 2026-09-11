import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signInWithEmail: async () => {},
  registerWithEmail: async () => null,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('El usuario cerró la ventana de inicio de sesión antes de completar el proceso.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        console.log('Se canceló la solicitud de inicio de sesión debido a múltiples clics.');
      } else if (error.code === 'auth/configuration-not-found') {
        alert('Error: El inicio de sesión con Google no está habilitado en tu proyecto de Firebase.\n\nPor favor ve a la consola de Firebase -> Authentication -> Sign-in method y habilita "Google".');
        console.error('Error al iniciar sesión con Google:', error);
      } else {
        alert(`Error al iniciar sesión: ${error.message}`);
        console.error('Error al iniciar sesión con Google:', error);
      }
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Error al iniciar sesión con correo:', error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        return userCred.user;
      } catch (error: any) {
        console.error('Error al registrar con correo:', error);
        throw error;
      }
  }

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signInWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
