'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useThemeAuth } from '@/context/ThemeAuthContext';
import { getImageUrl } from '@/utils/image';
import {
  Car,
  Calendar,
  DollarSign,
  Mail,
  FileSpreadsheet,
  FileText,
  User,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ShieldAlert,
  Percent,
  ShieldCheck,
  Upload,
  RefreshCw,
  Sliders,
  ChevronRight,
  TrendingUp,
  Download,
  AlertTriangle,
  Users,
  Settings,
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
  financeData?: string; // JSON String
  warrantyData?: string; // JSON String
}

interface Booking {
  id: string;
  userId: string;
  user: { name: string; email: string; phone?: string };
  vehicleId: string;
  vehicle: Vehicle;
  date: string;
  timeSlot: string;
  eventType: 'VISIT' | 'TEST_DRIVE';
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED';
  createdAt: string;
}

interface Offer {
  id: string;
  userId: string;
  user: { name: string; email: string; phone?: string };
  vehicleId: string;
  vehicle: Vehicle;
  offerAmount: number;
  status: 'UNDER_REVIEW' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: string;
  _count?: {
    bookings: number;
    offers: number;
    favorites: number;
  };
}

type AdminTab = 'inventory' | 'bookings' | 'offers' | 'newsletter' | 'reports' | 'settings';

