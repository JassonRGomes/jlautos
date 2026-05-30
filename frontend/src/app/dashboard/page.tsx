'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import axios from 'axios';
import { useThemeAuth } from '@/context/ThemeAuthContext';
import { getImageUrl } from '@/utils/image';
import {
  Heart,
  Bookmark,
  Calendar,
  DollarSign,
  User,
  ArrowRight,
  Trash2,
  ExternalLink,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Sliders,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

const BACKEND_URL =
  (process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001')
  ).replace(/\/$/, '');

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  price: number;
  transmission: string;
  bodyStyle: string;
  images: string[];
  status: 'ON_SALE' | 'RESERVED' | 'SOLD';
}

interface SavedSearch {
  id: string;
  name: string;
  queryParams: {
    make?: string;
    bodyStyle?: string;
    maxPrice?: string;
    transmission?: string;
    mileage?: string;
  };
  createdAt: string;
}

interface Booking {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: string;
}

interface Offer {
  id: string;
  vehicleId: string;
  vehicle: Vehicle;
  offerAmount: number;
  status: 'UNDER_REVIEW' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

type TabType = 'wishlist' | 'searches' | 'bookings' | 'offers';

function CustomerDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { user, loadingAuth } = useThemeAuth();

  // Read initial tab from URL query param (e.g. /dashboard?tab=bookings)
  const tabParam = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(tabParam && ['wishlist','searches','bookings','offers'].includes(tabParam) ? tabParam : 'wishlist');

