'use client';

import React, { useState } from 'react';
import { MessageSquareCode, X } from 'lucide-react';
import { useThemeAuth } from '../context/ThemeAuthContext';

const FloatingSmsButton: React.FC = () => {
  const { settings } = useThemeAuth();
  const [showTooltip, setShowTooltip] = useState(false);

  // Extract phone numbers or default to user requested "+12146080670"
  const rawNumber = settings?.whatsappNumber || '12146080670';
  const displayPhone = settings?.phone || '+1 (214) 608-0670';

  // Ensure digits format starts with + for international SMS compatibility
  const smsNumber = rawNumber.startsWith('+') ? rawNumber : `+${rawNumber}`;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 group">
      {/* Dynamic Hover Tooltip Info (Glassmorphism styled) */}
      <div
        className={`px-4 py-2 rounded-lg text-xs font-semibold text-foreground border border-card-border/80 shadow-xl transition-all duration-300 transform backdrop-blur-md bg-zinc-950/80 ${
          showTooltip 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-2 scale-95 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'
        }`}
      >
        <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-0.5">Concierge SMS Desk</p>
        <p className="font-mono text-foreground/90">{displayPhone}</p>
      </div>

      {/* Floating Action Button with Luxury Glowing & Breathing Pulse */}
      <a
        href={`sms:${smsNumber}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Send an SMS inquiry to J&L Autos"
        className="relative flex items-center justify-center h-14 w-14 rounded-full bg-zinc-950/80 text-accent border border-white/10 hover:border-accent hover:bg-zinc-900/90 shadow-2xl hover:shadow-accent/30 transition-all duration-300 transform active:scale-95 group"
      >
        {/* Luxury Glowing Aura */}
        <span className="absolute -inset-0.5 rounded-full bg-accent/20 blur opacity-40 group-hover:opacity-70 group-hover:animate-pulse transition-opacity"></span>
        
        {/* Subtle continuous breeding pulse indicator */}
        <span className="absolute inline-flex h-3 w-3 rounded-full bg-accent opacity-75 -top-0.5 -right-0.5 animate-ping"></span>
        <span className="absolute inline-flex rounded-full h-2 w-2 bg-accent -top-0.5 -right-0.5"></span>

        <MessageSquareCode size={24} className="relative z-10 group-hover:scale-110 transition-transform" />
      </a>
    </div>
  );
};

export default FloatingSmsButton;
