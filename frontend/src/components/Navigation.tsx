'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { getImageUrl } from '../utils/image';
import { Sun, Moon, User as UserIcon, LogOut, Shield, Menu, X } from 'lucide-react';

const Navigation: React.FC = () => {
  const { isDarkMode, toggleTheme, user, logoutUser, settings } = useThemeAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 glassmorphism shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Logo Branding */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center">
              {settings?.logoUrl ? (
                <img
                  src={getImageUrl(settings.logoUrl)}
                  alt="J&L AUTOS"
                  className="h-10 max-w-[200px] object-contain"
                />
              ) : (
                <span className="font-extrabold text-2xl tracking-wider text-foreground">
                  J&L <span className="text-accent">AUTOS</span>
                </span>
              )}
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-sm font-semibold hover:text-accent transition-colors">
              Showroom
            </Link>
            {user && (
              <Link href="/dashboard" className="text-sm font-semibold hover:text-accent transition-colors flex items-center gap-2">
                <UserIcon size={16} /> Dashboard
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link href="/admin" className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors flex items-center gap-2 border border-accent/20 px-3 py-1.5 rounded-full bg-accent/5">
                <Shield size={16} /> Admin CRM
              </Link>
            )}
          </div>

          {/* Right Side Options (Theme Toggle & Auth Actions) */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-foreground/5 text-foreground/80 transition-colors"
              aria-label="Toggle visual theme"
            >
              {isDarkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
            </button>

            {/* Session Action Callouts */}
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-text-muted">
                  Hello, <strong className="text-foreground">{user.name.split(' ')[0]}</strong>
                </span>
                <button
                  onClick={logoutUser}
                  className="flex items-center gap-2 px-4 py-2 border border-foreground/10 hover:border-accent hover:text-accent rounded-md text-sm font-semibold transition-all bg-card"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/login"
                  className="text-sm font-semibold hover:text-accent transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="bg-accent text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-accent/20"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-foreground/5 text-foreground/80 transition-colors"
            >
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-md hover:bg-foreground/5 transition-colors"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-card-border bg-card px-4 pt-4 pb-6 space-y-3 animate-slide-up">
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-base font-semibold hover:text-accent transition-colors"
          >
            Showroom
          </Link>
          {user && (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-base font-semibold hover:text-accent transition-colors"
            >
              My Dashboard
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-base font-semibold text-accent hover:text-accent-hover transition-colors"
            >
              Admin CRM Panel
            </Link>
          )}

          <div className="border-t border-card-border pt-4">
            {user ? (
              <div className="space-y-3">
                <div className="text-sm font-medium text-text-muted">
                  Logged in as <strong className="text-foreground">{user.name}</strong>
                </div>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logoutUser();
                  }}
                  className="w-full flex justify-center items-center gap-2 py-3 border border-foreground/10 hover:border-accent hover:text-accent rounded-md text-sm font-semibold transition-all bg-card"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-2.5 border border-foreground/10 rounded-md text-sm font-semibold"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-2.5 bg-accent text-white rounded-md text-sm font-semibold hover:bg-accent-hover transition-colors"
                >
                  Register Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

    </nav>
  );
};

export default Navigation;