  // Sync tab when URL param changes (e.g. after router.push)
  useEffect(() => {
    const t = searchParams.get('tab') as TabType | null;
    if (t && ['wishlist', 'searches', 'bookings', 'offers'].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);
  const [favorites, setFavorites] = useState<Vehicle[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  // Page loading & errors
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Fetch all dashboard pipelines
  const fetchDashboardData = async (silent = false) => {
    if (!user) return;
    try {
      if (!silent) setLoadingData(true);
      setErrorMsg('');

      const ts = Date.now();
      // A. Fetch Favorites
      const favRes = await axios.get(`${BACKEND_URL}/api/vehicles/favorites?_t=${ts}`);
      if (favRes.data && favRes.data.vehicles) {
        setFavorites(favRes.data.vehicles);
      }

      // B. Fetch Saved Searches
      const searchRes = await axios.get(`${BACKEND_URL}/api/vehicles/saved-searches?_t=${ts}`);
      if (searchRes.data && searchRes.data.saved) {
        setSavedSearches(searchRes.data.saved);
      }

      // C. Fetch Bookings
      const bookingRes = await axios.get(`${BACKEND_URL}/api/bookings/my?_t=${ts}`);
      if (bookingRes.data && bookingRes.data.data) {
        const parsed = bookingRes.data.data.map((b: any) => {
          let imgs = [];
          if (b.vehicle && typeof b.vehicle.images === 'string') {
            try { imgs = JSON.parse(b.vehicle.images); } catch (e) { imgs = [b.vehicle.images]; }
          } else if (b.vehicle && b.vehicle.images) { 
            imgs = b.vehicle.images; 
          }
          
          let eventType = 'VISIT';
          if (b.notes && b.notes.includes('Event type: TEST_DRIVE')) {
            eventType = 'TEST_DRIVE';
          }
          
          return { 
            ...b, 
            date: b.bookingDate, 
            timeSlot: b.bookingTime,
            eventType: eventType,
            status: b.status ? b.status.toUpperCase() : 'PENDING',
            vehicle: { ...b.vehicle, images: imgs } 
          };
        });
        setBookings(parsed);
      }

      // D. Fetch Offers
      const offerRes = await axios.get(`${BACKEND_URL}/api/offers/my?_t=${ts}`);
      if (offerRes.data && offerRes.data.data) {
        const parsedOffers = offerRes.data.data.map((o: any) => {
          let imgs = [];
          if (o.vehicle && typeof o.vehicle.images === 'string') {
            try { imgs = JSON.parse(o.vehicle.images); } catch (e) { imgs = [o.vehicle.images]; }
          } else if (o.vehicle && o.vehicle.images) { 
            imgs = o.vehicle.images; 
          }
          return { ...o, vehicle: { ...o.vehicle, images: imgs } };
        });
        setOffers(parsedOffers);
      }

    } catch (err: any) {
      console.error('Failed to load dashboard statistics:', err);
      setErrorMsg('Failed to sync latest concierge logs.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, loadingAuth, searchParams, pathname]);

  // 2. Remove bookmark search
  const handleDeleteSearch = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axios.delete(`${BACKEND_URL}/api/vehicles/saved-searches/${id}`);
      setSavedSearches((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to clear filter search:', err);
    }
  };

  // 3. Apply Saved filters and route back to showroom
  const handleApplySearch = (queryParams: any) => {
    const params = new URLSearchParams();
    if (queryParams.make) params.append('make', queryParams.make);
    if (queryParams.bodyStyle) params.append('bodyStyle', queryParams.bodyStyle);
    if (queryParams.transmission) params.append('transmission', queryParams.transmission);
    if (queryParams.maxPrice) params.append('priceMax', queryParams.maxPrice);
    
    router.push(`/?${params.toString()}`);
  };

  // 4. Remove favorite from details page trigger
  const handleRemoveFavorite = async (vehicleId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axios.post(`${BACKEND_URL}/api/vehicles/${vehicleId}/favorite`);
      setFavorites((prev) => prev.filter((v) => v.id !== vehicleId));
    } catch (err) {
      console.error('Failed to untag favorite:', err);
    }
  };

  const handleDeleteBooking = async (bookingId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/bookings/${bookingId}`);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch (err) {
      console.error('Failed to cancel booking:', err);
      alert('Failed to cancel the booking. Please try again.');
    }
  };

  const handleDeleteOffer = async (offerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to cancel this proposal?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/api/offers/${offerId}`);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (err) {
      console.error('Failed to cancel proposal:', err);
      alert('Failed to cancel the proposal. Please try again.');
    }
  };

  if (loadingAuth || (!user && !loadingAuth)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin text-accent mx-auto" size={42} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Authenticating credentials...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* SECTION 1: HIGH-END WELCOME BRIEF */}
        <header className="mb-10 bg-card border border-card-border p-6 sm:p-8 rounded-xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-accent/15 rounded-full flex items-center justify-center border border-accent/20">
              <User size={32} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground font-display">
                  {user?.name}
                </h1>
                <span className="px-2.5 py-0.5 text-[9px] font-extrabold bg-accent text-white tracking-widest uppercase rounded">
                  VIP Club
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 uppercase font-semibold tracking-wider">
                Showroom Concierge Registry: {user?.email} &bull; Registry Role: {user?.role}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 lg:w-auto w-full justify-between lg:justify-end">
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-3 gap-6 text-center divide-x divide-card-border/80 w-full sm:w-auto">
              <div className="px-2">
                <span className="text-xl sm:text-2xl font-black text-foreground block">{favorites.length}</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mt-0.5">Favorites</span>
              </div>
              <div className="px-2 sm:px-6">
                <span className="text-xl sm:text-2xl font-black text-foreground block">{bookings.length}</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mt-0.5">VIP Bookings</span>
              </div>
              <div className="px-2 sm:px-6">
                <span className="text-xl sm:text-2xl font-black text-foreground block">{offers.length}</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mt-0.5">Offers</span>
              </div>
            </div>

            {/* Dashboard Quick Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-card-border/50">
              <Link
                href="/profile"
                className="flex items-center gap-2 bg-card hover:bg-foreground/5 border border-card-border text-foreground px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <User size={14} /> Profile
              </Link>
              <button
                onClick={() => fetchDashboardData()}
                className="flex items-center gap-2 bg-card hover:bg-foreground/5 border border-card-border text-foreground px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} /> Sync Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* SECTION 2: DYNAMIC TABS PANEL BAR */}
        <div className="flex overflow-x-auto border-b border-card-border mb-6 no-scrollbar">
          <button
            onClick={() => { setActiveTab('wishlist'); fetchDashboardData(true); }}
            className={`py-4 px-1 mr-8 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'wishlist'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <Heart size={15} className={activeTab === 'wishlist' ? 'fill-current' : ''} />
            <span>Wishlist Collection ({favorites.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('searches'); fetchDashboardData(true); }}
            className={`py-4 px-1 mr-8 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'searches'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <Bookmark size={15} />
            <span>Saved Search Queries ({savedSearches.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('bookings'); fetchDashboardData(true); }}
            className={`py-4 px-1 mr-8 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'bookings'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <Calendar size={15} />
            <span>Bookings Timeline ({bookings.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('offers'); fetchDashboardData(true); }}
            className={`py-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'offers'
                ? 'border-accent text-accent'
                : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <DollarSign size={15} />
            <span>Proposals Pipeline ({offers.length})</span>
          </button>
        </div>

        {/* SECTION 3: TAB CONTAINER BODY */}
        {loadingData ? (
          <div className="flex justify-center items-center py-24 bg-card border border-card-border rounded-xl">
            <RefreshCw size={32} className="animate-spin text-accent" />
          </div>
        ) : errorMsg ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-xl text-center flex flex-col items-center gap-3">
            <AlertTriangle size={32} />
            <h3 className="font-bold text-sm uppercase">{errorMsg}</h3>
            <button
              onClick={() => fetchDashboardData()}
              className="bg-red-500 text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider"
            >
              Retry Sync
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* TAB A: WISHLIST GRIDS */}
            {activeTab === 'wishlist' && (
              <div>
                {favorites.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.map((vehicle) => {
                      const img = getImageUrl(vehicle.images[0], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=400');
                      return (
                        <div
                          key={vehicle.id}
                          className="bg-card border border-card-border rounded-lg overflow-hidden flex flex-col justify-between shadow-sm group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('button') || target.closest('a')) return;
                            router.push(`/details?id=${vehicle.id}`);
                          }}
                        >
                          <Link href={`/details?id=${vehicle.id}`} className="relative aspect-video block bg-zinc-950 overflow-hidden">
                            <Image
                              src={img}
                              alt={`${vehicle.make} ${vehicle.model}`}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            
                            <div className="absolute top-3 left-3 bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-widest border border-white/10">
                              {vehicle.year}
                            </div>
                          </Link>

                          <div className="p-5 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-1">
                                <h3 className="font-bold text-base uppercase text-foreground truncate">
                                  {vehicle.make} <span className="font-normal text-text-muted">{vehicle.model}</span>
                                </h3>
                                <span className="font-mono text-sm font-black text-foreground">
                                  ${Number(vehicle.price).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[10px] text-text-muted uppercase font-semibold">
                                Gearbox: {vehicle.transmission} &bull; Silhouette: {vehicle.bodyStyle}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-4 mt-4 border-t border-card-border">
                              <Link
                                href={`/details?id=${vehicle.id}`}
                                className="flex-grow bg-accent hover:bg-accent-hover text-white text-center py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
                              >
                                View Details
                              </Link>
                              
                              <button
                                onClick={(e) => handleRemoveFavorite(vehicle.id, e)}
                                className="p-2 border border-card-border hover:border-red-500 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded transition-colors"
                                title="Remove bookmark favorite"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                    <Heart size={40} className="mx-auto text-text-muted mb-4 opacity-40" />
                    <h3 className="font-bold uppercase tracking-wider text-foreground text-sm">Wishlist Empty</h3>
                    <p className="text-xs text-text-muted max-w-xs mx-auto mt-1 leading-relaxed">
                      Sync bookmarks directly from our digital showroom card feed to keep track of curated motorcars.
                    </p>
                    <Link
                      href="/"
                      className="inline-block mt-4 bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors"
                    >
                      Browse Showroom
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* TAB B: SAVED SEARCH FILTERS */}
            {activeTab === 'searches' && (
              <div>
                {savedSearches.length > 0 ? (
                  <div className="space-y-4">
                    {savedSearches.map((search) => (
                      <div
                        key={search.id}
                        className="bg-card border border-card-border p-5 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm uppercase text-foreground flex items-center gap-2">
                            <Bookmark size={14} className="text-accent" />
                            <span>{search.name || 'Custom Saved Parameters'}</span>
                          </h3>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {Object.entries(search.queryParams).map(([key, val]) => {
                              if (!val) return null;
                              return (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 bg-background border border-card-border text-[9px] font-bold text-text-muted uppercase rounded"
                                >
                                  {key}: <strong className="text-foreground">{String(val)}</strong>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleApplySearch(search.queryParams)}
                            className="bg-accent hover:bg-accent-hover text-white px-5 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                          >
                            <Search size={12} /> Apply Search
                          </button>
                          
                          <button
                            onClick={(e) => handleDeleteSearch(search.id, e)}
                            className="p-2 border border-card-border hover:border-red-500 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded transition-colors"
                            title="Delete Saved Filter"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                    <Bookmark size={40} className="mx-auto text-text-muted mb-4 opacity-40" />
                    <h3 className="font-bold uppercase tracking-wider text-foreground text-sm">No Saved Filters</h3>
                    <p className="text-xs text-text-muted max-w-xs mx-auto mt-1 leading-relaxed">
                      Save configurations of brand, price limits, and gearbox targets to load them instantly later.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB C: BOOKINGS TIMELINE (Redesigned for Auto-Sync) */}
            {activeTab === 'bookings' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {user?.role === 'ADMIN' && bookings.length > 0 && (
                  <div className="mb-4 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <CheckCircle2 size={12} /> Global Database Sync Active
                  </div>
                )}
                
                {bookings.length > 0 ? (
                  <div className="relative border-l-2 border-card-border/60 ml-4 space-y-6 py-2">
                    {bookings.map((booking) => {
                      const img = booking.vehicle?.images?.[0] ? getImageUrl(booking.vehicle.images[0], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=200') : 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=200';
                      return (
                        <div key={booking.id} className="relative pl-8 group">
                          
                          {/* Sync Dot indicator */}
                          <div className={`absolute -left-[9px] top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-4 bg-background transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                            booking.status === 'confirmed' ? 'border-emerald-500' :
                            booking.status === 'cancelled' ? 'border-red-500' :
                            'border-blue-500'
                          }`} />

                          <div className="bg-card hover:bg-card-hover border border-card-border p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-300 shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-5">
                              <div className="relative w-20 h-14 flex-shrink-0 rounded-md overflow-hidden bg-zinc-950 border border-card-border shadow-inner">
                                <Image
                                  src={img}
                                  alt={booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'Vehicle Deleted'}
                                  fill
                                  sizes="80px"
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              </div>
                              <div>
                                <h4 className="font-black text-base uppercase text-foreground tracking-tight">
                                  {booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : <span className="text-red-500">Vehicle Deleted</span>}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-text-muted mt-1.5 font-medium">
                                  <span className="flex items-center gap-1.5 bg-background px-2 py-1 rounded border border-card-border">
                                    <Calendar size={12} className="text-accent" />
                                    {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                                      weekday: 'short', month: 'short', day: 'numeric',
                                    })}
                                  </span>
                                  <span className="flex items-center gap-1.5 bg-background px-2 py-1 rounded border border-card-border">
                                    <Clock size={12} className="text-zinc-400" />
                                    {booking.bookingTime}
                                  </span>
                                  <span className="font-bold text-accent uppercase tracking-widest text-[9px] bg-accent/10 px-2 py-1 border border-accent/20 rounded">
                                    {booking.notes?.includes('TEST_DRIVE') ? 'VIP Test Drive' : 'Private View'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-card-border/50">
                              <div>
                                {booking.status === 'pending' && (
                                  <span className="px-4 py-1.5 text-[10px] font-black tracking-widest bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md shadow-sm">
                                    PENDING SYNC
                                  </span>
                                )}
                                {booking.status === 'confirmed' && (
                                  <span className="px-4 py-1.5 text-[10px] font-black tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md shadow-sm">
                                    CONFIRMED VIP
                                  </span>
                                )}
                                {booking.status === 'cancelled' && (
                                  <span className="px-3.5 py-1 text-[9px] font-bold tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 rounded">
                                    CANCELLED
                                  </span>
                                )}
                              </div>
                              <Link
                                href={`/details?id=${booking.vehicleId}`}
                                className="text-xs text-accent hover:text-accent-hover font-bold uppercase tracking-wider flex items-center gap-1"
                              >
                                View Car <ChevronRight size={14} />
                              </Link>
                              <button
                                onClick={(e) => handleDeleteBooking(booking.id, e)}
                                className="p-2 border border-card-border hover:border-red-500 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded transition-colors ml-2"
                                title="Cancel Booking"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                    <Calendar size={40} className="mx-auto text-text-muted mb-4 opacity-40" />
                    <h3 className="font-bold uppercase tracking-wider text-foreground text-sm">No Appointments</h3>
                    <p className="text-xs text-text-muted max-w-xs mx-auto mt-1 leading-relaxed">
                      Schedule a Private Showing or VIP Test Drive directly from any luxury listing card details screen.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB D: PROPOSALS PIPELINE */}
            {activeTab === 'offers' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {user?.role === 'ADMIN' && offers.length > 0 && (
                  <div className="mb-4 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <CheckCircle2 size={12} /> Global Database Sync Active
                  </div>
                )}

                {offers.length > 0 ? (
                  <div className="relative border-l-2 border-card-border/60 ml-4 space-y-6 py-2">
                    {offers.map((offer) => {
                      const img = offer.vehicle?.images?.[0] ? getImageUrl(offer.vehicle.images[0], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=200') : 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=200';
                      return (
                        <div key={offer.id} className="relative pl-8 group">
                          
                          {/* Sync Dot indicator */}
                          <div className={`absolute -left-[9px] top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-4 bg-background transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                            offer.status === 'ACCEPTED' ? 'border-emerald-500' :
                            offer.status === 'DECLINED' ? 'border-red-500' :
                            'border-amber-500'
                          }`} />

                          <div className="bg-card hover:bg-card-hover border border-card-border p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all duration-300 shadow-sm hover:shadow-md">
                            <div className="flex items-center gap-5">
                              <div className="relative w-20 h-14 flex-shrink-0 rounded-md overflow-hidden bg-zinc-950 border border-card-border shadow-inner">
                                <Image
                                  src={img}
                                  alt={offer.vehicle ? `${offer.vehicle.make} ${offer.vehicle.model}` : 'Vehicle Deleted'}
                                  fill
                                  sizes="80px"
                                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                              </div>
                              <div>
                                <h4 className="font-black text-base uppercase text-foreground tracking-tight">
                                  {offer.vehicle ? `${offer.vehicle.make} ${offer.vehicle.model}` : <span className="text-red-500">Vehicle Deleted</span>}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-text-muted mt-1.5 font-medium">
                                  <span className="flex items-center gap-1.5 bg-background px-2 py-1 rounded border border-card-border">
                                    <Calendar size={12} className="text-accent" />
                                    {new Date(offer.createdAt).toLocaleDateString('en-US', {
                                      weekday: 'short', month: 'short', day: 'numeric'
                                    })}
                                  </span>
                                  <span className="font-bold text-accent uppercase tracking-widest text-[10px] bg-accent/10 px-2 py-1 border border-accent/20 rounded">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(offer.offerAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-card-border/50">
                              <div>
                                {offer.status === 'UNDER_REVIEW' && (
                                  <span className="px-4 py-1.5 text-[10px] font-black tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md shadow-sm">
                                    SYNC REVIEW
                                  </span>
                                )}
                                {offer.status === 'ACCEPTED' && (
                                  <span className="px-4 py-1.5 text-[10px] font-black tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md shadow-sm">
                                    PROPOSAL ACCEPTED & RESERVED
                                  </span>
                                )}
                                {offer.status === 'DECLINED' && (
                                  <span className="px-4 py-1.5 text-[10px] font-black tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 rounded-md shadow-sm">
                                    PROPOSAL DECLINED
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/details?id=${offer.vehicleId}`}
                                  className="h-8 w-8 flex items-center justify-center bg-card hover:bg-foreground/5 border border-card-border rounded transition-colors text-text-muted hover:text-foreground"
                                  title="View Vehicle"
                                >
                                  <ArrowRight size={16} />
                                </Link>
                                <button
                                  onClick={(e) => handleDeleteOffer(offer.id, e)}
                                  className="h-8 w-8 flex items-center justify-center bg-card hover:bg-red-500/10 border border-card-border hover:border-red-500/30 rounded transition-colors text-text-muted hover:text-red-500"
                                  title="Withdraw Proposal"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-card border border-card-border rounded-xl">
                    <Calendar size={40} className="mx-auto text-text-muted mb-4 opacity-40" />
                    <h3 className="font-bold uppercase tracking-wider text-foreground text-sm">No Proposals Submitted</h3>
                    <p className="text-xs text-text-muted max-w-xs mx-auto mt-1 leading-relaxed">
                      Make an acquisition proposal directly from any active luxury vehicle listing.
                    </p>
                  </div>
                )}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin text-accent mx-auto" size={42} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Loading Dashboard...</h2>
        </div>
      </div>
    }>
      <CustomerDashboardInner />
    </Suspense>
  );
}
