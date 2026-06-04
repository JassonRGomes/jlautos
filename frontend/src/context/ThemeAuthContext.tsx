'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Ensure cookie requests are always sent
axios.defaults.withCredentials = true;

const BACKEND_URL = (process.env.NEXT_PUBLIC_BACKEND_URL || (process.env.NODE_ENV === 'production' ? '' : '')).replace(/\/$/, '');

export const TOKEN_KEY = 'jl_auth_token';

// Inject saved token into every axios request as Authorization header
// This makes auth work across origins even when cookies are blocked (http↔https cross-origin)
axios.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (token && !config.headers['Authorization']) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  image?: string | null;
  role: 'CUSTOMER' | 'ADMIN';
}

interface DealershipSettings {
  address: string;
  phone: string;
  whatsappNumber: string;
  operatingHours: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  logoUrl?: string | null;
}

interface ThemeAuthContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
  user: User | null;
  loadingAuth: boolean;
  loginUser: (user: User) => void;
  logoutUser: () => Promise<void>;
  settings: DealershipSettings | null;
  loadProfile: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

const ThemeAuthContext = createContext<ThemeAuthContextType | undefined>(undefined);

export const ThemeAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to Dark Luxury theme
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [settings, setSettings] = useState<DealershipSettings | null>(null);

  // 0. Auto-Cache Clearing Routine
  useEffect(() => {
    const APP_VERSION = '1.0.1'; // Increment this string to force a cache clear on all clients
    const currentVersion = localStorage.getItem('jl_app_version');
    
    if (currentVersion !== APP_VERSION) {
      console.log('New system version detected! Purging browser caches...');
      
      // Clear HTTP/ServiceWorker Caches
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach(name => caches.delete(name));
        });
      }

      // Protect critical tokens
      const token = localStorage.getItem(TOKEN_KEY);
      const theme = localStorage.getItem('theme');
      
      // Erase local and session storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Restore critical tokens
      if (token) localStorage.setItem(TOKEN_KEY, token);
      if (theme) localStorage.setItem('theme', theme);
      
      // Save new version to prevent loop
      localStorage.setItem('jl_app_version', APP_VERSION);
      
      // Force a hard reload from the server (bypassing local cache)
      window.location.reload();
    }
  }, []);

  // 1. Theme handler
  useEffect(() => {
    // Check local storage or system preferences
    const storedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const darkActive = storedTheme === 'dark' || (!storedTheme && systemPrefersDark);
    setIsDarkMode(darkActive);
    
    if (darkActive) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode-forced');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.classList.add('light-mode-forced');
    }
  }, []);

  const toggleTheme = () => {
    const nextDarkState = !isDarkMode;
    setIsDarkMode(nextDarkState);
    localStorage.setItem('theme', nextDarkState ? 'dark' : 'light');
    
    if (nextDarkState) {
      document.documentElement.classList.add('dark-mode');
      document.documentElement.classList.remove('light-mode-forced');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.documentElement.classList.add('light-mode-forced');
    }
  };

  // 2. Fetch authenticated profile
  const loadProfile = async () => {
    try {
      setLoadingAuth(true);
      const res = await axios.get(`${BACKEND_URL}/api/auth/profile`);
      if (res.data && res.data.user) {
        if (res.data.token) {
          localStorage.setItem(TOKEN_KEY, res.data.token);
        }
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  };

  // 3. Load global settings
  const loadSettings = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/settings`);
      if (res.data.settings) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.error('Failed to load dealership metadata:', err);
    }
  };

  useEffect(() => {
    loadProfile();
    loadSettings();
  }, []);

  const loginUser = (userData: User) => {
    setUser(userData);
  };

  const logoutUser = async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`);
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      window.location.href = '/';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <ThemeAuthContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        user,
        loadingAuth,
        loginUser,
        logoutUser,
        settings,
        loadProfile,
        loadSettings,
      }}
    >
      {children}
    </ThemeAuthContext.Provider>
  );
};

export const useThemeAuth = () => {
  const context = useContext(ThemeAuthContext);
  if (!context) {
    throw new Error('useThemeAuth must be wrapped inside a ThemeAuthProvider.');
  }
  return context;
};
