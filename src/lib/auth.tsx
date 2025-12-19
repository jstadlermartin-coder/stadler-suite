'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from './firebase';

// NUR diese Email-Adresse hat Zugriff
const ALLOWED_EMAIL = 'info@seegasthof-stadler.at';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthorized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupInProgress = useRef(false);

  // Prüfe ob der User autorisiert ist
  const isAuthorized = user?.email === ALLOWED_EMAIL;

  useEffect(() => {
    let isSubscribed = true;

    // Timeout nach 3 Sekunden falls Firebase nicht antwortet
    const timeout = setTimeout(() => {
      if (isSubscribed) {
        console.log('Firebase Auth Timeout - setze loading auf false');
        setLoading(false);
      }
    }, 3000);

    // Check for redirect result on mount
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          if (result.user.email !== ALLOWED_EMAIL) {
            await signOut(auth);
            setError(`Zugriff verweigert. Nur ${ALLOWED_EMAIL} darf sich anmelden.`);
          }
        }
      } catch (err) {
        console.log('No redirect result or error:', err);
      }
    };
    checkRedirectResult();

    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (isSubscribed) {
          clearTimeout(timeout);
          console.log('Auth state changed:', user?.email || 'no user');
          setUser(user);
          setLoading(false);
          setSigningIn(false);
          popupInProgress.current = false;
        }
      }, (err) => {
        if (isSubscribed) {
          clearTimeout(timeout);
          console.error('Auth state error:', err);
          setLoading(false);
          setSigningIn(false);
          popupInProgress.current = false;
          setError('Firebase Auth Fehler: ' + err.message);
        }
      });

      return () => {
        isSubscribed = false;
        clearTimeout(timeout);
        unsubscribe();
      };
    } catch (err) {
      console.error('Firebase init error:', err);
      setLoading(false);
      setError('Firebase konnte nicht initialisiert werden.');
      return () => {
        isSubscribed = false;
        clearTimeout(timeout);
      };
    }
  }, []);

  const signInWithGoogle = async () => {
    // Verhindere mehrfache Popup-Anfragen
    if (popupInProgress.current || signingIn) {
      console.log('Login bereits in Progress - ignoriere');
      return;
    }

    setError(null);
    setSigningIn(true);
    popupInProgress.current = true;

    try {
      const provider = new GoogleAuthProvider();
      // Erzwinge Account-Auswahl bei jedem Login
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      try {
        // Versuche zuerst Popup
        const result = await signInWithPopup(auth, provider);

        // Prüfe ob die Email erlaubt ist
        if (result.user.email !== ALLOWED_EMAIL) {
          // Sofort ausloggen wenn falsche Email
          await signOut(auth);
          setError(`Zugriff verweigert. Nur ${ALLOWED_EMAIL} darf sich anmelden.`);
          return;
        }
      } catch (popupError: unknown) {
        // Bei Popup-Fehlern: Fallback zu Redirect
        const errorCode = (popupError as { code?: string })?.code;
        if (errorCode === 'auth/popup-blocked' ||
            errorCode === 'auth/popup-closed-by-user' ||
            errorCode === 'auth/cancelled-popup-request') {
          console.log('Popup fehlgeschlagen, verwende Redirect...');
          // Redirect-basierte Authentifizierung als Fallback
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupError;
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errorCode = (err as { code?: string })?.code;
      // Ignoriere abgebrochene Popup-Requests
      if (errorCode !== 'auth/cancelled-popup-request') {
        setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
      }
    } finally {
      setSigningIn(false);
      popupInProgress.current = false;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signingIn,
      error,
      signInWithGoogle,
      logout,
      isAuthorized
    }}>
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
