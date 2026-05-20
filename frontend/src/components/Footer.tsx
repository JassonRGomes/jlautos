'use client';

import React from 'react';
import Link from 'next/link';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { getImageUrl } from '@/utils/image';
import { MapPin, Phone, MessageCircle, Clock, ExternalLink } from 'lucide-react';

const Footer: React.FC = () => {
  const { settings } = useThemeAuth();

  // Settings defaults if API has not fetched
  const address = settings?.address || '100 Premium Way, Suite 400, Beverly Hills, CA 90210';
  const phone = settings?.phone || '+1 (214) 608-0670';
  const whatsappNumber = settings?.whatsappNumber || '12146080670';
  const operatingHours = settings?.operatingHours || {
    weekdays: '9:00 AM - 6:00 PM',
    saturday: '10:00 AM - 5:00 PM',
    sunday: 'Closed',
  };

  return (
    <footer className="border-t border-card-border bg-card text-foreground transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Section 1: Branding and Brief description */}
          <div className="space-y-4 md:col-span-1 flex flex-col items-center">
            {settings?.logoUrl ? (
              <img
                src={getImageUrl(settings.logoUrl)}
                alt="J&L AUTOS"
                className="h-10 w-[100px] object-cover"
              />
            ) : (
              <span className="font-extrabold text-2xl tracking-wider">
                J&L <span className="text-accent">AUTOS</span>
              </span>
            )}
            <p className="text-sm text-text-muted leading-relaxed">
              Redefining automotive excellence through curated performance and uncompromising precision. Enter an exclusive digital showroom designed for discerning collectors and enthusiasts who demand nothing beyond the exceptional
            </p>
          </div>

          {/* Section 2: Contact Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-widest text-accent">Concierge Desk</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin size={16} className="text-text-muted flex-shrink-0 mt-0.5" />
                <span className="text-text-muted">{address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="text-text-muted flex-shrink-0" />
                <span className="text-text-muted">{phone}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle size={16} className="text-text-muted flex-shrink-0" />
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-accent font-medium flex items-center gap-1 transition-colors text-text-muted"
                >
                  Chat WhatsApp <ExternalLink size={12} />
                </a>
              </li>
            </ul>
          </div>

          {/* Section 3: Operational Hours */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-widest text-accent">Operating Hours</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-text-muted">
                <Clock size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Monday - Friday:</div>
                  <div>{operatingHours.weekdays}</div>
                </div>
              </li>
              <li className="flex items-start gap-2.5 text-text-muted">
                <Clock size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Saturday:</div>
                  <div>{operatingHours.saturday}</div>
                </div>
              </li>
              <li className="flex items-start gap-2.5 text-text-muted">
                <Clock size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Sunday:</div>
                  <div>{operatingHours.sunday}</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Section 4: Customer Portal routes */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-widest text-accent">Explore Showroom</h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Digital Inventory Feed
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-accent transition-colors">
                  Customer Dashboard
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-accent transition-colors">
                  VIP Portals Login
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-accent transition-colors">
                  Protected Management
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Legal Row */}
        <div className="border-t border-card-border mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-text-muted">
          <p>&copy; 2026 J&L Autos Luxury Showroom Portal. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/" className="hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-accent transition-colors">
              Bespoke Service Terms
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
