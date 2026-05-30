'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useThemeAuth } from '@/context/ThemeAuthContext';
import { getImageUrl } from '@/utils/image';
import {
  Calendar,
  Clock,
  Car,
  Compass,
  DollarSign,
  Heart,
  Share2,
  ThumbsUp,
  ChevronLeft,
  X,
  ShieldCheck,
  Percent,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  User,
  Copy,
  MessageCircle,
  ExternalLink,
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
  engine: string;
  fuelType: string;
  bodyStyle: string;
  seats: number;
  doors: number;
  description: string;
  status: 'ON_SALE' | 'RESERVED' | 'SOLD';
  images: string[];
  isFinanceWarrantyActive: boolean;
  financeData?: string; // JSON string
  warrantyData?: string; // JSON string
}

interface BookingSlot {
  time: string;
  available: boolean;
}

export default function VehicleDetailsPage({ vehicleId }: { vehicleId?: string }) {
  const params = useParams();
  const id = vehicleId || (params?.id as string);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, settings } = useThemeAuth();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Media gallery states
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Favorites & Likes states
  const [isFavorited, setIsFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);

  // Booking Widget States
  const [eventType, setEventType] = useState<'VISIT' | 'TEST_DRIVE'>('VISIT');
  const [bookingDate, setBookingDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [minDate, setMinDate] = useState('');

  // Offer Modal States
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState('');
  const [offerError, setOfferError] = useState('');

  // Share Modal States
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Static operating slots for reservation
  const availableSlots = [
    '09:00 AM',
    '10:30 AM',
    '01:00 PM',
    '03:00 PM',
    '04:30 PM',
  ];

  // 1. Fetch Vehicle Profile and setup interactive states
  const fetchVehicleDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/vehicles/${id}`);
      if (res.data && res.data.vehicle) {
        const data = res.data.vehicle;
        
        // Handle images parsing if returned as string
        let imgArr: string[] = [];
        if (typeof data.images === 'string') {
          try {
            imgArr = JSON.parse(data.images);
          } catch (e) {
            imgArr = [data.images];
          }
        } else if (Array.isArray(data.images)) {
          imgArr = data.images;
        }

        setVehicle({ ...data, images: imgArr });
        setLikeCount(Math.floor(Math.random() * 30) + 15);
        setOfferAmount(String(data.price));
      } else {
        setError('Luxury vehicle listing not found.');
      }
    } catch (err: any) {
      console.error('Failed to load vehicle details:', err);
      setError('Error loading vehicle details. Please return to the showroom.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch bookmarks / favorites list to verify active status
  const checkFavoriteStatus = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/vehicles/favorites`);
      if (res.data && res.data.vehicles) {
        const found = res.data.vehicles.some((v: any) => v.id === id);
        setIsFavorited(found);
      }
    } catch (err) {
      console.error('Failed to sync favorite status:', err);
    }
  };

  useEffect(() => {
    setMinDate(new Date().toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (id) {
      fetchVehicleDetails();
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      checkFavoriteStatus();
    }
  }, [user, id]);

  // Auto-open offer modal if ?tab=offer is in the URL (e.g. from Quick Offer button)
  useEffect(() => {
    if (searchParams.get('tab') === 'offer') {
      setOfferOpen(true);
    }
  }, [searchParams]);

  // 3. Toggle Bookmark
  const handleToggleFavorite = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    try {
      const res = await axios.post(`${BACKEND_URL}/api/vehicles/${id}/favorite`);
      setIsFavorited(res.data.isFavorite);
    } catch (err) {
      console.error('Failed to update favorite status:', err);
    }
  };

  // 4. Toggle Local Likes
  const handleToggleLike = () => {
    if (userLiked) {
      setLikeCount((prev) => prev - 1);
      setUserLiked(false);
    } else {
      setLikeCount((prev) => prev + 1);
      setUserLiked(true);
    }
  };

  // 5. Submit Showroom Booking
  const handleScheduleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    if (!bookingDate || !selectedTimeSlot) {
      setBookingError('Please configure an operating date and operational slot.');
      return;
    }

    // Block past dates
    const selectedDate = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setBookingError('Selected scheduling date must be in the future.');
      return;
    }

    try {
      setBookingLoading(true);
      setBookingError('');
      setBookingSuccess('');

      const res = await axios.post(`${BACKEND_URL}/api/bookings`, {
        vehicleId: id,
        bookingDate,
        bookingTime: selectedTimeSlot,
        notes: `Event type: ${eventType}`,
      });

      setBookingSuccess(
        res.data.message ||
        (res.data.data ? 'Concierge appointment booked. You will be contacted for confirmation.' : 'Concierge schedules booked.')
      );
      // Reset form
      setBookingDate('');
      setSelectedTimeSlot('');

      // Redirect to dashboard bookings timeline after 2 seconds
      setTimeout(() => {
        router.push('/dashboard?tab=bookings');
      }, 2000);
    } catch (err: any) {
      console.error('Booking error:', err);
      const msg = err.response?.data?.message || 'Conflict: This specific time slot is already reserved.';
      setBookingError(msg);
    } finally {
      setBookingLoading(false);
    }
  };

  // 6. Submit Acquisition Pricing Proposal (Make an Offer)
  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    const value = parseFloat(offerAmount);
    if (isNaN(value) || value <= 0) {
      setOfferError('Please supply a valid proposal acquisition budget.');
      return;
    }

    try {
      setOfferLoading(true);
      setOfferError('');
      setOfferSuccess('');

      const res = await axios.post(`${BACKEND_URL}/api/offers/submit`, {
        vehicleId: id,
        offerAmount: value,
      });

      setOfferSuccess(
        res.data.message ||
        (res.data.data ? 'Acquisition proposal submitted for evaluation.' : 'Proposal received.')
      );
      setTimeout(() => {
        setOfferOpen(false);
        setOfferSuccess('');
        router.push('/dashboard?tab=offers');
      }, 2000);
    } catch (err: any) {
      console.error('Offer error:', err);
      setOfferError(err.response?.data?.message || 'Failed to submit negotiation proposal.');
    } finally {
      setOfferLoading(false);
    }
  };

  // 7. Clipboard broadcast
  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <Car className="animate-bounce text-accent mx-auto" size={48} />
          <h2 className="text-xl font-bold uppercase tracking-wider text-text-muted">Loading Showroom Collection...</h2>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="max-w-md w-full bg-card border border-card-border p-8 rounded-lg shadow-xl text-center space-y-6">
          <AlertTriangle className="text-red-500 mx-auto" size={48} />
          <h2 className="text-2xl font-bold uppercase tracking-tight">Listing Unavailable</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            {error || 'This luxury car model has been retired from our digital ledger.'}
          </p>
          <Link
            href="/"
            className="inline-block bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded text-sm font-semibold transition-colors uppercase tracking-wider w-full"
          >
            Return to Showroom
          </Link>
        </div>
      </div>
    );
  }

  // Parse custom parameters for Finance and Warranty if active
  let parsedFinance: { minDownpayment?: number; aprRate?: number; durationMonths?: number } = {};
  let parsedWarranty: { durationYears?: number; scopeCoverage?: string } = {};

  if (vehicle.isFinanceWarrantyActive) {
    if (vehicle.financeData) {
      try {
        parsedFinance = JSON.parse(vehicle.financeData);
      } catch (e) {
        parsedFinance = { minDownpayment: vehicle.price * 0.15, aprRate: 4.9, durationMonths: 60 };
      }
    } else {
      parsedFinance = { minDownpayment: vehicle.price * 0.15, aprRate: 4.9, durationMonths: 60 };
    }

    if (vehicle.warrantyData) {
      try {
        parsedWarranty = JSON.parse(vehicle.warrantyData);
      } catch (e) {
        parsedWarranty = { durationYears: 3, scopeCoverage: 'Full Bumper-to-Bumper Powertrain warranty' };
      }
    } else {
      parsedWarranty = { durationYears: 3, scopeCoverage: 'Full Bumper-to-Bumper Powertrain warranty' };
    }
  }

  const activeImage = getImageUrl(vehicle.images[activeImageIdx], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=1200');

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      
      {/* 1. Header Navigation details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground font-semibold uppercase tracking-wider transition-colors mb-6"
        >
          <ChevronLeft size={14} /> Back to Showroom
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-widest bg-card border border-card-border rounded-full text-accent uppercase">
                {vehicle.bodyStyle}
              </span>
              
              {vehicle.status === 'ON_SALE' && (
                <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-widest bg-emerald-500/15 text-emerald-500 rounded-full">
                  AVAILABLE
                </span>
              )}
              {vehicle.status === 'RESERVED' && (
                <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-widest bg-amber-500/15 text-amber-500 rounded-full">
                  RESERVED
                </span>
              )}
              {vehicle.status === 'SOLD' && (
                <span className="px-3.5 py-1 text-[10px] font-extrabold tracking-widest bg-red-500/15 text-red-500 rounded-full">
                  SOLD
                </span>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tight leading-none text-foreground font-display">
              {vehicle.make} <span className="font-normal text-text-muted">{vehicle.model}</span>
            </h1>
            <p className="text-xs text-text-muted mt-2 uppercase tracking-widest font-semibold">
              Curated Production Year: {vehicle.year} &bull; Spec ID: {vehicle.id.slice(0, 8).toUpperCase()}
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block">Acquisition Reserve</span>
            <span className="text-3xl sm:text-4xl font-black text-foreground block">
              ${Number(vehicle.price).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Primary Layout Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        
        {/* Left Side Column: Media & Specifications (Span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Lightbox Media Gallery */}
          <div className="space-y-4">
            {/* Active Image Box */}
            <div
              className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-card-border cursor-pointer group shadow-sm"
              onClick={() => setLightboxOpen(true)}
            >
              <img
                src={activeImage}
                alt={`${vehicle.make} ${vehicle.model} - Active view`}
                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              
              <span className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                Click to expand view
              </span>
            </div>

            {/* Thumbnails Row */}
            {vehicle.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {vehicle.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative w-28 aspect-video rounded-md overflow-hidden bg-zinc-900 border flex-shrink-0 transition-all ${
                      idx === activeImageIdx ? 'border-accent ring-1 ring-accent' : 'border-card-border hover:border-zinc-500'
                    }`}
                  >
                    <img
                      src={getImageUrl(img, 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=1200')}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Luxury Interaction Toolbar */}
          <div className="flex flex-wrap items-center justify-between border-y border-card-border py-4 gap-4">
            
            {/* Wishlist and Like buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleFavorite}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all ${
                  isFavorited
                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                    : 'bg-card border-card-border hover:border-foreground text-foreground'
                }`}
              >
                <Heart size={15} className={isFavorited ? 'fill-red-500' : ''} />
                <span>{isFavorited ? 'In Wishlist' : 'Add to Wishlist'}</span>
              </button>

              <button
                onClick={handleToggleLike}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider border transition-all bg-card ${
                  userLiked
                    ? 'border-accent/40 text-accent bg-accent/5'
                    : 'border-card-border hover:border-foreground text-foreground'
                }`}
              >
                <ThumbsUp size={15} className={userLiked ? 'fill-accent' : ''} />
                <span>{likeCount} likes</span>
              </button>
            </div>

            {/* Sharing and Proposals */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShareOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider border border-card-border bg-card hover:border-foreground text-foreground transition-all"
              >
                <Share2 size={15} />
                <span>Broadcast Share</span>
              </button>

              {vehicle.status === 'ON_SALE' && (
                <button
                  onClick={() => setOfferOpen(true)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white transition-all shadow-sm"
                >
                  <DollarSign size={14} className="text-accent" />
                  <span>Make an Offer</span>
                </button>
              )}
            </div>

          </div>

          {/* Description Block */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold uppercase tracking-wider border-b border-card-border pb-2 text-foreground">
              Curator Notes
            </h3>
            <p className="text-sm text-text-muted leading-relaxed whitespace-pre-line font-light">
              {vehicle.description}
            </p>
          </div>

          {/* Technical Specifications Matrix */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold uppercase tracking-wider border-b border-card-border pb-2 text-foreground">
              Technical Specifications Matrix
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              
              <div className="bg-card border border-card-border p-4 rounded-md">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Mileage Target</span>
                <span className="text-base font-bold text-foreground block uppercase mt-0.5">{vehicle.mileage.toLocaleString()} mi</span>
              </div>

              <div className="bg-card border border-card-border p-4 rounded-md">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Gearbox Configuration</span>
                <span className="text-base font-bold text-foreground block uppercase mt-0.5">{vehicle.transmission}</span>
              </div>

              <div className="bg-card border border-card-border p-4 rounded-md">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Engine Profile</span>
                <span className="text-base font-bold text-foreground block uppercase mt-0.5 truncate" title={vehicle.engine}>
                  {vehicle.engine}
                </span>
              </div>

              <div className="bg-card border border-card-border p-4 rounded-md">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Fuel Chemistry</span>
                <span className="text-base font-bold text-foreground block uppercase mt-0.5">{vehicle.fuelType}</span>
              </div>

              <div className="bg-card border border-card-border p-4 rounded-md">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Exterior Hue</span>
                <span className="text-base font-bold text-foreground block uppercase mt-0.5">{vehicle.color}</span>
              </div>

              <div className="bg-card border border-card-border p-4 rounded-md">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Chassis Layout</span>
                <span className="text-base font-bold text-foreground block uppercase mt-0.5">
                  {vehicle.doors} Doors &bull; {vehicle.seats} Seats
                </span>
              </div>

            </div>
          </div>

          {/* CRITICAL FINANCE / WARRANTY COMPLIANCE MODULE */}
          {vehicle.isFinanceWarrantyActive && (
            <div id="finance-warranty-section" className="bg-card border border-accent/20 p-6 rounded-lg space-y-6 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-card-border">
                <ShieldCheck size={20} className="text-accent" />
                <h3 className="text-lg font-bold uppercase tracking-wider text-foreground">
                  FINANCIAL SCHEDULING & WARRANTY SHIELD
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Finance Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Percent size={16} className="text-accent" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Custom Loan Calculator Options</h4>
                  </div>
                  <div className="bg-background border border-card-border p-4 rounded space-y-2 text-sm text-text-muted">
                    <div className="flex justify-between">
                      <span>Minimum Downpayment Target</span>
                      <strong className="text-foreground">${Number(parsedFinance.minDownpayment || (vehicle.price * 0.15)).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Annual APR Rates</span>
                      <strong className="text-foreground">{parsedFinance.aprRate || 4.9}%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Amortization Term Limit</span>
                      <strong className="text-foreground">{parsedFinance.durationMonths || 60} Months</strong>
                    </div>
                    <div className="pt-2 border-t border-card-border/50 flex justify-between text-xs font-semibold text-foreground">
                      <span>Est. Monthly Expense</span>
                      <span>
                        ${Math.round(
                          ((vehicle.price - (parsedFinance.minDownpayment || vehicle.price * 0.15)) *
                            (1 + (parsedFinance.aprRate || 4.9) / 100)) /
                            (parsedFinance.durationMonths || 60)
                        ).toLocaleString()}/mo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Warranty Shield */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Concierge Warranty Coverage</h4>
                  </div>
                  <div className="bg-background border border-card-border p-4 rounded space-y-2 text-sm text-text-muted">
                    <div className="flex justify-between">
                      <span>Bespoke Coverage Duration</span>
                      <strong className="text-foreground">{parsedWarranty.durationYears || 3} Years</strong>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs block text-zinc-500">Coverage Mechanics:</span>
                      <p className="text-xs text-foreground bg-card border border-card-border/50 p-2 rounded leading-relaxed font-light">
                        {parsedWarranty.scopeCoverage || 'Comprehensive powertrain protection covering electronic differentials, suspension, and high-performance drivetrain elements.'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
              <div className="flex gap-2 items-start bg-background p-3.5 rounded border border-card-border text-[11px] text-text-muted leading-relaxed">
                <Info size={16} className="text-accent flex-shrink-0 mt-0.5" />
                <p>
                  Financing interest estimates are provided solely as concierge pre-evaluations. Actual rates are calculated upon custom credit profiles in cooperation with our automotive private banking partners.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Right Side Column: Sticky booking concierge widget */}
        <div className="lg:col-span-1">
          <div className="sticky top-28 bg-card border border-card-border p-6 rounded-xl shadow-lg space-y-6">
            
            <div className="border-b border-card-border pb-3">
              <span className="text-[9px] font-extrabold text-accent uppercase tracking-widest">SHOWROOM CONCIERGE</span>
              <h3 className="text-xl font-bold uppercase tracking-tight text-foreground mt-0.5">
                Reserve Appointment
              </h3>
              <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                Schedule a private showroom viewing or VIP test drive session directly on our active dealership floor.
              </p>
            </div>

            {/* Event Type Toggles */}
            <div className="grid grid-cols-2 gap-2 bg-background p-1 border border-card-border rounded-md">
              <button
                type="button"
                onClick={() => setEventType('VISIT')}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  eventType === 'VISIT'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-text-muted hover:text-foreground'
                }`}
              >
                Private View
              </button>
              <button
                type="button"
                onClick={() => setEventType('TEST_DRIVE')}
                disabled={vehicle.status !== 'ON_SALE'}
                className={`py-2 text-xs font-bold uppercase tracking-wider rounded transition-all ${
                  eventType === 'TEST_DRIVE'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-text-muted hover:text-foreground'
                } disabled:opacity-30 disabled:pointer-events-none`}
              >
                VIP Test Drive
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleScheduleBooking} className="space-y-4">
              
              {/* Date Input */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Target Calendar Date</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    min={minDate}
                    className="w-full bg-background border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Time slots Selector */}
              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Available Operational Slots</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableSlots.map((slot) => {
                    const active = selectedTimeSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTimeSlot(slot)}
                        className={`py-2 px-1 text-center text-xs font-semibold rounded border transition-all ${
                          active
                            ? 'bg-accent/10 border-accent text-accent'
                            : 'bg-background border-card-border hover:border-zinc-500 text-foreground'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status notifications */}
              {bookingError && (
                <div className="flex gap-2 items-start bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded text-xs leading-relaxed">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{bookingError}</span>
                </div>
              )}

              {bookingSuccess && (
                <div className="flex gap-2 items-start bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded text-xs leading-relaxed">
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{bookingSuccess}</span>
                </div>
              )}

              {/* Submit Button */}
              {user ? (
                <button
                  type="submit"
                  disabled={bookingLoading || vehicle.status === 'SOLD'}
                  className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none shadow-md shadow-accent/25 flex items-center justify-center gap-2"
                >
                  <Calendar size={14} />
                  <span>{bookingLoading ? 'Requesting Appointment...' : 'Schedule Concierge VIP Slot'}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-all shadow-md shadow-accent/25 block text-center uppercase"
                >
                  Log In To Book Viewings
                </Link>
              )}

            </form>

            <div className="pt-4 border-t border-card-border/60 text-center">
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">
                J&L Autos Concierge Desk: {settings?.phone || '+1 (214) 608-0670'}
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* 3. LIGHTBOX DIALOG OVERLAY */}
      {lightboxOpen && (
        <dialog
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 w-full h-full"
          open
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[85vh] flex flex-col justify-center animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-12 right-0 text-white/70 hover:text-white p-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              Close <X size={20} />
            </button>

            <img
              src={activeImage}
              alt={`${vehicle.make} ${vehicle.model} - Large View`}
              className="max-w-full max-h-[80vh] object-contain mx-auto rounded-lg"
            />
            
            {vehicle.images.length > 1 && (
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setActiveImageIdx((prev) => (prev === 0 ? vehicle.images.length - 1 : prev - 1))}
                  className="text-white/60 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-white/80 text-xs font-bold flex items-center tracking-widest font-mono">
                  {activeImageIdx + 1} / {vehicle.images.length}
                </span>
                <button
                  onClick={() => setActiveImageIdx((prev) => (prev + 1) % vehicle.images.length)}
                  className="text-white/60 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </dialog>
      )}

      {/* 4. MAKE AN OFFER MODAL (GLASSMORPHIC DRAWER) */}
      {offerOpen && (
        <dialog className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 w-full h-full" open>
          <div className="bg-card border border-card-border w-full max-w-md p-6 rounded-lg shadow-xl animate-fade-in text-foreground relative glassmorphism">
            
            <div className="flex justify-between items-center border-b border-card-border pb-3 mb-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-accent uppercase tracking-widest">PROPOSAL LEDGER</span>
                <h3 className="font-extrabold text-base uppercase tracking-tight text-foreground">
                  Submit Acquisition Proposal
                </h3>
              </div>
              <button onClick={() => setOfferOpen(false)} className="text-text-muted hover:text-foreground p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendOffer} className="space-y-4">
              <p className="text-xs text-text-muted leading-relaxed font-light">
                Offer custom cash or financing acquisition targets to our sales concierge team. Accepted proposals immediately lock the car status as Reserved for authentication.
              </p>

              <div className="bg-background border border-card-border p-3.5 rounded flex items-center justify-between text-xs text-text-muted">
                <span>Reserve Showroom Price:</span>
                <strong className="text-foreground text-sm font-bold">${Number(vehicle.price).toLocaleString()}</strong>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Proposal Target Value (USD)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 font-bold">$</div>
                  <input
                    type="number"
                    required
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="w-full bg-background border border-card-border text-foreground pl-7 pr-3.5 py-2.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent font-bold"
                  />
                </div>
              </div>

              {offerError && (
                <div className="flex gap-2 items-start bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded text-xs">
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{offerError}</span>
                </div>
              )}

              {offerSuccess && (
                <div className="flex gap-2 items-start bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded text-xs">
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{offerSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={offerLoading}
                className="w-full bg-accent hover:bg-accent-hover text-white py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-all shadow-md shadow-accent/25"
              >
                {offerLoading ? 'Broadcasting Proposal...' : 'Transmit Acquisition Offer'}
              </button>
            </form>
          </div>
        </dialog>
      )}

      {/* 5. BROADCAST SHARE MODAL */}
      {shareOpen && (
        <dialog className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 w-full h-full" open>
          <div className="bg-card border border-card-border w-full max-w-md p-6 rounded-lg shadow-xl animate-fade-in text-foreground relative glassmorphism">
            
            <div className="flex justify-between items-center border-b border-card-border pb-3 mb-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Concierge Broadcasting</span>
                <h3 className="font-extrabold text-base uppercase tracking-tight text-foreground">
                  Share {vehicle.make} {vehicle.model}
                </h3>
              </div>
              <button onClick={() => setShareOpen(false)} className="text-text-muted hover:text-foreground p-1">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 my-6">
              <a
                href={`https://wa.me/?text=Take%20a%20look%20at%20this%20stunning%20${vehicle.year}%20${vehicle.make}%20${vehicle.model}%20listing%20at%20J%26L%20Autos:%20${window.location.href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 border border-card-border rounded-md hover:bg-emerald-500/10 hover:border-emerald-500 text-sm font-semibold transition-all group"
              >
                <MessageCircle size={18} className="text-emerald-500" />
                <span className="group-hover:text-emerald-500">WhatsApp</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 p-3 border border-card-border rounded-md hover:bg-blue-600/10 hover:border-blue-600 text-sm font-semibold transition-all group"
              >
                <ExternalLink size={16} className="text-blue-600" />
                <span className="group-hover:text-blue-600">Facebook</span>
              </a>
            </div>

            <div className="flex flex-col space-y-1.5 pt-2 border-t border-card-border/50">
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Direct Web Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
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
