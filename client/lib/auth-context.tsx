"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "./api";
import { User } from "./type";

const STORAGE_KEY = "streamly:user";

type AuthContextValue = {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored =
        typeof window !== "undefined"
          ? localStorage.getItem(STORAGE_KEY)
          : null;
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        setUserState(parsed);
      }
    } catch (error) {
      console.warn("Failed to restore auth state", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const setUser = useCallback((value: User | null) => {
    setUserState(value);
    if (typeof window === "undefined") return;

    if (value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (user) {
        await api.logout(user.user_id);
      }
    } catch (error) {
      console.warn("Failed to logout", error);
    } finally {
      setUser(null);
    }
  }, [user, setUser]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, setUser, logout, loading }),
    [user, setUser, logout, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
