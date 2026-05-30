'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { getImageUrl } from '@/utils/image';
import { useThemeAuth } from '../context/ThemeAuthContext';
import { useRouter } from 'next/navigation';
import {
  Search,
  Heart,
  ThumbsUp,
  Share2,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Bookmark,
  X,
  Copy,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

const API_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ||
  'http://localhost:5001';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  mileage: number;
  price: number;
  transmission: string;
  engine: string;
  fuelType: string;
  bodyStyle: string;
  seats: number;
  doors: number;
  description: string;
  status: 'ON_SALE' | 'RESERVED' | 'SOLD';
  images: string[];
  isFinanceWarrantyActive: boolean;
}

export default function Home() {
  const { user } = useThemeAuth();
  const router = useRouter();
  
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // State Management
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Carousel State
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroVehicles, setHeroVehicles] = useState<Vehicle[]>([]);
  const slideInterval = useRef<NodeJS.Timeout | null>(null);

  // Favorites Cache (local ID list for instant response)
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  
  // Interactive Local Likes Cache
  const [likedVehicles, setLikedVehicles] = useState<{ [id: string]: { count: number; userLiked: boolean } }>({});

  // Active Search/Filter Console States
  const [makeFilter, setMakeFilter] = useState('');
  const [bodyStyleFilter, setBodyStyleFilter] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [transmissionFilter, setTransmissionFilter] = useState('');
  const [mileageFilter, setMileageFilter] = useState('');
  
  // Custom Saved Search UI State
  const [saveSearchOpen, setSaveSearchOpen] = useState(false);
  const [savedSearchName, setSavedSearchName] = useState('');
  const [saveSearchSuccess, setSaveSearchSuccess] = useState('');

  // Share Modal / Drawer States
  const [activeShareVehicle, setActiveShareVehicle] = useState<Vehicle | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // 1. Fetch Showroom Vehicles with Active Filters
  const fetchVehicles = async (query = '') => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/vehicles${query}`);
      if (res.data && res.data.vehicles) {
        setVehicles(res.data.vehicles);
        
        // Pick top ON_SALE premium vehicles for the flagship slider
        const onSale = res.data.vehicles.filter((v: Vehicle) => v.status === 'ON_SALE');
        setHeroVehicles(onSale.slice(0, 3));
      }
    } catch (err: any) {
      console.error('Failed to load vehicles:', err);
      setError('Could not retrieve showroom inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch User's Favorites for bookmarks sync
  const fetchUserFavorites = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/api/vehicles/favorites`);
      if (res.data && res.data.vehicles) {
        setUserFavorites(res.data.vehicles.map((v: Vehicle) => v.id));
      }
    } catch (err) {
      console.error('Failed to fetch user favorites:', err);
    }
  };

  // Init fetch
  useEffect(() => {
    fetchVehicles();
  }, []);

  // Fetch favorites when user auth state triggers active
  useEffect(() => {
    fetchUserFavorites();
  }, [user]);

  // 3. Carousel Slider Cycle Management
  function stopSlideShow() {
    if (slideInterval.current) {
      clearInterval(slideInterval.current);
    }
  }

  function startSlideShow() {
    stopSlideShow();
    if (heroVehicles.length > 1) {
      slideInterval.current = setInterval(() => {
        setActiveSlide((prev) => (prev + 1) % heroVehicles.length);
      }, 6000);
    }
  }

  useEffect(() => {
    startSlideShow();
    return () => stopSlideShow();
  }, [heroVehicles]); // eslint-disable-line react-hooks/exhaustive-deps


  const handlePrevSlide = () => {
    stopSlideShow();
    setActiveSlide((prev) => (prev === 0 ? heroVehicles.length - 1 : prev - 1));
    startSlideShow();
  };

  const handleNextSlide = () => {
    stopSlideShow();
    setActiveSlide((prev) => (prev + 1) % heroVehicles.length);
    startSlideShow();
  };

  // 4. Advanced Multi-Filter execution trigger
  const handleApplyFilters = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const params = new URLSearchParams();
    if (makeFilter) params.append('make', makeFilter);
    if (bodyStyleFilter) params.append('bodyStyle', bodyStyleFilter);
    if (transmissionFilter) params.append('transmission', transmissionFilter);
    if (maxPrice) params.append('priceMax', maxPrice); // Filter handles this client-side or we can just filter vehicles in state
    
    const query = params.toString() ? `?${params.toString()}` : '';
    fetchVehicles(query);
  };

  const handleResetFilters = () => {
    setMakeFilter('');
    setBodyStyleFilter('');
    setMaxPrice('');
    setTransmissionFilter('');
    setMileageFilter('');
    fetchVehicles();
  };

  // 5. Client-Side Filtering for maxPrice and mileage targets that aren't strictly custom parsed by basic backend index.ts route
  const filteredInventory = vehicles.filter((vehicle) => {
    if (maxPrice && Number(vehicle.price) > Number(maxPrice)) return false;
    if (mileageFilter && Number(vehicle.mileage) > Number(mileageFilter)) return false;
    return true;
  });

  // 6. Save Search Routine
  const handleSaveSearch = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!savedSearchName.trim()) return;

    try {
      const queryParams = {
        make: makeFilter || undefined,
        bodyStyle: bodyStyleFilter || undefined,
        maxPrice: maxPrice || undefined,
        transmission: transmissionFilter || undefined,
        mileage: mileageFilter || undefined,
      };

      await axios.post(`${API_URL}/api/vehicles/saved-searches`, {
        name: savedSearchName,
        queryParams,
      });

      setSaveSearchSuccess('Your showroom search filters have been bookmarked.');
      setSavedSearchName('');
      setTimeout(() => {
        setSaveSearchSuccess('');
        setSaveSearchOpen(false);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to save search:', err);
    }
  };

  // 7. Toggle Bookmark Favorite status
  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/api/vehicles/${id}/favorite`);
      const isFavorite = res.data.isFavorite;
      
      setUserFavorites((prev) =>
        isFavorite ? [...prev, id] : prev.filter((favId) => favId !== id)
      );
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
    }
  };

  // 8. Handle Interactive Thumbs Up Like increment
  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLikedVehicles((prev) => {
      const current = prev[id] || { count: Math.floor(Math.random() * 40) + 10, userLiked: false };
      
      return {
        ...prev,
        [id]: {
          count: current.userLiked ? current.count - 1 : current.count + 1,
          userLiked: !current.userLiked,
        },
      };
    });
  };

  // 9. Share Drawer controls
  const handleOpenShare = (vehicle: Vehicle, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveShareVehicle(vehicle);
    setCopiedLink(false);
  };

  const handleCopyLink = () => {
    if (!activeShareVehicle) return;
    const url = `${origin}/vehicles/${activeShareVehicle.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* SECTION 1: FLAGSHIP HERO VEHICLE CAROUSEL */}
      <section className="relative h-[85vh] w-full overflow-hidden bg-black text-white">
        {heroVehicles.length > 0 ? (
          <div className="relative h-full w-full">
            {heroVehicles.map((vehicle, idx) => {
              const isActive = idx === activeSlide;
              return (
                <div
                  key={vehicle.id}
                  className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-10' : 'opacity-0 z-0'
                  }`}
                >
                  {/* Backdrop Background Image */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent z-10" />
                  <Image
                    src={getImageUrl(vehicle.images[0], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=1920')}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    priority={isActive}
                    sizes="100vw"
                    className="object-cover object-center transform scale-105 transition-transform duration-10000"
                  />

                  {/* Overlay text detail block with smooth entry animations */}
                  <div className="absolute inset-y-0 left-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center z-20">
                    <div className="max-w-2xl space-y-6 pt-16">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/25 border border-accent text-accent font-semibold text-xs tracking-wider uppercase animate-fade-in">
                        Flagship Showroom Collection
                      </div>
                      
                      <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight uppercase leading-tight font-display text-white animate-slide-up">
                        {vehicle.make} <br />
                        <span className="text-zinc-300">{vehicle.model}</span>
                      </h1>
                      
                      <p className="text-base sm:text-lg text-zinc-300 leading-relaxed max-w-xl animate-fade-in line-clamp-3">
                        {vehicle.description}
                      </p>

                      <div className="grid grid-cols-3 gap-6 py-4 border-y border-white/10 max-w-md text-sm animate-fade-in">
                        <div>
                          <div className="text-zinc-500 font-medium">Transmission</div>
                          <div className="font-semibold text-white">{vehicle.transmission}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 font-medium">Engine Spec</div>
                          <div className="font-semibold text-white truncate">{vehicle.engine.split(' ')[0]} {vehicle.engine.split(' ')[1] || ''}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 font-medium">Acquisition Price</div>
                          <div className="font-semibold text-accent">${Number(vehicle.price).toLocaleString()}</div>
                        </div>
                      </div>

                      <div className="pt-4 flex flex-wrap gap-4 animate-fade-in">
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          className="bg-accent hover:bg-accent-hover text-white px-8 py-3.5 rounded-md text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
                        >
                          Explore Details
                        </Link>
                        <button
                          onClick={(e) => handleToggleFavorite(vehicle.id, e)}
                          className="flex items-center gap-2 px-6 py-3.5 rounded-md border border-white/20 hover:border-white text-sm font-semibold bg-white/5 hover:bg-white/10 transition-all"
                        >
                          <Heart
                            size={16}
                            className={userFavorites.includes(vehicle.id) ? 'fill-red-500 text-red-500' : 'text-white'}
                          />
                          {userFavorites.includes(vehicle.id) ? 'In Wishlist' : 'Bookmark Luxury Item'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Slider Nav Controls */}
            <button
              onClick={handlePrevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full border border-white/10 bg-black/40 text-white hover:bg-black/75 hover:scale-105 active:scale-95 transition-all"
              aria-label="Previous flagship item"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 rounded-full border border-white/10 bg-black/40 text-white hover:bg-black/75 hover:scale-105 active:scale-95 transition-all"
              aria-label="Next flagship item"
            >
              <ChevronRight size={24} />
            </button>

            {/* Carousel Dot Indicators */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex space-x-3">
              {heroVehicles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    stopSlideShow();
                    setActiveSlide(idx);
                    startSlideShow();
                  }}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    idx === activeSlide ? 'w-8 bg-accent' : 'w-2.5 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full flex items-center justify-center bg-zinc-950">
            {/* Minimal Luxury Fallback if database load delay */}
            <div className="text-center space-y-6 px-4">
              <span className="font-extrabold text-4xl tracking-wider text-white">
                J&L <span className="text-accent">AUTOS</span>
              </span>
              <h2 className="text-2xl font-semibold text-zinc-400">Curating Automotive Excellence</h2>
              <div className="flex justify-center">
                {error ? (
                  <div className="text-red-500 bg-red-500/10 px-4 py-2 rounded-md font-semibold text-sm">
                    {error}
                  </div>
                ) : loading ? (
                  <RefreshCw size={24} className="animate-spin text-accent" />
                ) : (
                  <div className="text-zinc-500 font-semibold uppercase tracking-wider">No flagship vehicles currently available.</div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: FLOATING DYNAMIC MULTI-FILTER SEARCH CONSOLE */}
      <section className="relative z-30 -mt-16 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-card border border-card-border p-6 rounded-xl shadow-xl glassmorphism animate-slide-up">
          <div className="flex flex-col gap-6">
            
            {/* Title & Info Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-card-border pb-4">
              <div className="flex items-center gap-2 text-foreground font-bold tracking-wide">
                <Filter size={18} className="text-accent" />
                <span>SEARCH CONCIERGE LEDGER</span>
              </div>
              <div className="flex items-center gap-3 mt-2 sm:mt-0">
                {user && (
                  <button
                    onClick={() => setSaveSearchOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent font-semibold transition-colors"
                  >
                    <Bookmark size={14} /> Bookmark Active Filters
                  </button>
                )}
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red-500 font-semibold transition-colors"
                >
                  <RefreshCw size={14} /> Clear Ledger Parameters
                </button>
              </div>
            </div>

            {/* Filter Input Grid */}
            <form onSubmit={handleApplyFilters} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Make Selection */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Brand / Maker</label>
                <select
                  value={makeFilter}
                  onChange={(e) => setMakeFilter(e.target.value)}
                  className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm font-medium focus:ring-1 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="">All Brands</option>
                  <option value="Porsche">Porsche</option>
                  <option value="Aston Martin">Aston Martin</option>
                  <option value="Audi">Audi</option>
                  <option value="Mercedes-Benz">Mercedes-Benz</option>
                </select>
              </div>

              {/* Body Style Selection */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Silhouette / Class</label>
                <select
                  value={bodyStyleFilter}
                  onChange={(e) => setBodyStyleFilter(e.target.value)}
                  className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm font-medium focus:ring-1 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="">All Classes</option>
                  <option value="Coupe">Coupe</option>
                  <option value="Sedan">Sedan</option>
                  <option value="SUV">SUV</option>
                </select>
              </div>

              {/* Max Price input */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Maximum Price (USD)</label>
                <input
                  type="number"
                  placeholder="e.g. 250000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm font-medium placeholder:text-zinc-500 focus:ring-1 focus:ring-accent focus:border-accent outline-none"
                />
              </div>

              {/* Transmission Filter */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Gearbox Configuration</label>
                <select
                  value={transmissionFilter}
                  onChange={(e) => setTransmissionFilter(e.target.value)}
                  className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm font-medium focus:ring-1 focus:ring-accent focus:border-accent outline-none"
                >
                  <option value="">All Transmission</option>
                  <option value="Automatic">Automatic (PDK / DSG)</option>
                  <option value="Manual">Manual Stick Shift</option>
                </select>
              </div>

              {/* Submit CTA */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-md text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-accent/20"
                >
                  <Search size={16} /> Search Showroom
                </button>
              </div>
            </form>

          </div>
        </div>
      </section>

      {/* SECTION 3: SHOWROOM CAR INVENTORY FEED */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 flex-grow">
        
        {/* Dynamic header summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground uppercase">
              J&L Digital Showroom – Experience Luxury, Drive Excellence
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Currently listing <strong className="text-foreground">{filteredInventory.length}</strong> matching premium motorcars.
            </p>
          </div>
        </div>

        {/* Inventory Grids */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <RefreshCw size={36} className="animate-spin text-accent" />
          </div>
        ) : filteredInventory.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredInventory.map((vehicle) => {
              const firstImage = getImageUrl(vehicle.images[0], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=600');
              const isFavorited = userFavorites.includes(vehicle.id);
              const likeData = likedVehicles[vehicle.id] || { count: (vehicle.id.charCodeAt(0) % 32) + 12, userLiked: false };

              return (
                <div
                  key={vehicle.id}
                  className="group flex flex-col bg-card border border-card-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('a')) return;
                    router.push(`/vehicles/${vehicle.id}`);
                  }}
                >
                  {/* Photo Container with Status Badge overlay */}
                  <Link href={`/vehicles/${vehicle.id}`} className="relative h-60 w-full overflow-hidden block bg-zinc-950">
                    <Image
                      src={firstImage}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Visual Status Badges */}
                    <div className="absolute top-4 left-4 z-20">
                      {vehicle.status === 'ON_SALE' && (
                        <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/90 text-white rounded-full">
                          ON SALE
                        </span>
                      )}
                      {vehicle.status === 'RESERVED' && (
                        <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase bg-amber-500/90 text-white rounded-full">
                          RESERVED
                        </span>
                      )}
                      {vehicle.status === 'SOLD' && (
                        <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase bg-red-600/90 text-white rounded-full">
                          SOLD
                        </span>
                      )}
                    </div>

                    {/* Short specs overlay on bottom */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-10">
                      <div className="flex gap-4 text-xs font-semibold text-zinc-300">
                        <span>{vehicle.year}</span>
                        <span>&bull;</span>
                        <span>{vehicle.transmission}</span>
                        <span>&bull;</span>
                        <span>{vehicle.mileage.toLocaleString()} mi</span>
                      </div>
                    </div>
                  </Link>

                  {/* Body Content */}
                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Link href={`/vehicles/${vehicle.id}`} className="block">
                          <h3 className="text-xl font-bold tracking-tight text-foreground uppercase group-hover:text-accent transition-colors">
                            {vehicle.make} <span className="font-normal text-text-muted">{vehicle.model}</span>
                          </h3>
                        </Link>
                      </div>
                      
                      <p className="text-xs text-text-muted line-clamp-2 leading-relaxed mb-4">
                        {vehicle.description}
                      </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-card-border">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-text-muted font-semibold uppercase tracking-wider">Acquisition Target</span>
                        <span className="text-2xl font-black text-foreground">
                          ${Number(vehicle.price).toLocaleString()}
                        </span>
                      </div>

                      {/* PRIMARY ACTIONS */}
                      <div className="flex gap-2 pt-4">
                        <Link
                          href={`/vehicles/${vehicle.id}`}
                          className="flex-1 bg-foreground text-background text-center py-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-accent transition-colors"
                        >
                          View Details
                        </Link>
                        <Link
                          href={`/vehicles/${vehicle.id}?tab=offer`}
                          className="flex-1 border border-card-border text-center py-2.5 rounded-md text-[10px] font-bold uppercase tracking-wider hover:border-accent hover:text-accent transition-colors"
                        >
                          Quick Offer
                        </Link>
                      </div>

                      {/* SOCIAL ACTIONS BAR */}
                      <div className="flex justify-between items-center pt-2 border-t border-card-border/50">
                        {/* 1. Bookmark Favorite */}
                        <button
                          onClick={(e) => handleToggleFavorite(vehicle.id, e)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded hover:bg-foreground/5 transition-colors ${
                            isFavorited ? 'text-red-500' : 'text-text-muted hover:text-foreground'
                          }`}
                          title="Add to favorites"
                        >
                          <Heart size={15} className={isFavorited ? 'fill-red-500' : ''} />
                          <span>{isFavorited ? 'Favorited' : 'Favorite'}</span>
                        </button>

                        {/* 2. Interactive Local Likes */}
                        <button
                          onClick={(e) => handleToggleLike(vehicle.id, e)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded hover:bg-foreground/5 transition-colors ${
                            likeData.userLiked ? 'text-accent' : 'text-text-muted hover:text-foreground'
                          }`}
                          title="Like listing"
                        >
                          <ThumbsUp size={15} className={likeData.userLiked ? 'fill-accent animate-ping-once' : ''} />
                          <span>{likeData.count}</span>
                        </button>

                        {/* 3. Share Drawer Trigger */}
                        <button
                          onClick={(e) => handleOpenShare(vehicle, e)}
                          className="flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 text-text-muted hover:text-foreground hover:bg-foreground/5 rounded transition-colors"
                          title="Share listing"
                        >
                          <Share2 size={15} />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 border border-dashed border-card-border rounded-lg bg-card/50">
            <Search size={48} className="mx-auto text-text-muted mb-4" />
            <h3 className="text-lg font-bold text-foreground uppercase">No Showroom Items Found</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto mt-1">
              We could not find any luxury vehicles matching your active filtration parameters. Adjust your ledger filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-4 bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded-md text-sm font-semibold transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}

      </section>

      {/* MODAL 1: BOOKMARK ACTIVE FILTERS / SAVE SEARCH */}
      {saveSearchOpen && (
        <dialog className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 w-full h-full" open>
          <div className="bg-card border border-card-border w-full max-w-md p-6 rounded-lg shadow-xl animate-fade-in text-foreground">
            <div className="flex justify-between items-center border-b border-card-border pb-3 mb-4">
              <h3 className="font-bold text-lg uppercase tracking-wide">Bookmark Showroom Filter</h3>
              <button onClick={() => setSaveSearchOpen(false)} className="text-text-muted hover:text-foreground p-1">
                <X size={18} />
              </button>
            </div>
            
            {saveSearchSuccess ? (
              <div className="text-center py-6 text-emerald-500 font-semibold text-sm">
                {saveSearchSuccess}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-text-muted leading-relaxed">
                  Name these search filters (e.g. &quot;Aston Martin Gray&quot; or &quot;Coupes under 300k&quot;) so you can trigger them instantly from your customer dashboard.
                </p>
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Filter Label</label>
                  <input
                    type="text"
                    placeholder="Enter unique name..."
                    value={savedSearchName}
                    onChange={(e) => setSavedSearchName(e.target.value)}
                    className="bg-card border border-card-border text-foreground px-3 py-2 rounded-md text-sm focus:ring-1 focus:ring-accent outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveSearch}
                  className="w-full bg-accent hover:bg-accent-hover text-white py-2.5 rounded text-sm font-semibold transition-colors mt-2"
                >
                  Confirm Bookmark
                </button>
              </div>
            )}
          </div>
        </dialog>
      )}

      {/* DIALOG 2: LUXURY GLASSMORPHIC SHARE DRAWER */}
      {activeShareVehicle && (
        <dialog className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 w-full h-full" open>
          <div className="bg-card border border-card-border w-full max-w-md p-6 rounded-lg shadow-xl animate-fade-in text-foreground relative glassmorphism">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-card-border pb-3 mb-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Acquisition Broadcast</span>
                <h3 className="font-extrabold text-base uppercase tracking-tight text-foreground">
                  Share {activeShareVehicle.make} {activeShareVehicle.model}
                </h3>
              </div>
              <button onClick={() => setActiveShareVehicle(null)} className="text-text-muted hover:text-foreground p-1">
                <X size={18} />
              </button>
            </div>

            {/* Social Targets */}
            <div className="grid grid-cols-2 gap-4 my-6">
              
              {/* WhatsApp Share */}
              <a
                href={`https://wa.me/?text=Check%20out%20this%20stunning%20${activeShareVehicle.year}%20${activeShareVehicle.make}%20${activeShareVehicle.model}%20available%20at%20J%26L%20Autos:%20${origin}/vehicles/${activeShareVehicle.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 border border-card-border rounded-md hover:bg-emerald-500/10 hover:border-emerald-500 text-sm font-semibold transition-all group"
              >
                <MessageCircle size={18} className="text-emerald-500" />
                <span className="group-hover:text-emerald-500">WhatsApp</span>
              </a>

              {/* FB Share */}
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${origin}/vehicles/${activeShareVehicle.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 border border-card-border rounded-md hover:bg-blue-600/10 hover:border-blue-600 text-sm font-semibold transition-all group"
              >
                <ExternalLink size={16} className="text-blue-600" />
                <span className="group-hover:text-blue-600">Facebook</span>
              </a>

            </div>

            {/* Copy Clipboard Row */}
            <div className="flex flex-col space-y-1.5 pt-2 border-t border-card-border/50">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Direct Web Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${origin}/vehicles/${activeShareVehicle.id}`}
                  className="bg-background border border-card-border text-foreground px-3 py-2 rounded-md text-xs flex-grow outline-none truncate font-mono"
                />
                <button
                  onClick={handleCopyLink}
                  className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  <Copy size={14} />
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

          </div>
        </dialog>
      )}

    </div>
  );
}
