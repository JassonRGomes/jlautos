'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import axios from 'axios';
import { useThemeAuth } from '@/context/ThemeAuthContext';
import { getImageUrl } from '@/utils/image';
import {
  Calendar,
  Clock,
  Car,
  User,
  Mail,
  Phone,
  FileText,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  RefreshCw,
  Clock4,
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
  price: number;
  transmission: string;
  images: string[];
  status: string;
}

function BookTestDriveInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId');
  const { user, loadingAuth } = useThemeAuth();

  // Booking states
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(true);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states
  const [bookingDate, setBookingDate] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [drivingLicense, setDrivingLicense] = useState('');
  const [notes, setNotes] = useState('');
  const [minDate, setMinDate] = useState('');

  // Static operating slots for reservation
  const availableSlots = [
    '09:00 AM',
    '10:30 AM',
    '01:00 PM',
    '03:00 PM',
    '04:30 PM',
  ];

  // Set minDate to today
  useEffect(() => {
    setMinDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Pre-fill user profile info if logged in
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      setMobileNumber(user.phone || '');
    }
  }, [user]);

  // Fetch vehicle info
  useEffect(() => {
    if (!vehicleId) {
      setErrorMsg('No luxury vehicle was selected for booking.');
      setLoadingVehicle(false);
      return;
    }

    const fetchVehicle = async () => {
      try {
        setLoadingVehicle(true);
        const res = await axios.get(`${BACKEND_URL}/api/vehicles/${vehicleId}`);
        if (res.data && res.data.vehicle) {
          const v = res.data.vehicle;
          let imgArr: string[] = [];
          if (typeof v.images === 'string') {
            try {
              imgArr = JSON.parse(v.images);
            } catch (e) {
              imgArr = [v.images];
            }
          } else if (Array.isArray(v.images)) {
            imgArr = v.images;
          }
          setVehicle({ ...v, images: imgArr });
        } else {
          setErrorMsg('Selected vehicle was not found in the showroom ledger.');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Error loading vehicle details.');
      } finally {
        setLoadingVehicle(false);
      }
    };

    fetchVehicle();
  }, [vehicleId]);

  // Submit handler
  const handleScheduleTestDrive = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push('/login?redirect=/book-test-drive?vehicleId=' + vehicleId);
      return;
    }

    if (!vehicleId || !bookingDate || !selectedTimeSlot || !fullName || !email || !mobileNumber) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    // Past date check
    const selectedDate = new Date(bookingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      setErrorMsg('Preferred date cannot be in the past.');
      return;
    }

    // Sunday check
    if (selectedDate.getDay() === 0) {
      setErrorMsg('Dealership showroom is closed on Sundays. Please select Mon-Sat.');
      return;
    }

    try {
      setLoadingSubmit(true);
      setErrorMsg('');
      setSuccessMsg('');

      const token = localStorage.getItem('jl_auth_token');
      const res = await axios.post(
        `${BACKEND_URL}/api/bookings`,
        {
          vehicleId,
          bookingDate,
          bookingTime: selectedTimeSlot,
          fullName,
          email,
          mobileNumber,
          drivingLicenseNumber: drivingLicense || null,
          customerNotes: notes || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMsg(res.data.message || 'VIP Test Drive scheduled! Redirecting to your ledger...');
      
      // Clear fields
      setBookingDate('');
      setSelectedTimeSlot('');
      
      setTimeout(() => {
        router.push('/dashboard?tab=bookings');
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'A booking conflict exists for this date and time.');
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingAuth || (loadingVehicle && !vehicle)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <RefreshCw className="animate-spin text-accent mx-auto" size={42} />
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Preparing...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link
          href={vehicleId ? `/details?id=${vehicleId}` : '/'}
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground font-semibold uppercase tracking-wider transition-colors mb-6"
        >
          <ChevronLeft size={14} /> Back to Details
        </Link>

        {/* Title */}
        <div className="mb-10 text-center md:text-left">
          <span className="text-[10px] font-extrabold text-accent uppercase tracking-widest">VIP TEST DRIVE REQUEST</span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground mt-1 font-display">
            Schedule Experiential Drive
          </h1>
          <p className="text-xs text-text-muted mt-2 uppercase tracking-wider font-semibold">
            Book private access to a luxury vehicle. Dealership representative approval required.
          </p>
        </div>

        {errorMsg && !vehicle && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-6 rounded-xl text-center space-y-4">
            <AlertTriangle className="mx-auto" size={32} />
            <h3 className="font-bold text-sm uppercase">{errorMsg}</h3>
            <Link
              href="/"
              className="inline-block bg-red-500 text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider"
            >
              Return to Showroom
            </Link>
          </div>
        )}

        {vehicle && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Vehicle Summary Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm space-y-4 sticky top-24">
                <h3 className="text-xs font-extrabold text-text-muted uppercase tracking-wider border-b border-card-border pb-2">
                  Selected Vehicle
                </h3>

                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-950 border border-card-border">
                  <Image
                    src={getImageUrl(vehicle.images[0], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=400')}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 25vw"
                    className="object-cover"
                  />
                </div>

                <div>
                  <h4 className="font-black text-lg uppercase text-foreground leading-tight">
                    {vehicle.make} <span className="font-normal text-text-muted">{vehicle.model}</span>
                  </h4>
                  <div className="flex gap-2 items-center text-[10px] text-text-muted uppercase font-bold tracking-wider mt-1.5">
                    <span>{vehicle.year}</span>
                    <span>&bull;</span>
                    <span>{vehicle.transmission}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-card-border flex justify-between items-baseline">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Catalog Valuation</span>
                  <span className="text-xl font-mono font-black text-foreground">
                    ${Number(vehicle.price).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Booking Form (Span 2) */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-card-border rounded-xl p-6 sm:p-8 shadow-sm">
                <form onSubmit={handleScheduleTestDrive} className="space-y-6">
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider border-b border-card-border pb-3">
                    Reservations Details
                  </h3>

                  {/* Date & Time slots */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        1. Select Calendar Date <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-text-muted">
                          <Calendar size={15} />
                        </div>
                        <input
                          type="date"
                          required
                          value={bookingDate}
                          onChange={(e) => setBookingDate(e.target.value)}
                          min={minDate}
                          className="w-full bg-white border border-gray-200 text-black pl-10 pr-3.5 py-3 rounded-xl text-sm outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                        2. Select Time Slot <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {availableSlots.map((slot) => {
                          const active = selectedTimeSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={`py-2 px-1 text-center text-xs font-bold rounded-lg border transition-all ${
                                active
                                  ? 'bg-accent border-accent text-white shadow-md'
                                  : 'bg-white border-gray-200 hover:border-accent/40 text-black'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Customer personal details */}
                  <div className="space-y-4 pt-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted block">
                      3. Customer Details
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <span className="text-[9px] font-bold text-text-muted uppercase">Full Name *</span>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted"><User size={13} /></div>
                          <input
                            type="text"
                            required
                            placeholder="e.g. John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-black pl-9 pr-3 py-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <span className="text-[9px] font-bold text-text-muted uppercase">Email Address *</span>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted"><Mail size={13} /></div>
                          <input
                            type="email"
                            required
                            placeholder="e.g. name@domain.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-black pl-9 pr-3 py-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <span className="text-[9px] font-bold text-text-muted uppercase">Mobile Number *</span>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted"><Phone size={13} /></div>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +1 (555) 019-2834"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-black pl-9 pr-3 py-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <span className="text-[9px] font-bold text-text-muted uppercase">Driving License (Optional)</span>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-text-muted"><FileText size={13} /></div>
                          <input
                            type="text"
                            placeholder="e.g. DL-293847-NJ"
                            value={drivingLicense}
                            onChange={(e) => setDrivingLicense(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-black pl-9 pr-3 py-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-accent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes / Comments */}
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      4. Special Requests or Notes
                    </label>
                    <div className="relative">
                      <div className="absolute top-3 left-3 pointer-events-none text-text-muted"><MessageSquare size={13} /></div>
                      <textarea
                        rows={3}
                        placeholder="Specify transmission preferences, special details, or requirements..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-black pl-9 pr-3 py-2.5 rounded-lg text-xs outline-none focus:ring-1 focus:ring-accent resize-none"
                      />
                    </div>
                  </div>

                  {/* Error & Success status notices */}
                  {errorMsg && (
                    <div className="flex gap-2 items-start bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs leading-relaxed">
                      <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {successMsg && (
                    <div className="flex gap-2 items-start bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs leading-relaxed">
                      <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div>
                    {!user ? (
                      <Link
                        href={`/login?redirect=/book-test-drive?vehicleId=${vehicleId}`}
                        className="w-full bg-accent hover:bg-accent-hover text-white text-center py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all block"
                      >
                        Log In to Secure Booking
                      </Link>
                    ) : (
                      <button
                        type="submit"
                        disabled={loadingSubmit}
                        className="w-full bg-gradient-to-r from-accent to-accent-hover text-white py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                      >
                        {loadingSubmit ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            Booking in progress...
                          </>
                        ) : (
                          'Request VIP Test Drive'
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookTestDrivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center space-y-4">
            <RefreshCw className="animate-spin text-accent mx-auto" size={42} />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-muted">Loading Reservation Form...</h2>
          </div>
        </div>
      }
    >
      <BookTestDriveInner />
    </Suspense>
  );
}