export default function AdministrativePanel() {
  const router = useRouter();
  const { user, loadingAuth } = useThemeAuth();

  // Page core states
  const [activeTab, setActiveTab] = useState<AdminTab>('inventory');
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Booking action states
  const [bookingActionLoading, setBookingActionLoading] = useState<Record<string, boolean>>({});
  const [cancelModal, setCancelModal] = useState<{ open: boolean; bookingId: string; customerName: string } | null>(null);
  const [smsToast, setSmsToast] = useState<{ visible: boolean; sent: boolean; message: string } | null>(null);

  // Inventory Database states
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // CRM Databases states
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Inventory CMS Form states
  const [formMake, setFormMake] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState(2026);
  const [formColor, setFormColor] = useState('');
  const [formMileage, setFormMileage] = useState(0);
  const [formPrice, setFormPrice] = useState(0);
  const [formTransmission, setFormTransmission] = useState('Automatic');
  const [formEngine, setFormEngine] = useState('');
  const [formFuelType, setFormFuelType] = useState('Gasoline');
  const [formBodyStyle, setFormBodyStyle] = useState('Coupe');
  const [formSeats, setFormSeats] = useState(2);
  const [formDoors, setFormDoors] = useState(2);
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'ON_SALE' | 'RESERVED' | 'SOLD'>('ON_SALE');
  
  // Finance / Warranty database toggles
  const [formFinanceActive, setFormFinanceActive] = useState(false);
  const [formDownpayment, setFormDownpayment] = useState(0);
  const [formApr, setFormApr] = useState(4.9);
  const [formTermMonths, setFormTermMonths] = useState(60);
  const [formWarrantyYears, setFormWarrantyYears] = useState(3);
  const [formWarrantyScope, setFormWarrantyScope] = useState('');

  // Multi-image upload states
  const [uploadingImages, setUploadingImages] = useState(false);
  const [formImages, setFormImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global Settings CMS Form states
  const { settings, loadSettings } = useThemeAuth();
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsappNumber, setFormWhatsappNumber] = useState('');
  const [formLogoUrl, setFormLogoUrl] = useState<string | null>(null);
  const [formWeekdays, setFormWeekdays] = useState('');
  const [formSaturday, setFormSaturday] = useState('');
  const [formSunday, setFormSunday] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setFormAddress(settings.address || '');
      setFormPhone(settings.phone || '');
      setFormWhatsappNumber(settings.whatsappNumber || '');
      setFormLogoUrl(settings.logoUrl || null);
      if (settings.operatingHours) {
        setFormWeekdays(settings.operatingHours.weekdays || '');
        setFormSaturday(settings.operatingHours.saturday || '');
        setFormSunday(settings.operatingHours.sunday || '');
      }
    }
  }, [settings]);

  // 1. Authorization Lock
  useEffect(() => {
    if (!loadingAuth) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'ADMIN') {
        setErrorMsg('Security Clearence Required: Admin credentials mandatory.');
        setTimeout(() => router.push('/'), 3000);
      } else {
        syncLedgers();
      }
    }
  }, [user, loadingAuth]);

  // 2. Sync all admin datastores
  async function syncLedgers() {
    try {
      setLoadingData(true);
      setErrorMsg('');
      setSuccessMsg('');

      const ts = Date.now();

      // A. Sync Inventory
      const invRes = await axios.get(`${BACKEND_URL}/api/vehicles?_t=${ts}`);
      if (invRes.data && invRes.data.vehicles) {
        // Parse images if returned as string
        const parsed = invRes.data.vehicles.map((v: any) => {
          let imgs = [];
          if (typeof v.images === 'string') {
            try { imgs = JSON.parse(v.images); } catch (e) { imgs = [v.images]; }
          } else { imgs = v.images; }
          return { ...v, images: imgs };
        });
        setInventory(parsed);
      }

      // B. Sync Bookings
      const bookRes = await axios.get(`${BACKEND_URL}/api/bookings/ledger?_t=${ts}`);
      const bookingsRaw = bookRes.data?.bookings || bookRes.data?.ledger || bookRes.data?.data;
      if (bookingsRaw) {
        const parsedBookings = bookingsRaw.map((b: any) => {
          let imgs = [];
          if (b.vehicle && typeof b.vehicle.images === 'string') {
            try { imgs = JSON.parse(b.vehicle.images); } catch (e) { imgs = [b.vehicle.images]; }
          } else if (b.vehicle && b.vehicle.images) { 
            imgs = b.vehicle.images; 
          }
          return { ...b, vehicle: b.vehicle ? { ...b.vehicle, images: imgs } : null };
        });
        setBookings(parsedBookings);
      }

      // C. Sync Offers
      const offerRes = await axios.get(`${BACKEND_URL}/api/offers/manager?_t=${ts}`);
      const offersRaw = offerRes.data?.offers || offerRes.data?.data;
      if (offersRaw) {
        const parsedOffers = offersRaw.map((o: any) => {
          let imgs = [];
          if (o.vehicle && typeof o.vehicle.images === 'string') {
            try { imgs = JSON.parse(o.vehicle.images); } catch (e) { imgs = [o.vehicle.images]; }
          } else if (o.vehicle && o.vehicle.images) { 
            imgs = o.vehicle.images; 
          }
          return { ...o, vehicle: o.vehicle ? { ...o.vehicle, images: imgs } : null };
        });
        setOffers(parsedOffers);
      }

      // D. Sync Customers Directories
      const custRes = await axios.get(`${BACKEND_URL}/api/settings/customers?_t=${ts}`);
      if (custRes.data && custRes.data.registry) {
        setCustomers(custRes.data.registry);
      }

      setSuccessMsg('All registers synchronized successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error('Failed to sync administrative datastores:', err);
      setErrorMsg('Failed to sync server metadata. Check backend connection.');
    } finally {
      setLoadingData(false);
    }
  };

  // 3. Multi-image file uploader via Multer memory buffer
  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      setUploadingImages(true);
      setSuccessMsg('');
      setErrorMsg('');

      const res = await axios.post(`${BACKEND_URL}/api/vehicles/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.urls) {
        setFormImages((prev) => [...prev, ...res.data.urls]);
        setSuccessMsg(`Sharp Engine: compressed ${res.data.urls.length} images successfully.`);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setErrorMsg(err.response?.data?.message || 'Error processing Sharp image compressor.');
    } finally {
      setUploadingImages(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoadingData(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await axios.put(`${BACKEND_URL}/api/settings`, {
        address: formAddress,
        phone: formPhone,
        whatsappNumber: formWhatsappNumber,
        logoUrl: formLogoUrl,
        operatingHours: {
          weekdays: formWeekdays,
          saturday: formSaturday,
          sunday: formSunday,
        },
      });

      if (res.data) {
        setSuccessMsg('Dealership global settings updated successfully.');
        await loadSettings(); // Reload global settings context
      }
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setErrorMsg(
        err.response?.data?.error || 
        err.response?.data?.message || 
        'Error updating global dealership settings.'
      );
    } finally {
      setLoadingData(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    formData.append('images', files[0]);

    try {
      setUploadingLogo(true);
      setSuccessMsg('');
      setErrorMsg('');

      const res = await axios.post(`${BACKEND_URL}/api/vehicles/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data && res.data.urls && res.data.urls.length > 0) {
        setFormLogoUrl(res.data.urls[0]);
        setSuccessMsg('Logo uploaded successfully.');
      }
    } catch (err: any) {
      console.error('Logo upload error:', err);
      setErrorMsg(err.response?.data?.message || 'Error processing logo image compressor.');
    } finally {
      setUploadingLogo(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // 4. Save Vehicle CRUD Routine (Supports Add and Update)
  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formMake || !formModel || !formPrice) {
      setErrorMsg('Vehicle Brand, Model, and Price parameters are mandatory.');
      return;
    }

    // Assemble finance warranty parameters as JSON strings if active
    const financeObject = formFinanceActive ? JSON.stringify({
      minDownpayment: Number(formDownpayment) || Number(formPrice) * 0.15,
      aprRate: Number(formApr) || 4.9,
      durationMonths: Number(formTermMonths) || 60
    }) : null;

    const warrantyObject = formFinanceActive ? JSON.stringify({
      durationYears: Number(formWarrantyYears) || 3,
      scopeCoverage: formWarrantyScope || 'Full Powertrain Concierge Warranty'
    }) : null;

    const payload = {
      make: formMake,
      model: formModel,
      year: Number(formYear),
      color: formColor,
      mileage: Number(formMileage),
      price: Number(formPrice),
      transmission: formTransmission,
      engine: formEngine,
      fuelType: formFuelType,
      bodyStyle: formBodyStyle,
      seats: Number(formSeats),
      doors: Number(formDoors),
      description: formDescription,
      status: formStatus,
      images: JSON.stringify(formImages),
      isFinanceWarrantyActive: formFinanceActive,
      financeData: financeObject,
      warrantyData: warrantyObject,
    };

    try {
      setLoadingData(true);
      setErrorMsg('');
      setSuccessMsg('');

      if (isEditing && editingVehicleId) {
        await axios.put(`${BACKEND_URL}/api/vehicles/${editingVehicleId}`, payload);
        setSuccessMsg('Dealership asset specifications updated.');
      } else {
        await axios.post(`${BACKEND_URL}/api/vehicles`, payload);
        setSuccessMsg('New luxury model appended to Digital Showroom.');
      }

      // Reset Form states
      resetForm();
      syncLedgers();
    } catch (err: any) {
      console.error('Save error:', err);
      setErrorMsg(err.response?.data?.message || 'Error saving vehicle details.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleEditClick = (vehicle: Vehicle) => {
    setIsEditing(true);
    setEditingVehicleId(vehicle.id);
    
    setFormMake(vehicle.make);
    setFormModel(vehicle.model);
    setFormYear(vehicle.year);
    setFormColor(vehicle.color);
    setFormMileage(vehicle.mileage);
    setFormPrice(vehicle.price);
    setFormTransmission(vehicle.transmission);
    setFormEngine(vehicle.engine);
    setFormFuelType(vehicle.fuelType);
    setFormBodyStyle(vehicle.bodyStyle);
    setFormSeats(vehicle.seats);
    setFormDoors(vehicle.doors);
    setFormDescription(vehicle.description);
    setFormStatus(vehicle.status);
    setFormImages(vehicle.images);
    setFormFinanceActive(vehicle.isFinanceWarrantyActive);

    // Set sub-finance states
    if (vehicle.isFinanceWarrantyActive) {
      if (vehicle.financeData) {
        try {
          const fin = JSON.parse(vehicle.financeData);
          setFormDownpayment(fin.minDownpayment || 0);
          setFormApr(fin.aprRate || 4.9);
          setFormTermMonths(fin.durationMonths || 60);
        } catch (e) {}
      }
      if (vehicle.warrantyData) {
        try {
          const war = JSON.parse(vehicle.warrantyData);
          setFormWarrantyYears(war.durationYears || 3);
          setFormWarrantyScope(war.scopeCoverage || '');
        } catch (e) {}
      }
    } else {
      setFormDownpayment(0);
      setFormApr(4.9);
      setFormTermMonths(60);
      setFormWarrantyYears(3);
      setFormWarrantyScope('');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Retire this luxury vehicle asset from active digital showroom feeds?')) return;
    try {
      setLoadingData(true);
      await axios.delete(`${BACKEND_URL}/api/vehicles/${id}`);
      setSuccessMsg('Asset cataloged retired successfully.');
      syncLedgers();
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMsg('Failed to retire asset.');
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditingVehicleId(null);
    setFormMake('');
    setFormModel('');
    setFormYear(2026);
    setFormColor('');
    setFormMileage(0);
    setFormPrice(0);
    setFormTransmission('Automatic');
    setFormEngine('');
    setFormFuelType('Gasoline');
    setFormBodyStyle('Coupe');
    setFormSeats(2);
    setFormDoors(2);
    setFormDescription('');
    setFormStatus('ON_SALE');
    setFormImages([]);
    setFormFinanceActive(false);
    setFormDownpayment(0);
    setFormApr(4.9);
    setFormTermMonths(60);
    setFormWarrantyYears(3);
    setFormWarrantyScope('');
  };

  // Helper: show SMS toast for 4 seconds
  const showSmsToast = (sent: boolean, message: string) => {
    setSmsToast({ visible: true, sent, message });
    setTimeout(() => setSmsToast(null), 4000);
  };

  // 5. Update Booking Event Resolution (with SMS feedback)
  const handleUpdateBookingStatus = async (id: string, newStatus: 'CONFIRMED' | 'CANCELED') => {
    // If cancelling, show modal first
    if (newStatus === 'CANCELED') {
      const b = bookings.find((bk) => bk.id === id);
      setCancelModal({ open: true, bookingId: id, customerName: b?.user?.name || 'this customer' });
      return;
    }
    await _doUpdateBookingStatus(id, newStatus);
  };

  const _doUpdateBookingStatus = async (id: string, newStatus: 'CONFIRMED' | 'CANCELED') => {
    setCancelModal(null);
    setBookingActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await axios.patch(`${BACKEND_URL}/api/bookings/${id}/status`, { status: newStatus });
      const label = newStatus === 'CONFIRMED' ? 'Confirmed ✅' : 'Cancelled ❌';
      setSuccessMsg(`Booking ${label} — SMS notification dispatched to customer.`);

      // Show SMS toast
      const smsSent: boolean = res.data?.smsSent ?? false;
      const smsLog: string   = res.data?.smsLog   ?? 'No SMS info returned.';
      showSmsToast(smsSent, smsSent ? `SMS sent to customer.` : smsLog);

      syncLedgers();
    } catch (err: any) {
      console.error('Booking resolve error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update booking status.');
    } finally {
      setBookingActionLoading((prev) => ({ ...prev, [id]: false }));
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // 6. Resolve Customer Proposal Negotiation
  const handleUpdateOfferStatus = async (id: string, newStatus: 'ACCEPTED' | 'DECLINED') => {
    try {
      setLoadingData(true);
      await axios.patch(`${BACKEND_URL}/api/offers/${id}/status`, { status: newStatus });
      setSuccessMsg(`Acquisition proposal status resolved: ${newStatus}`);
      syncLedgers();
    } catch (err: any) {
      console.error('Offer resolve error:', err);
      setErrorMsg('Failed to resolve price proposal.');
    } finally {
      setLoadingData(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // 7. Trigger Newsletter blast to customer registry list
  const handleTriggerNewsletter = async (vehicleId: string) => {
    if (!window.confirm('Trigger portfolio email blast for this stock item to all registered customer directories?')) return;
    try {
      setLoadingData(true);
      setSuccessMsg('');
      setErrorMsg('');

      const res = await axios.post(`${BACKEND_URL}/api/settings/newsletter`, { vehicleId });
      setSuccessMsg(res.data.message || 'Newsletter broadcast dispatched successfully.');
    } catch (err: any) {
      console.error('Newsletter blast error:', err);
      setErrorMsg(err.response?.data?.message || 'Error executing transactional newsletter blast.');
    } finally {
      setLoadingData(false);
    }
  };

  // 8. Download PDF/Excel Analytical Reports from Reports engine
  const handleDownloadReport = (type: 'inventory' | 'leads' | 'sales', format: 'pdf' | 'excel') => {
    const url = `${BACKEND_URL}/api/settings/export?format=${format}&type=${type}`;
    // Simple window open or download link
    window.open(url, '_blank');
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4">
        <div className="max-w-md w-full bg-card border border-card-border p-8 rounded-lg shadow-xl text-center space-y-6">
          <ShieldAlert className="text-red-500 mx-auto animate-pulse" size={60} />
          <h2 className="text-2xl font-black uppercase tracking-tight text-foreground font-display">Access Restricted</h2>
          <p className="text-sm text-text-muted leading-relaxed">
            {errorMsg || 'J&L Autos administrative credentials clearance required to view this panel ledger.'}
          </p>
          <div className="flex justify-center">
            <RefreshCw size={24} className="animate-spin text-accent" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HEADER SECTION */}
        <header className="mb-10 bg-card border border-card-border p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-accent/15 rounded-full flex items-center justify-center border border-accent/20">
              <Sliders size={28} className="text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground font-display">
                  Corporate Command Panel
                </h1>
                <span className="px-2.5 py-0.5 text-[9px] font-extrabold bg-red-600 text-white tracking-widest uppercase rounded">
                  Admin Master
                </span>
              </div>
              <p className="text-xs text-foreground/50 mt-1 uppercase tracking-wider font-semibold">
                Authorized Executive Session: {user?.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Link
              href="/profile"
              className="flex items-center gap-2 bg-card hover:bg-foreground/5 border border-card-border text-foreground px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <User size={14} /> Profile
            </Link>
            <button
              onClick={syncLedgers}
              className="flex items-center gap-2 bg-card hover:bg-foreground/5 border border-card-border text-foreground px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <RefreshCw size={14} className={loadingData ? 'animate-spin' : ''} /> Sync Registers
            </button>
          </div>
        </header>

        {/* MESSAGES ALERTS */}
        {errorMsg && (
          <div className="flex gap-2 items-start bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm mb-6">
            <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex gap-2 items-start bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl text-sm mb-6">
            <ShieldCheck size={18} className="flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* TABS SELECTOR PANEL */}
        <div className="flex border-b border-card-border overflow-x-auto gap-2 sm:gap-6 mb-8 scrollbar-thin">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'inventory' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <Car size={15} /> Catalog Inventory
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'bookings' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <Calendar size={15} /> CRM Bookings ({bookings.length})
          </button>

          <button
            onClick={() => setActiveTab('offers')}
            className={`py-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'offers' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <DollarSign size={15} /> Client Proposals ({offers.length})
          </button>

          <button
            onClick={() => setActiveTab('newsletter')}
            className={`py-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'newsletter' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <Mail size={15} /> Newsletter Hub
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'reports' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <TrendingUp size={15} /> Analytical Ledgers
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 text-xs font-bold uppercase tracking-wider border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'settings' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-foreground'
            }`}
          >
            <Settings size={15} /> Global Settings
          </button>
        </div>

        {/* CONTAINER SWITCH BODY */}
        <div className="space-y-8">
          
          {/* TAB 1: CATALOG INVENTORY CMS */}
          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Form Input Columns (Span 2) */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-card border border-card-border p-6 rounded-xl space-y-6">
                  <div className="flex justify-between items-center border-b border-card-border pb-3">
                    <h3 className="font-extrabold text-base uppercase text-foreground">
                      {isEditing ? 'Modify Active Stock Asset' : 'Add Luxury Showroom Model'}
                    </h3>
                    {isEditing && (
                      <button
                        onClick={resetForm}
                        className="text-xs text-text-muted hover:text-foreground font-bold uppercase"
                      >
                        Reset Form
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSaveVehicle} className="space-y-6">
                    
                    {/* Basic Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Manufacturer / Brand</label>
                        <input
                          type="text"
                          placeholder="e.g. Porsche"
                          required
                          value={formMake}
                          onChange={(e) => setFormMake(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Model Name</label>
                        <input
                          type="text"
                          placeholder="e.g. 911 GT3 RS"
                          required
                          value={formModel}
                          onChange={(e) => setFormModel(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Production Year</label>
                        <input
                          type="number"
                          required
                          value={formYear}
                          onChange={(e) => setFormYear(Number(e.target.value))}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent font-mono"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Valuation price (USD)</label>
                        <input
                          type="number"
                          required
                          value={formPrice}
                          onChange={(e) => setFormPrice(Number(e.target.value))}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent font-bold"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Mileage Target</label>
                        <input
                          type="number"
                          required
                          value={formMileage}
                          onChange={(e) => setFormMileage(Number(e.target.value))}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Gearbox Configuration</label>
                        <select
                          value={formTransmission}
                          onChange={(e) => setFormTransmission(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm focus:ring-1 focus:ring-accent"
                        >
                          <option value="Automatic">Automatic (PDK / DSG)</option>
                          <option value="Manual">Manual Stick Shift</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Engine Spec / Cylinder layout</label>
                        <input
                          type="text"
                          placeholder="e.g. 4.0L Flat-6 Naturally Aspirated"
                          required
                          value={formEngine}
                          onChange={(e) => setFormEngine(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Silhouette / Chassis</label>
                        <select
                          value={formBodyStyle}
                          onChange={(e) => setFormBodyStyle(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm focus:ring-1 focus:ring-accent"
                        >
                          <option value="Coupe">Coupe</option>
                          <option value="Sedan">Sedan</option>
                          <option value="SUV">SUV</option>
                          <option value="Convertible">Convertible</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] font-bold uppercase text-text-muted">Seats</label>
                          <input
                            type="number"
                            value={formSeats}
                            onChange={(e) => setFormSeats(Number(e.target.value))}
                            className="bg-background border border-card-border text-foreground p-2 rounded text-xs text-center"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] font-bold uppercase text-text-muted">Doors</label>
                          <input
                            type="number"
                            value={formDoors}
                            onChange={(e) => setFormDoors(Number(e.target.value))}
                            className="bg-background border border-card-border text-foreground p-2 rounded text-xs text-center"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Exterior Hue</label>
                        <input
                          type="text"
                          placeholder="e.g. Shark Blue"
                          required
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Fuel Chemistry</label>
                        <select
                          value={formFuelType}
                          onChange={(e) => setFormFuelType(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm focus:ring-1 focus:ring-accent"
                        >
                          <option value="Gasoline">Gasoline</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Electric">Electric</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Catalog status Badge</label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as any)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm focus:ring-1 focus:ring-accent font-bold"
                        >
                          <option value="ON_SALE">ON SALE / AVAILABLE</option>
                          <option value="RESERVED">RESERVED</option>
                          <option value="SOLD">SOLD</option>
                        </select>
                      </div>

                    </div>

                    {/* Description */}
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Curator Description notes</label>
                      <textarea
                        rows={4}
                        required
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Detail performance metrics, factory options, packages, and historical details..."
                        className="bg-background border border-card-border text-foreground px-3.5 py-2.5 rounded text-sm outline-none resize-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    {/* Sharp Compressed Media Uploader */}
                    <div className="bg-background border border-card-border p-4 rounded-lg space-y-3">
                      <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Asset Media Gallery</label>
                      
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
                        >
                          <Upload size={14} />
                          <span>Upload Multi-Images</span>
                        </button>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          ref={fileInputRef}
                          onChange={handleUploadImages}
                          className="hidden"
                        />
                        
                        {uploadingImages && (
                          <div className="flex items-center gap-1.5 text-xs text-text-muted">
                            <RefreshCw size={12} className="animate-spin text-accent" />
                            <span>Processing Sharp compression engine...</span>
                          </div>
                        )}
                      </div>

                      {formImages.length > 0 && (
                        <div className="grid grid-cols-5 gap-2 pt-2">
                          {formImages.map((url, idx) => (
                            <div key={idx} className="relative aspect-video rounded overflow-hidden border border-card-border bg-zinc-950">
                              <img src={getImageUrl(url)} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setFormImages((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* INVISIBLE FINANCE / WARRANTY INTERACTIVE TOGGLES */}
                    <div className="bg-background border border-card-border p-5 rounded-lg space-y-4">
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase text-foreground">Activate Downpayment & Warranty Package</span>
                          <span className="text-[10px] text-text-muted">Allow customers to view estimation calculators and powertrain shields on this catalog item</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formFinanceActive}
                            onChange={(e) => setFormFinanceActive(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                        </label>
                      </div>

                      {formFinanceActive && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-card-border/50 animate-fade-in">
                          
                          {/* Downpayment minima */}
                          <div className="flex flex-col space-y-1">
                            <label className="text-[9px] font-bold uppercase text-text-muted">Minimum Downpayment Target (USD)</label>
                            <input
                              type="number"
                              value={formDownpayment}
                              onChange={(e) => setFormDownpayment(Number(e.target.value))}
                              placeholder={`Default: $${(formPrice * 0.15).toLocaleString()}`}
                              className="bg-card border border-card-border p-2 rounded text-xs"
                            />
                          </div>

                          {/* Interest Rate */}
                          <div className="flex flex-col space-y-1">
                            <label className="text-[9px] font-bold uppercase text-text-muted">Annual Interest APR (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              value={formApr}
                              onChange={(e) => setFormApr(Number(e.target.value))}
                              className="bg-card border border-card-border p-2 rounded text-xs"
                            />
                          </div>

                          {/* Duration Months */}
                          <div className="flex flex-col space-y-1">
                            <label className="text-[9px] font-bold uppercase text-text-muted">Amortization Term Limit (Months)</label>
                            <input
                              type="number"
                              value={formTermMonths}
                              onChange={(e) => setFormTermMonths(Number(e.target.value))}
                              className="bg-card border border-card-border p-2 rounded text-xs"
                            />
                          </div>

                          {/* Warranty Duration */}
                          <div className="flex flex-col space-y-1">
                            <label className="text-[9px] font-bold uppercase text-text-muted">Warranty Duration (Years)</label>
                            <input
                              type="number"
                              value={formWarrantyYears}
                              onChange={(e) => setFormWarrantyYears(Number(e.target.value))}
                              className="bg-card border border-card-border p-2 rounded text-xs"
                            />
                          </div>

                          {/* Warranty Details */}
                          <div className="flex flex-col space-y-1 sm:col-span-2">
                            <label className="text-[9px] font-bold uppercase text-text-muted">Warranty Shield Details</label>
                            <textarea
                              rows={2}
                              value={formWarrantyScope}
                              onChange={(e) => setFormWarrantyScope(e.target.value)}
                              placeholder="e.g. Full Bumper-to-Bumper Powertrain warranty, covering diff gears, suspension, and high-flow exhausts..."
                              className="bg-card border border-card-border p-2 rounded text-xs resize-none"
                            />
                          </div>

                        </div>
                      )}

                    </div>

                    <button
                      type="submit"
                      className="w-full bg-accent hover:bg-accent-hover text-white py-3.5 rounded text-xs font-bold uppercase tracking-widest transition-colors shadow-md shadow-accent/20"
                    >
                      {isEditing ? 'Save asset adjustments' : 'Append Catalog stock'}
                    </button>

                  </form>
                </div>
              </div>

              {/* Inventory Feed Sidebar (Span 1) */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-card border border-card-border p-6 rounded-xl space-y-4">
                  <h3 className="font-extrabold text-base uppercase text-foreground border-b border-card-border pb-3">
                    Active Catalog Inventory ({inventory.length})
                  </h3>

                  <div className="space-y-3 max-h-[85vh] overflow-y-auto pr-1">
                    {inventory.map((vehicle) => {
                      const img = getImageUrl(vehicle.images[0], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=150');
                      return (
                        <div
                          key={vehicle.id}
                          className="bg-background border border-card-border p-3 rounded flex justify-between items-center gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <img src={img} className="w-12 h-9 object-cover rounded bg-zinc-950" />
                            <div>
                              <h4 className="font-bold text-xs uppercase text-foreground leading-tight">
                                {vehicle.make} {vehicle.model}
                              </h4>
                              <div className="flex gap-2 items-center text-[9px] text-text-muted mt-0.5">
                                <span>${Number(vehicle.price).toLocaleString()}</span>
                                <span>&bull;</span>
                                <span className={
                                  vehicle.status === 'ON_SALE' ? 'text-emerald-500 font-semibold' :
                                  vehicle.status === 'RESERVED' ? 'text-amber-500 font-semibold' :
                                  'text-red-500 font-semibold'
                                }>{vehicle.status}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleEditClick(vehicle)}
                              className="p-1.5 bg-card border border-card-border hover:border-accent hover:text-accent rounded transition-colors text-text-muted"
                              title="Edit specifications"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteVehicle(vehicle.id)}
                              className="p-1.5 bg-card border border-card-border hover:border-red-500 hover:text-red-500 rounded transition-colors text-text-muted"
                              title="Retire asset catalog"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: CRM BOOKINGS TIMELINE */}
          {activeTab === 'bookings' && (
            <div className="bg-card border border-card-border p-6 rounded-xl space-y-6">
              <div className="border-b border-card-border pb-3 flex justify-between items-center">
                <h3 className="font-extrabold text-base uppercase text-foreground">
                  CRM VIP Bookings Ledger ({bookings.length})
                </h3>
              </div>

              {bookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-card-border text-text-muted uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">Client Detail</th>
                        <th className="py-3 px-4">Dealership Asset Target</th>
                        <th className="py-3 px-4">Calendar Date / Slot</th>
                        <th className="py-3 px-4">Event Class</th>
                        <th className="py-3 px-4">Active Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/60">
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-foreground/5 transition-colors">
                          
                          {/* Client Detail */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground">{booking.user.name}</div>
                            <div className="text-[10px] text-text-muted">{booking.user.email} &bull; {booking.user.phone || 'No phone'}</div>
                          </td>

                          {/* Asset Target */}
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-foreground">
                              {booking.vehicle ? `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}` : 'Vehicle Deleted'}
                            </span>
                          </td>

                          {/* Calendar */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-foreground">
                              {new Date(booking.date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </div>
                            <div className="text-[10px] text-text-muted font-mono">{booking.timeSlot}</div>
                          </td>

                          {/* Class */}
                          <td className="py-3.5 px-4 font-bold">
                            <span className="text-[9px] uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-white rounded px-2.5 py-0.5">
                              {booking.eventType === 'VISIT' ? 'PRIVATE VIEW' : 'VIP TEST DRIVE'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            {booking.status === 'PENDING' && (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-500 rounded border border-blue-500/20 uppercase">
                                PENDING CRM
                              </span>
                            )}
                            {booking.status === 'CONFIRMED' && (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 uppercase">
                                CONFIRMED VIP
                              </span>
                            )}
                            {booking.status === 'CANCELED' && (
                              <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/10 text-red-500 rounded border border-red-500/20 uppercase">
                                CANCELED
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            {booking.status === 'PENDING' ? (
                              <div className="flex justify-end gap-1.5">
                                {/* CONFIRM button */}
                                <button
                                  id={`confirm-booking-${booking.id}`}
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'CONFIRMED')}
                                  disabled={!!bookingActionLoading[booking.id]}
                                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                                  title="Confirm booking & SMS customer"
                                >
                                  {bookingActionLoading[booking.id] ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <Check size={11} />
                                  )}
                                  Confirm
                                </button>
                                {/* CANCEL button */}
                                <button
                                  id={`cancel-booking-${booking.id}`}
                                  onClick={() => handleUpdateBookingStatus(booking.id, 'CANCELED')}
                                  disabled={!!bookingActionLoading[booking.id]}
                                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                                  title="Cancel booking & SMS customer"
                                >
                                  {bookingActionLoading[booking.id] ? (
                                    <RefreshCw size={11} className="animate-spin" />
                                  ) : (
                                    <X size={11} />
                                  )}
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="text-right">
                                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded ${
                                  booking.status === 'CONFIRMED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                  {booking.status === 'CONFIRMED' ? '✅ Confirmed' : '❌ Cancelled'}
                                </span>
                                <div className="text-[9px] text-text-muted mt-1">SMS sent to client</div>
                              </div>
                            )}
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-background border border-card-border rounded-lg">
                  <Calendar size={36} className="mx-auto text-text-muted mb-3 opacity-40" />
                  <h4 className="font-bold text-sm uppercase text-foreground">No VIP Bookings</h4>
                  <p className="text-xs text-text-muted">No scheduled viewings under CRM evaluation.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRICE PROPOSALS CLIENT OFFERS */}
          {activeTab === 'offers' && (
            <div className="bg-card border border-card-border p-6 rounded-xl space-y-6">
              <div className="border-b border-card-border pb-3 flex justify-between items-center">
                <h3 className="font-extrabold text-base uppercase text-foreground">
                  Proposals & Negotiations Pipeline ({offers.length})
                </h3>
              </div>

              {offers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-card-border text-text-muted uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">Client Detail</th>
                        <th className="py-3 px-4">Asset Details</th>
                        <th className="py-3 px-4">Valuation Price</th>
                        <th className="py-3 px-4">Acquisition Offer</th>
                        <th className="py-3 px-4">Differential</th>
                        <th className="py-3 px-4">Negotiation status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/60">
                      {offers.map((offer) => {
                        const discount = Math.round(((offer.vehicle.price - offer.offerAmount) / offer.vehicle.price) * 100);
                        const isUnder = offer.offerAmount < offer.vehicle.price;

                        return (
                          <tr key={offer.id} className="hover:bg-foreground/5 transition-colors">
                            
                            {/* Client Detail */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground">{offer.user.name}</div>
                              <div className="text-[10px] text-text-muted">{offer.user.email} &bull; {offer.user.phone || 'No phone'}</div>
                            </td>

                            {/* Asset Detail */}
                            <td className="py-3.5 px-4">
                              <span className="font-semibold text-foreground">
                                {offer.vehicle.year} {offer.vehicle.make} {offer.vehicle.model}
                              </span>
                            </td>

                            {/* Book Valuation */}
                            <td className="py-3.5 px-4 font-mono">
                              ${Number(offer.vehicle.price).toLocaleString()}
                            </td>

                            {/* Acquisition offer */}
                            <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                              ${Number(offer.offerAmount).toLocaleString()}
                            </td>

                            {/* Differential */}
                            <td className="py-3.5 px-4">
                              {isUnder ? (
                                <span className="text-red-500 font-semibold bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10 text-[10px]">
                                  -{discount}% Under valuation
                                </span>
                              ) : (
                                <span className="text-emerald-500 font-semibold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 text-[10px]">
                                  Bargain Price match
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 font-bold">
                              {offer.status === 'UNDER_REVIEW' && (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-500 rounded border border-blue-500/20 uppercase">
                                  UNDER REVIEW
                                </span>
                              )}
                              {offer.status === 'ACCEPTED' && (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 uppercase">
                                  ACCEPTED & LOCK
                                </span>
                              )}
                              {offer.status === 'DECLINED' && (
                                <span className="px-2 py-0.5 text-[9px] font-bold bg-red-500/10 text-red-500 rounded border border-red-500/20 uppercase">
                                  DECLINED
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              {offer.status === 'UNDER_REVIEW' ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleUpdateOfferStatus(offer.id, 'ACCEPTED')}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded transition-all"
                                    title="Accept proposal and Reserve asset"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateOfferStatus(offer.id, 'DECLINED')}
                                    className="bg-red-600 hover:bg-red-700 text-white p-1.5 rounded transition-all"
                                    title="Decline price offer"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-text-muted font-bold uppercase">Resolved</span>
                              )}
                            </td>

                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-background border border-card-border rounded-lg">
                  <DollarSign size={36} className="mx-auto text-text-muted mb-3 opacity-40" />
                  <h4 className="font-bold text-sm uppercase text-foreground">No proposals registered</h4>
                  <p className="text-xs text-text-muted">No pricing proposals transmitted yet.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NEWSLETTER BLAST HUB */}
          {activeTab === 'newsletter' && (
            <div className="bg-card border border-card-border p-6 rounded-xl space-y-6">
              <div className="border-b border-card-border pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base uppercase text-foreground">
                    Newsletter Broadcasting Centre
                  </h3>
                  <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                    Announce new arrivals and stock updates directly to your registered user directory. Total Registered Subscribers: <strong className="text-foreground">{customers.length}</strong>.
                  </p>
                </div>
              </div>

              {inventory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventory.map((vehicle) => {
                    const img = getImageUrl(vehicle.images[0], 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&q=80&w=200');
                    return (
                      <div
                        key={vehicle.id}
                        className="bg-background border border-card-border p-4 rounded-lg flex justify-between items-center gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img src={img} className="w-16 h-12 object-cover rounded bg-zinc-950" />
                          <div>
                            <h4 className="font-bold text-xs uppercase text-foreground leading-tight">
                              {vehicle.make} {vehicle.model}
                            </h4>
                            <span className="text-[10px] text-text-muted mt-0.5 block">
                              Year: {vehicle.year} &bull; Reserve Price: ${Number(vehicle.price).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleTriggerNewsletter(vehicle.id)}
                          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm"
                        >
                          <Mail size={12} />
                          <span>Trigger Portfolio Blast</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-background border border-card-border rounded-lg">
                  <Mail size={36} className="mx-auto text-text-muted mb-3 opacity-40" />
                  <h4 className="font-bold text-sm uppercase text-foreground">No inventory stock</h4>
                  <p className="text-xs text-text-muted">No stock available for broadcasts.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ANALYTICAL REPORTS EXPORTER */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              
              {/* Reports Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* PDF/Excel 1: Showroom Inventory Valuation */}
                <div className="bg-card border border-card-border p-6 rounded-xl space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-10 w-10 bg-accent/15 rounded-md flex items-center justify-center border border-accent/20">
                      <Car size={20} className="text-accent" />
                    </div>
                    <h3 className="font-extrabold text-sm uppercase text-foreground tracking-tight">Showroom Inventory Valuation</h3>
                    <p className="text-xs text-text-muted leading-relaxed font-light">
                      Asset breakdown list indicating individual model catalog dates, silhouette types, status levels, and book valuation pricing targets.
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-card-border/50">
                    <button
                      onClick={() => handleDownloadReport('inventory', 'pdf')}
                      className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText size={12} /> Download PDF Ledger
                    </button>
                    <button
                      onClick={() => handleDownloadReport('inventory', 'excel')}
                      className="w-full bg-card hover:bg-foreground/5 border border-card-border text-foreground py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet size={12} className="text-emerald-500" /> Download Excel Sheet
                    </button>
                  </div>
                </div>

                {/* PDF/Excel 2: CRM Leads Scheduling Appointments */}
                <div className="bg-card border border-card-border p-6 rounded-xl space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-10 w-10 bg-accent/15 rounded-md flex items-center justify-center border border-accent/20">
                      <Users size={20} className="text-accent" />
                    </div>
                    <h3 className="font-extrabold text-sm uppercase text-foreground tracking-tight">Active Customer CRM Leads</h3>
                    <p className="text-xs text-text-muted leading-relaxed font-light">
                      Compiles complete scheduling appointment queues, VIP test drives, client profiles, contact metrics, and reservation resolutions.
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-card-border/50">
                    <button
                      onClick={() => handleDownloadReport('leads', 'pdf')}
                      className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText size={12} /> Download PDF Ledger
                    </button>
                    <button
                      onClick={() => handleDownloadReport('leads', 'excel')}
                      className="w-full bg-card hover:bg-foreground/5 border border-card-border text-foreground py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet size={12} className="text-emerald-500" /> Download Excel Sheet
                    </button>
                  </div>
                </div>

                {/* PDF/Excel 3: Closed Acquisitions and Revenue */}
                <div className="bg-card border border-card-border p-6 rounded-xl space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-10 w-10 bg-accent/15 rounded-md flex items-center justify-center border border-accent/20">
                      <TrendingUp size={20} className="text-accent" />
                    </div>
                    <h3 className="font-extrabold text-sm uppercase text-foreground tracking-tight">Sales & Revenue Performance</h3>
                    <p className="text-xs text-text-muted leading-relaxed font-light">
                      Financial ledger tracing closed negotiation proposals, total revenue generation volume, buyer demographics, and closing timelines.
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-card-border/50">
                    <button
                      onClick={() => handleDownloadReport('sales', 'pdf')}
                      className="w-full bg-accent hover:bg-accent-hover text-white py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileText size={12} /> Download PDF Ledger
                    </button>
                    <button
                      onClick={() => handleDownloadReport('sales', 'excel')}
                      className="w-full bg-card hover:bg-foreground/5 border border-card-border text-foreground py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <FileSpreadsheet size={12} className="text-emerald-500" /> Download Excel Sheet
                    </button>
                  </div>
                </div>

              </div>

              {/* CRM Subscriptions registry ledger list */}
              <div className="bg-card border border-card-border p-6 rounded-xl space-y-4">
                <h3 className="font-extrabold text-sm uppercase text-foreground border-b border-card-border pb-3">
                  Dealership Customer Directory ({customers.length})
                </h3>

                {customers.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-card-border text-text-muted uppercase font-bold tracking-wider">
                          <th className="py-2.5">Subscriber Name</th>
                          <th className="py-2.5">Email / Phone</th>
                          <th className="py-2.5">Join Date</th>
                          <th className="py-2.5 text-center">Faves</th>
                          <th className="py-2.5 text-center">VIP Bookings</th>
                          <th className="py-2.5 text-center">Submitted Offers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border/40">
                        {customers.map((c) => (
                          <tr key={c.id} className="hover:bg-foreground/5">
                            <td className="py-3 font-semibold text-foreground">{c.name}</td>
                            <td className="py-3 text-text-muted">{c.email} {c.phone ? `/ ${c.phone}` : ''}</td>
                            <td className="py-3 text-text-muted">{new Date(c.createdAt).toLocaleDateString()}</td>
                            <td className="py-3 text-center font-bold">{c._count?.favorites || 0}</td>
                            <td className="py-3 text-center font-bold text-accent">{c._count?.bookings || 0}</td>
                            <td className="py-3 text-center font-bold">{c._count?.offers || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted font-light">No customers registered in dealership directories.</p>
                )}
              </div>

            </div>
          )}

          {/* TAB 6: GLOBAL DEALERSHIP SETTINGS CMS */}
          {activeTab === 'settings' && (
            <div className="bg-card border border-card-border p-6 rounded-xl space-y-6 max-w-4xl shadow-sm text-foreground">
              <div className="border-b border-card-border pb-3">
                <h3 className="font-extrabold text-sm uppercase text-foreground">Global Dealership Configurations</h3>
                <p className="text-xs text-text-muted mt-1 font-light leading-relaxed font-sans">
                  Configure corporate contact directories, location addresses, official WhatsApp profiles, operating schedules, and upload corporate logos to display dynamically on the site header.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Section A: Contact Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Concierge Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1 (214) 608-0670"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent font-medium"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">WhatsApp Directory Number (Digits Only)</label>
                    <input
                      type="text"
                      placeholder="12146080670"
                      value={formWhatsappNumber}
                      onChange={(e) => setFormWhatsappNumber(e.target.value)}
                      className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent font-medium"
                    />
                  </div>
                </div>

                {/* Section B: Showroom Location */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Dealership Flagship Address</label>
                  <input
                    type="text"
                    placeholder="100 Premium Way, Suite 400, Beverly Hills, CA 90210"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent font-medium"
                  />
                </div>

                {/* Section C: Operating Schedules */}
                <div className="border-t border-card-border/50 pt-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-accent mb-3">Operating Hours</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-text-muted">Weekdays (Mon - Fri)</label>
                      <input
                        type="text"
                        placeholder="9:00 AM - 6:00 PM"
                        value={formWeekdays}
                        onChange={(e) => setFormWeekdays(e.target.value)}
                        className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent font-medium"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-text-muted">Saturday</label>
                      <input
                        type="text"
                        placeholder="10:00 AM - 5:00 PM"
                        value={formSaturday}
                        onChange={(e) => setFormSaturday(e.target.value)}
                        className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent font-medium"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-bold uppercase text-text-muted">Sunday</label>
                      <input
                        type="text"
                        placeholder="Closed"
                        value={formSunday}
                        onChange={(e) => setFormSunday(e.target.value)}
                        className="bg-card border border-card-border text-foreground px-3.5 py-2.5 rounded-md text-sm outline-none focus:ring-1 focus:ring-accent font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Section D: Logo Uploader */}
                <div className="border-t border-card-border/50 pt-4 space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-accent">Dealership Logo Brand</h4>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6 bg-zinc-950 p-4 rounded-lg border border-card-border">
                    <div className="h-16 w-44 bg-card border border-card-border rounded flex items-center justify-center overflow-hidden flex-shrink-0 p-2">
                      {formLogoUrl ? (
                        <img
                          src={getImageUrl(formLogoUrl)}
                          alt="Showroom Logo Preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">No Brand Logo</span>
                      )}
                    </div>

                    <div className="flex-grow space-y-2 w-full sm:w-auto">
                      <p className="text-xs text-text-muted leading-relaxed font-light font-sans">
                        Upload an image (transparent PNG or SVG recommended) to replace the text header `J&L AUTOS` dynamically with your custom branding logo.
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={logoInputRef}
                          onChange={handleUploadLogo}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                          className="bg-accent/15 border border-accent/20 hover:bg-accent/25 text-accent px-4 py-2 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {uploadingLogo ? (
                            <>
                              <RefreshCw size={12} className="animate-spin" />
                              <span>Compressing logo...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={12} />
                              <span>Upload Corporate Logo</span>
                            </>
                          )}
                        </button>

                        {formLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormLogoUrl(null)}
                            className="text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-wider px-2 py-2"
                          >
                            Remove Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Submit Row */}
                <div className="border-t border-card-border/50 pt-6 flex justify-end">
                  <button
                    type="submit"
                    className="bg-accent hover:bg-accent-hover text-white px-8 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-accent/20"
                  >
                    Save Showroom Settings
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
