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
  bookingReference: string;
  customerId: string;
  customer?: { name: string; email: string; phone?: string };
  vehicleId: string;
  vehicle?: Vehicle;
  bookingDate: string;
  bookingTime: string;
  status: string;
  customerNotes?: string;
  dealerNotes?: string;
  cancellationReason?: string;
  rejectionReason?: string;
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
    favorites: number;
  };
}

type AdminTab = 'inventory' | 'bookings' | 'newsletter' | 'reports' | 'settings';

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
  const [rejectModal, setRejectModal] = useState<{ open: boolean; bookingId: string; customerName: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; bookingId: string; customerName: string } | null>(null);
  const [modifyModal, setModifyModal] = useState<{ open: boolean; booking: any } | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState('');
  const [cancellationReasonText, setCancellationReasonText] = useState('');
  
  // Reschedule Form states
  const [modifyDate, setModifyDate] = useState('');
  const [modifyTimeSlot, setModifyTimeSlot] = useState('');
  const [modifyVehicleId, setModifyVehicleId] = useState('');
  const [modifyNotes, setModifyNotes] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');

  const [smsToast, setSmsToast] = useState<{ visible: boolean; sent: boolean; message: string } | null>(null);


  // Inventory Database states
  const [inventory, setInventory] = useState<Vehicle[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  // CRM Databases states
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);

  // Inventory CMS Form states
  const [formMake, setFormMake] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formYear, setFormYear] = useState<number | ''>('');
  const [formColor, setFormColor] = useState('');
  const [formMileage, setFormMileage] = useState<number | ''>('');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formTransmission, setFormTransmission] = useState('');
  const [formEngine, setFormEngine] = useState('');
  const [formFuelType, setFormFuelType] = useState('');
  const [formBodyStyle, setFormBodyStyle] = useState('');
  const [formSeats, setFormSeats] = useState<number | ''>('');
  const [formDoors, setFormDoors] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'ON_SALE' | 'RESERVED' | 'SOLD' | ''>('');
  
  // Finance / Warranty database toggles
  const [formFinanceActive, setFormFinanceActive] = useState(false);
  const [formDownpayment, setFormDownpayment] = useState<number | ''>('');
  const [formApr, setFormApr] = useState<number | ''>('');
  const [formTermMonths, setFormTermMonths] = useState<number | ''>('');
  const [formWarrantyYears, setFormWarrantyYears] = useState<number | ''>('');
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

  // 2. Sync all admin datastores — each source is independent so one failure won't block others
  // Mock missing functions to fix TypeScript build errors
  const handleCompleteBooking = async (id: string) => {
    try {
      setBookingActionLoading(prev => ({ ...prev, [id]: true }));
      const token = localStorage.getItem('jl_auth_token');
      await axios.put(`${BACKEND_URL}/api/dealer/bookings/${id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      syncLedgers();
    } catch (err: any) {
      console.error('Complete error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to complete booking');
    } finally {
      setBookingActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSoftDeleteBookingSubmit = async (e: any) => {
    e.preventDefault();
    if (!deleteModal) return;
    const id = deleteModal.bookingId;
    try {
      setBookingActionLoading(prev => ({ ...prev, [id]: true }));
      const token = localStorage.getItem('jl_auth_token');
      await axios.delete(`${BACKEND_URL}/api/dealer/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteModal(null);
      syncLedgers();
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to delete booking');
    } finally {
      setBookingActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleModifyBookingSubmit = async (e: any) => {
    e.preventDefault();
    if (!modifyModal) return;
    const id = modifyModal.booking.id;
    try {
      setBookingActionLoading(prev => ({ ...prev, [id]: true }));
      const token = localStorage.getItem('jl_auth_token');
      await axios.put(`${BACKEND_URL}/api/dealer/bookings/${id}/modify`, {
        bookingDate: modifyDate,
        bookingTime: modifyTimeSlot,
        vehicleId: modifyVehicleId,
        dealerNotes: modifyNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setModifyModal(null);
      syncLedgers();
    } catch (err: any) {
      console.error('Modify error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to modify booking');
    } finally {
      setBookingActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRejectBookingSubmit = async (e: any) => {
    e.preventDefault();
    if (!rejectModal) return;
    const id = rejectModal.bookingId;
    try {
      setBookingActionLoading(prev => ({ ...prev, [id]: true }));
      const token = localStorage.getItem('jl_auth_token');
      await axios.put(`${BACKEND_URL}/api/dealer/bookings/${id}/reject`, {
        rejectionReason: rejectionReasonText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRejectModal(null);
      setRejectionReasonText('');
      syncLedgers();
    } catch (err: any) {
      console.error('Reject error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to reject booking');
    } finally {
      setBookingActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleCancelBookingSubmit = async (e: any) => {
    e.preventDefault();
    if (!cancelModal) return;
    const id = cancelModal.bookingId;
    try {
      setBookingActionLoading(prev => ({ ...prev, [id]: true }));
      const token = localStorage.getItem('jl_auth_token');
      await axios.put(`${BACKEND_URL}/api/dealer/bookings/${id}/cancel`, {
        cancellationReason: cancellationReasonText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCancelModal(null);
      setCancellationReasonText('');
      syncLedgers();
    } catch (err: any) {
      console.error('Cancel error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setBookingActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const fetchDashboardStats = async () => {
    setLoadingData(true);
    let syncErrors: string[] = [];
    const ts = Date.now();
  };

  async function syncLedgers() {
    setLoadingData(true);
    setErrorMsg('');
    setSuccessMsg('');

    const ts = Date.now();
    const token = typeof window !== 'undefined' ? localStorage.getItem('jl_auth_token') : null;
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
    const syncErrors: string[] = [];

    // A. Sync Inventory (public endpoint — no auth needed)
    try {
      const invRes = await axios.get(`${BACKEND_URL}/api/vehicles?_t=${ts}`);
      if (invRes.data?.vehicles) {
        const parsed = invRes.data.vehicles.map((v: any) => {
          let imgs: string[] = [];
          if (typeof v.images === 'string') {
            try { imgs = JSON.parse(v.images); } catch { imgs = [v.images]; }
          } else if (Array.isArray(v.images)) {
            imgs = v.images;
          }
          return { ...v, images: imgs };
        });
        setInventory(parsed);
      }
    } catch (err: any) {
      console.error('[Sync] Inventory fetch failed:', err);
      syncErrors.push('Inventory');
    }

    // B. Sync Bookings (admin-only endpoint)
    // Silently ensure test_drive_bookings table exists before querying
    try { await axios.get(`${BACKEND_URL}/api/settings/fix-bookings`); } catch { /* silent */ }
    try {
      const bookRes = await axios.get(
        `${BACKEND_URL}/api/dealer/bookings?limit=1000&_t=${ts}`,
        { headers: authHeader }
      );
      const bookingsRaw = bookRes.data?.data;
      if (Array.isArray(bookingsRaw)) {
        const parsedBookings = bookingsRaw.map((b: any) => {
          let imgs: string[] = [];
          if (b.vehicle && typeof b.vehicle.images === 'string') {
            try { imgs = JSON.parse(b.vehicle.images); } catch { imgs = [b.vehicle.images]; }
          } else if (b.vehicle && Array.isArray(b.vehicle.images)) {
            imgs = b.vehicle.images;
          }
          return { ...b, vehicle: b.vehicle ? { ...b.vehicle, images: imgs } : null };
        });
        setBookings(parsedBookings);
      }
    } catch (err: any) {
      console.error('[Sync] Bookings fetch failed:', err);
      syncErrors.push('Bookings');
    }

      // D. Sync Customers Directories
      try {
        const custRes = await axios.get(`${BACKEND_URL}/api/settings/customers?_t=${ts}`);
        if (custRes.data && custRes.data.registry) {
          setCustomers(custRes.data.registry);
        }
      } catch (err: any) {
        console.error('[Sync] Customers fetch failed:', err);
        syncErrors.push('Customers');
      }

    setLoadingData(false);

    if (syncErrors.length === 0) {
      setSuccessMsg('All registers synchronized successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else if (syncErrors.length < 4) {
      // Partial success — some loaded, some didn't
      setSuccessMsg(`Sync complete (partial). Failed sections: ${syncErrors.join(', ')}. Check console for details.`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } else {
      // Everything failed — likely a real connection problem
      setErrorMsg('Failed to sync server metadata. Check backend connection and authentication.');
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

      const token = localStorage.getItem('jl_auth_token');
      const res = await axios.post(`${BACKEND_URL}/api/vehicles/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
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

      const token = localStorage.getItem('jl_auth_token');
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
      }, {
        headers: { Authorization: `Bearer ${token}` }
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

      const token = localStorage.getItem('jl_auth_token');
      const res = await axios.post(`${BACKEND_URL}/api/vehicles/upload`, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
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
      minDownpayment: formDownpayment !== '' ? Number(formDownpayment) : null,
      aprRate: formApr !== '' ? Number(formApr) : null,
      durationMonths: formTermMonths !== '' ? Number(formTermMonths) : null
    }) : null;

    const warrantyObject = formFinanceActive ? JSON.stringify({
      durationYears: formWarrantyYears !== '' ? Number(formWarrantyYears) : null,
      scopeCoverage: formWarrantyScope !== '' ? formWarrantyScope : null
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

      const token = localStorage.getItem('jl_auth_token');
      if (isEditing && editingVehicleId) {
        await axios.put(`${BACKEND_URL}/api/vehicles/${editingVehicleId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuccessMsg('Dealership asset specifications updated.');
      } else {
        await axios.post(`${BACKEND_URL}/api/vehicles`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
          const fin = typeof vehicle.financeData === 'string' ? JSON.parse(vehicle.financeData) : vehicle.financeData;
          setFormDownpayment(fin?.minDownpayment ?? '');
          setFormApr(fin?.aprRate ?? '');
          setFormTermMonths(fin?.durationMonths ?? '');
        } catch (e) { console.error('Error parsing financeData', e); }
      }
      if (vehicle.warrantyData) {
        try {
          const war = typeof vehicle.warrantyData === 'string' ? JSON.parse(vehicle.warrantyData) : vehicle.warrantyData;
          setFormWarrantyYears(war?.durationYears ?? '');
          setFormWarrantyScope(war?.scopeCoverage ?? '');
        } catch (e) { console.error('Error parsing warrantyData', e); }
      }
    } else {
      setFormDownpayment('');
      setFormApr('');
      setFormTermMonths('');
      setFormWarrantyYears('');
      setFormWarrantyScope('');
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!window.confirm('Retire this luxury vehicle asset from active digital showroom feeds?')) return;
    try {
      setLoadingData(true);
      const token = localStorage.getItem('jl_auth_token');
      await axios.delete(`${BACKEND_URL}/api/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    setFormYear('');
    setFormColor('');
    setFormMileage('');
    setFormPrice('');
    setFormTransmission('');
    setFormEngine('');
    setFormFuelType('');
    setFormBodyStyle('');
    setFormSeats('');
    setFormDoors('');
    setFormDescription('');
    setFormStatus('');
    setFormImages([]);
    setFormFinanceActive(false);
    setFormDownpayment('');
    setFormApr('');
    setFormTermMonths('');
    setFormWarrantyYears('');
    setFormWarrantyScope('');
  };

  // Helper: show SMS toast for 4 seconds
  const showSmsToast = (sent: boolean, message: string) => {
    setSmsToast({ visible: true, sent, message });
    setTimeout(() => setSmsToast(null), 4000);
  };

  // 5. Test Drive Booking Action Resolvers
  const handleApproveBooking = async (id: string) => {
    setBookingActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem('jl_auth_token');
      const res = await axios.put(`${BACKEND_URL}/api/dealer/bookings/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMsg('Booking approved successfully. Invitation dispatched.');
      const smsSent = res.data?.smsSent ?? true;
      showSmsToast(smsSent, smsSent ? 'SMS sent to customer.' : 'SMS dispatch mock.');
      syncLedgers();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to approve booking.');
    } finally {
      setBookingActionLoading((prev) => ({ ...prev, [id]: false }));
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // 7. Trigger Newsletter blast to customer registry list
  const handleTriggerNewsletter = async (vehicleId: string) => {
    if (!window.confirm('Trigger portfolio email blast for this stock item to all registered customer directories?')) return;
    try {
      setLoadingData(true);
      setSuccessMsg('');
      setErrorMsg('');

      const token = localStorage.getItem('jl_auth_token');
      const res = await axios.post(`${BACKEND_URL}/api/settings/newsletter`, { vehicleId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMsg(res.data.message || 'Newsletter broadcast dispatched successfully.');
    } catch (err: any) {
      console.error('Newsletter blast error:', err);
      setErrorMsg(err.response?.data?.message || 'Error executing transactional newsletter blast.');
    } finally {
      setLoadingData(false);
    }
  };

  // 8. Download PDF/Excel Analytical Reports from Reports engine
  const handleDownloadReport = async (type: 'inventory' | 'leads' | 'sales', format: 'pdf' | 'excel') => {
    try {
      const token = localStorage.getItem('jl_auth_token');
      const response = await axios.get(`${BACKEND_URL}/api/settings/export?format=${format}&type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { 
        type: format === 'pdf' 
          ? 'application/pdf' 
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `jlautos_report_${type}_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to generate document. Please check your connection and try again.');
    }
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
                          onChange={(e) => setFormYear(e.target.value === '' ? '' : Number(e.target.value))}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent font-mono"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Valuation price (USD)</label>
                        <input
                          type="text"
                          required
                          value={formPrice === '' ? '' : formPrice.toLocaleString('en-US')}
                          onChange={(e) => {
                            const parsed = e.target.value.replace(/[^0-9]/g, '');
                            setFormPrice(parsed === '' ? '' : Number(parsed));
                          }}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent font-bold"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Mileage Target</label>
                        <input
                          type="number"
                          required
                          value={formMileage}
                          onChange={(e) => setFormMileage(e.target.value === '' ? '' : Number(e.target.value))}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Gearbox Configuration</label>
                        <select
                          required
                          value={formTransmission}
                          onChange={(e) => setFormTransmission(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm focus:ring-1 focus:ring-accent"
                        >
                          <option value="" disabled>Select option...</option>
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
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Class</label>
                        <select
                          required
                          value={formBodyStyle}
                          onChange={(e) => setFormBodyStyle(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm focus:ring-1 focus:ring-accent"
                        >
                          <option value="" disabled>Select option...</option>
                          <option value="Microcar">Microcar</option>
                          <option value="Subcompact Car">Subcompact Car</option>
                          <option value="Compact Car">Compact Car</option>
                          <option value="Mid-size Car">Mid-size Car</option>
                          <option value="Full-size Car">Full-size Car</option>
                          <option value="Station Wagon">Station Wagon</option>
                          <option value="Hatchback">Hatchback</option>
                          <option value="Convertible">Convertible</option>
                          <option value="Sports Car">Sports Car</option>
                          <option value="Supercar">Supercar</option>
                          <option value="Muscle Car">Muscle Car</option>
                          <option value="Compact SUV">Compact SUV</option>
                          <option value="Mid-size SUV">Mid-size SUV</option>
                          <option value="Full-size SUV">Full-size SUV</option>
                          <option value="Crossover (CUV)">Crossover (CUV)</option>
                          <option value="Minivan">Minivan</option>
                          <option value="Compact Pickup Truck">Compact Pickup Truck</option>
                          <option value="Mid-size Pickup Truck">Mid-size Pickup Truck</option>
                          <option value="Full-size Pickup Truck">Full-size Pickup Truck</option>
                          <option value="Heavy Duty Pickup Truck">Heavy Duty Pickup Truck</option>
                          <option value="Cargo Van">Cargo Van</option>
                          <option value="Passenger Van">Passenger Van</option>
                          <option value="Luxury Vehicle">Luxury Vehicle</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] font-bold uppercase text-text-muted">Seats</label>
                          <input
                            type="number"
                            required
                            value={formSeats}
                            onChange={(e) => setFormSeats(e.target.value === '' ? '' : Number(e.target.value))}
                            className="bg-background border border-card-border text-foreground p-2 rounded text-xs text-center"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[9px] font-bold uppercase text-text-muted">Doors</label>
                          <input
                            type="number"
                            required
                            value={formDoors}
                            onChange={(e) => setFormDoors(e.target.value === '' ? '' : Number(e.target.value))}
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
                          required
                          value={formFuelType}
                          onChange={(e) => setFormFuelType(e.target.value)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm focus:ring-1 focus:ring-accent"
                        >
                          <option value="" disabled>Select option...</option>
                          <option value="Gasoline">Gasoline</option>
                          <option value="Diesel">Diesel</option>
                          <option value="Electric">Electric</option>
                          <option value="Hybrid">Hybrid</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-text-muted tracking-wider">Catalog status Badge</label>
                        <select
                          required
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as any)}
                          className="bg-background border border-card-border text-foreground px-3 py-2.5 rounded text-sm focus:ring-1 focus:ring-accent font-bold"
                        >
                          <option value="" disabled>Select option...</option>
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
                              type="text"
                              value={formDownpayment === '' ? '' : formDownpayment.toLocaleString('en-US')}
                              onChange={(e) => {
                                const parsed = e.target.value.replace(/[^0-9]/g, '');
                                setFormDownpayment(parsed === '' ? '' : Number(parsed));
                              }}
                              placeholder={`Default: $${(Number(formPrice) * 0.15).toLocaleString()}`}
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
                              onChange={(e) => setFormApr(e.target.value === '' ? '' : Number(e.target.value))}
                              className="bg-card border border-card-border p-2 rounded text-xs"
                            />
                          </div>

                          {/* Duration Months */}
                          <div className="flex flex-col space-y-1">
                            <label className="text-[9px] font-bold uppercase text-text-muted">Amortization Term Limit (Months)</label>
                            <input
                              type="number"
                              value={formTermMonths}
                              onChange={(e) => setFormTermMonths(e.target.value === '' ? '' : Number(e.target.value))}
                              className="bg-card border border-card-border p-2 rounded text-xs"
                            />
                          </div>

                          {/* Warranty Duration */}
                          <div className="flex flex-col space-y-1">
                            <label className="text-[9px] font-bold uppercase text-text-muted">Warranty Duration (Years)</label>
                            <input
                              type="number"
                              value={formWarrantyYears}
                              onChange={(e) => setFormWarrantyYears(e.target.value === '' ? '' : Number(e.target.value))}
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
              <div className="border-b border-card-border pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base uppercase text-foreground">
                    Test Drive Management ({bookings.length})
                  </h3>
                  <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider font-semibold">
                    Dealer commands for approving, modify, cancelling, and tracking bookings.
                  </p>
                </div>

                {/* Search query input */}
                <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 w-full md:w-80 shadow-inner">
                  <input
                    type="text"
                    placeholder="Search client, email, ref, or vehicle..."
                    value={bookingSearchQuery}
                    onChange={(e) => setBookingSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none text-xs text-foreground outline-none placeholder-text-muted"
                  />
                  {bookingSearchQuery && (
                    <button
                      onClick={() => setBookingSearchQuery('')}
                      className="text-text-muted hover:text-foreground text-[10px] font-bold px-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex flex-wrap gap-2 py-1">
                {[
                  { label: 'All Requests', value: '' },
                  { label: 'Pending Approval', value: 'Pending Approval' },
                  { label: 'Approved', value: 'Approved' },
                  { label: 'Modified', value: 'Modified' },
                  { label: 'Cancelled', value: 'Cancelled' },
                  { label: 'Completed', value: 'Completed' },
                  { label: 'Rejected', value: 'Rejected' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={() => setBookingStatusFilter(btn.value)}
                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer border ${
                      bookingStatusFilter === btn.value
                        ? 'bg-accent border-accent text-white shadow-sm'
                        : 'bg-black/30 border-white/5 text-text-muted hover:text-foreground hover:border-white/15'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {(() => {
                const filteredBookings = bookings.filter((b) => {
                  const matchStatus = bookingStatusFilter
                    ? (bookingStatusFilter === 'Modified' ? b.status.startsWith('Modified') : b.status === bookingStatusFilter)
                    : true;
                  
                  if (!matchStatus) return false;

                  if (bookingSearchQuery) {
                    const q = bookingSearchQuery.toLowerCase();
                    const n = b.customer?.name?.toLowerCase() || '';
                    const e = b.customer?.email?.toLowerCase() || '';
                    const r = b.bookingReference?.toLowerCase() || '';
                    const v = b.vehicle ? `${b.vehicle.make} ${b.vehicle.model}`.toLowerCase() : '';
                    return n.includes(q) || e.includes(q) || r.includes(q) || v.includes(q);
                  }
                  
                  return true;
                });

                return filteredBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-card-border text-text-muted uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">Booking ID</th>
                        <th className="py-3 px-4">Client Detail</th>
                        <th className="py-3 px-4">Vehicle secured</th>
                        <th className="py-3 px-4">Date / Time Slot</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border/60">
                      {filteredBookings.map((booking) => {
                        const canApprove = ['Pending Approval', 'Modified by Customer'].includes(booking.status);
                        const canReject = ['Pending Approval', 'Modified by Dealer', 'Modified by Customer'].includes(booking.status);
                        const canCancel = ['Approved', 'Modified by Dealer', 'Modified by Customer'].includes(booking.status);
                        const canModify = ['Pending Approval', 'Approved', 'Modified by Dealer', 'Modified by Customer'].includes(booking.status);
                        const canComplete = ['Approved', 'Modified by Dealer', 'Modified by Customer'].includes(booking.status);
                        const canDelete = ['Completed', 'Cancelled', 'Rejected'].includes(booking.status);

                        return (
                          <tr key={booking.id} className="hover:bg-foreground/5 transition-colors">
                            {/* Booking ID */}
                            <td className="py-3.5 px-4 font-mono font-bold text-accent">
                              #{booking.bookingReference}
                            </td>

                            {/* Client Detail */}
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-foreground">{booking.customer?.name}</div>
                              <div className="text-[10px] text-text-muted">{booking.customer?.email} &bull; {booking.customer?.phone || 'No phone'}</div>
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
                                {new Date(booking.bookingDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-[10px] text-text-muted font-mono">{booking.bookingTime}</div>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${
                                booking.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                                booking.status === 'Pending Approval' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                                booking.status.startsWith('Modified') ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                booking.status === 'Cancelled' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                booking.status === 'Rejected' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                'bg-zinc-500/10 border-zinc-500/20 text-zinc-400' // Completed
                              }`}>
                                {booking.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex justify-end gap-1.5 flex-wrap">
                                {canApprove && (
                                  <button
                                    onClick={() => handleApproveBooking(booking.id)}
                                    disabled={!!bookingActionLoading[booking.id]}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                    title="Approve & Send Invitation"
                                  >
                                    Approve
                                  </button>
                                )}
                                
                                {canComplete && (
                                  <button
                                    onClick={() => handleCompleteBooking(booking.id)}
                                    disabled={!!bookingActionLoading[booking.id]}
                                    className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                    title="Mark Completed"
                                  >
                                    Complete
                                  </button>
                                )}

                                {canModify && (
                                  <button
                                    onClick={() => {
                                      setModifyDate(booking.bookingDate ? booking.bookingDate.split('T')[0] : '');
                                      setModifyTimeSlot(booking.bookingTime || '');
                                      setModifyVehicleId(booking.vehicleId || '');
                                      setModifyNotes(booking.dealerNotes || '');
                                      setModifyModal({ open: true, booking });
                                    }}
                                    disabled={!!bookingActionLoading[booking.id]}
                                    className="bg-amber-500/15 hover:bg-amber-500/25 disabled:opacity-50 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                    title="Modify Appointment"
                                  >
                                    Modify
                                  </button>
                                )}

                                {canReject && (
                                  <button
                                    onClick={() => setRejectModal({ open: true, bookingId: booking.id, customerName: booking.customer?.name || 'Customer' })}
                                    disabled={!!bookingActionLoading[booking.id]}
                                    className="bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-400 border border-red-500/30 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                    title="Reject Request"
                                  >
                                    Reject
                                  </button>
                                )}

                                {canCancel && (
                                  <button
                                    onClick={() => setCancelModal({ open: true, bookingId: booking.id, customerName: booking.customer?.name || 'Customer' })}
                                    disabled={!!bookingActionLoading[booking.id]}
                                    className="bg-red-500/15 hover:bg-red-500/25 disabled:opacity-50 text-red-400 border border-red-500/30 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                    title="Cancel Appointment"
                                  >
                                    Cancel
                                  </button>
                                )}

                                {canDelete && (
                                  <button
                                    onClick={() => setDeleteModal({ open: true, bookingId: booking.id, customerName: booking.customer?.name || 'Customer' })}
                                    disabled={!!bookingActionLoading[booking.id]}
                                    className="bg-black/30 hover:bg-black/50 disabled:opacity-50 text-text-muted px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                                    title="Archive Booking"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-background border border-card-border rounded-lg">
                  <Calendar size={36} className="mx-auto text-text-muted mb-3 opacity-40" />
                  <h4 className="font-bold text-sm uppercase text-foreground">No VIP Bookings</h4>
                  <p className="text-xs text-text-muted">No scheduled viewings match the current filter criteria.</p>
                </div>
              );
              })()}
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
                    <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Reservation Phone Number</label>
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

      {/* 4. DEALER DIALOGS & MODALS */}
      {/* Reschedule/Modify Modal */}
      {modifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-card-border p-6 rounded-2xl shadow-2xl relative space-y-5">
            <button
              onClick={() => setModifyModal(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-foreground cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="border-b border-card-border pb-3">
              <span className="text-[9px] font-extrabold text-accent uppercase tracking-widest font-mono">RESERVATIONS CRM</span>
              <h3 className="text-xl font-bold uppercase text-foreground mt-0.5">Reschedule Appointment</h3>
            </div>
            
            <form onSubmit={handleModifyBookingSubmit} className="space-y-4 text-xs">
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Assign Showroom Vehicle</span>
                <select
                  required
                  value={modifyVehicleId}
                  onChange={(e) => setModifyVehicleId(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-foreground px-3.5 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="" disabled>Select vehicle...</option>
                  {inventory.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} (${Number(v.price).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">New Booking Date</span>
                <input
                  type="date"
                  required
                  value={modifyDate}
                  onChange={(e) => setModifyDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-foreground px-3.5 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Operational Slot</span>
                <div className="grid grid-cols-3 gap-2">
                  {['09:00 AM', '10:30 AM', '01:00 PM', '03:00 PM', '04:30 PM'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setModifyTimeSlot(slot)}
                      className={`py-2 px-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                        modifyTimeSlot === slot
                          ? 'bg-accent border-accent text-white shadow-md'
                          : 'bg-black/30 border-white/5 text-foreground hover:border-accent/40'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Dealer Instructions / Notes</span>
                <textarea
                  rows={2}
                  value={modifyNotes}
                  onChange={(e) => setModifyNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-foreground px-3.5 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-card-border/50">
                <button
                  type="button"
                  onClick={() => setModifyModal(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Reschedule & Notify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-card-border p-6 rounded-2xl shadow-2xl relative space-y-5">
            <button
              onClick={() => setRejectModal(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-foreground cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="border-b border-card-border pb-3">
              <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest font-mono">REJECT REQUEST</span>
              <h3 className="text-xl font-bold uppercase text-foreground mt-0.5">Reject Booking</h3>
            </div>
            
            <form onSubmit={handleRejectBookingSubmit} className="space-y-4 text-xs">
              <p className="text-text-muted">
                You are rejecting the test drive request from <strong className="text-foreground">{rejectModal.customerName}</strong>. Please provide a mandatory rejection reason to inform the customer.
              </p>
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Reason for Rejection *</span>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. The selected vehicle is booked for maintenance on this date."
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-foreground px-3.5 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-card-border/50">
                <button
                  type="button"
                  onClick={() => setRejectModal(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={!rejectionReasonText.trim()}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-card-border p-6 rounded-2xl shadow-2xl relative space-y-5">
            <button
              onClick={() => setCancelModal(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-foreground cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="border-b border-card-border pb-3">
              <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest font-mono">CANCEL APPOINTMENT</span>
              <h3 className="text-xl font-bold uppercase text-foreground mt-0.5">Cancel Approved Booking</h3>
            </div>
            
            <form onSubmit={handleCancelBookingSubmit} className="space-y-4 text-xs">
              <p className="text-text-muted">
                You are cancelling the approved test drive for <strong className="text-foreground">{cancelModal.customerName}</strong>. Please provide a mandatory cancellation reason.
              </p>
              <div className="flex flex-col space-y-1.5">
                <span className="text-[10px] font-bold text-text-muted uppercase">Reason for Cancellation *</span>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Dealership floor will be closed for a private event."
                  value={cancellationReasonText}
                  onChange={(e) => setCancellationReasonText(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 text-foreground px-3.5 py-2.5 rounded-lg outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-card-border/50">
                <button
                  type="button"
                  onClick={() => setCancelModal(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={!cancellationReasonText.trim()}
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Booking Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-card border border-card-border p-6 rounded-2xl shadow-2xl relative space-y-5">
            <button
              onClick={() => setDeleteModal(null)}
              className="absolute top-4 right-4 text-text-muted hover:text-foreground cursor-pointer"
            >
              <X size={20} />
            </button>
            <div className="border-b border-card-border pb-3">
              <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest font-mono">ARCHIVE RECORD</span>
              <h3 className="text-xl font-bold uppercase text-foreground mt-0.5">Delete Booking</h3>
            </div>
            
            <form onSubmit={handleSoftDeleteBookingSubmit} className="space-y-4 text-xs">
              <p className="text-text-muted">
                Are you sure you want to archive this booking request for <strong className="text-foreground">{deleteModal.customerName}</strong>? This action cannot be fully undone.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-card-border/50">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
