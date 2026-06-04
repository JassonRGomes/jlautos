'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useThemeAuth } from '@/context/ThemeAuthContext';
import { Lock, Mail, User, Phone, ArrowRight, AlertCircle } from 'lucide-react';

const BACKEND_URL =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === 'production' ? '' : '')
  ).replace(/\/$/, '');

export default function Register() {
  const { loginUser } = useThemeAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        name,
        email,
        phone,
        password,
      });

      if (res.data.user && res.data.token) {
        localStorage.setItem('jl_auth_token', res.data.token);
        loginUser(res.data.user);
        window.location.href = '/dashboard';
      } else {
        setError('Registration failed: Invalid response from concierge.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Registration unsuccessful. Please verify input fields and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 bg-card border border-card-border p-8 rounded-2xl shadow-xl transition-colors duration-300 relative overflow-hidden">
        
        {/* Ambient Top Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-accent to-transparent"></div>

        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Create VIP <span className="text-accent">Profile</span>
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            Register to unlock vehicle favorites, and test drive booking calendar.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg flex items-center gap-3 text-sm animate-fade-in">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <User size={18} />
                </div>
                <input
                  id="full-name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-card-border rounded-lg bg-background text-foreground text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  placeholder="Alexander Stone"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Mail size={18} />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-card-border rounded-lg bg-background text-foreground text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone-number" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Phone Number (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Phone size={18} />
                </div>
                <input
                  id="phone-number"
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-card-border rounded-lg bg-background text-foreground text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  placeholder="+1 (415) 555-9080"
                />
              </div>
            </div>

            {/* Security Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Security Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-card-border rounded-lg bg-background text-foreground text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-hover hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="flex items-center gap-2">
                  Complete Registration <ArrowRight size={16} />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="border-t border-card-border pt-6 text-center text-sm text-text-muted">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-accent hover:text-accent-hover transition-colors">
            VIP Sign In
          </Link>
        </div>

      </div>
    </div>
  );
}
