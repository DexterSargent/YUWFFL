"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  bypassLogin: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  bypassLogin: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isDevAdmin, setIsDevAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login Error:", error);
      if (typeof window !== "undefined" && window.location.hostname === "localhost") {
        if (confirm(`Firebase Auth failed:\n${error.message}\n\nWould you like to bypass login and sign in as a Developer Admin (localhost only)?`)) {
          setIsDevAdmin(true);
          setLoading(false);
        }
      } else {
        alert(`Login failed: ${error.message}`);
      }
    }
  };

  const logout = async () => {
    setIsDevAdmin(false);
    await signOut(auth);
  };

  const bypassLogin = () => {
    setIsDevAdmin(true);
  };

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  const isAdmin = isDevAdmin || (user && user.email ? adminEmails.includes(user.email.toLowerCase()) : false);

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout, bypassLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
