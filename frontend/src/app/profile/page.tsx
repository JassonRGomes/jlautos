'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useThemeAuth } from '@/context/ThemeAuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Camera, Save, Lock, User as UserIcon, Loader2 } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export default function ProfilePage() {
  const { user, loadProfile, loadingAuth } = useThemeAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
    
    if (user) {
      setName(user.name);
      if (user.image) {
        setImagePreview(user.image);
      }
    }
  }, [user, loadingAuth, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size should be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      let imageUrl = user?.image;
      
      // If a new image was selected, upload it
      if (imageFile) {
        const formData = new FormData();
        formData.append('avatar', imageFile);
        
        try {
          const uploadRes = await axios.post(`${BACKEND_URL}/api/upload/avatar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          imageUrl = uploadRes.data.url;
        } catch (uploadErr) {
          console.error("Upload error (fallback to base64):", uploadErr);
          // Fallback to base64 if the upload endpoint doesn't exist
          imageUrl = imagePreview;
        }
      }
      
      const payload: any = {
        name,
        image: imageUrl
      };
      
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      
      await axios.put(`${BACKEND_URL}/api/auth/profile`, payload);
      
      setSuccess("Profile updated successfully!");
      setNewPassword('');
      setCurrentPassword('');
      await loadProfile(); // Refresh the user context
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Profile Management</h1>
          <p className="text-text-muted">Update your personal information and security settings.</p>
        </div>
        
        <div className="bg-card border border-card-border rounded-xl p-8 shadow-xl">
          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-card-border">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-card-border bg-foreground/5 flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={40} className="text-text-muted" />
                  )}
                </div>
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Profile Photo</h3>
                <p className="text-sm text-text-muted mb-3">Upload a new profile picture. Max size 5MB.</p>
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold px-3 py-1.5 border border-foreground/20 rounded hover:border-accent hover:text-accent transition-colors"
                >
                  Choose File
                </button>
              </div>
            </div>
            
            {/* User Details */}
            <div className="space-y-5 pb-8 border-b border-card-border">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              
              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="block w-full px-4 py-2.5 bg-foreground/5 border border-card-border rounded-lg text-text-muted text-sm opacity-70 cursor-not-allowed"
                  />
                  <p className="text-xs text-text-muted mt-1.5">Email cannot be changed.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="block w-full px-4 py-2.5 bg-background border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
            
            {/* Security */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Lock size={18} className="text-accent" /> Security
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">New Password (optional)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-background border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                    placeholder="Leave blank to keep current"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-background border border-card-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
                    placeholder="Required if changing password"
                  />
                </div>
              </div>
            </div>
            
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
            
            {success && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
                {success}
              </div>
            )}
            
            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-foreground/10 text-foreground rounded-lg text-sm font-semibold hover:bg-foreground/20 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-accent/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />}
                Save Changes
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  );
}
