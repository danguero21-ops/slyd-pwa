import React, { useState, useRef } from 'react';
import { UserProfile, ProfilePhoto } from '../types';
import { RACES, INTERESTS } from '../constants';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Globe, 
  Lock, 
  Star, 
  Camera, 
  Upload, 
  Sparkles, 
  Check, 
  ChevronLeft, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { compressImage } from '../src/lib/image-utils';

interface ProfileEditProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => Promise<boolean | void> | void;
  onClose: () => void;
}

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Julian',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=George',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=William',
];

const ProfileEdit: React.FC<ProfileEditProps> = ({ profile, onUpdate, onClose }) => {
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [newPhotoPrivacy, setNewPhotoPrivacy] = useState<boolean>(false); // false = public, true = private
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize photos list from profile.photos or fallback to profile.imageUrl
  const [photos, setPhotos] = useState<ProfilePhoto[]>(() => {
    if (profile.photos && profile.photos.length > 0) {
      return profile.photos.map(p => ({
        id: p.id || `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        url: p.url,
        isPrivate: Boolean(p.isPrivate),
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
        caption: p.caption || (p.isPrivate ? 'Private Photo' : 'Public Photo')
      }));
    }
    return [
      {
        id: 'photo_primary',
        url: profile.imageUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=FreshUser',
        isPrivate: false,
        createdAt: Date.now(),
        caption: 'Main Profile Photo'
      }
    ];
  });

  const [currentMainUrl, setCurrentMainUrl] = useState<string>(profile.imageUrl);

  // Local form state for inputs to prevent saving on every keystroke
  const [formData, setFormData] = useState<UserProfile>(() => ({
    ...profile,
    name: profile.name || '',
    age: profile.age || 18,
    bio: profile.bio || '',
    role: profile.role || 'Vers',
    race: profile.race || 'White',
    relationshipStatus: profile.relationshipStatus || 'Single',
    hostTravel: profile.hostTravel || 'Both',
    interests: profile.interests || []
  }));

  const [heightFeet, setHeightFeet] = useState(() => {
    const match = profile.height?.match(/(\d+)'/);
    return match ? parseInt(match[1]) : 5;
  });
  const [heightInches, setHeightInches] = useState(() => {
    const match = profile.height?.match(/'(\d+)/);
    return match ? parseInt(match[1]) : 9;
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 3500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper to persist updated photos immediately
  const persistPhotos = async (updatedPhotos: ProfilePhoto[], newMain: string) => {
    setPhotos(updatedPhotos);
    setCurrentMainUrl(newMain);
    setFormData(prev => ({
      ...prev,
      photos: updatedPhotos,
      imageUrl: newMain
    }));

    try {
      await onUpdate({
        ...formData,
        photos: updatedPhotos,
        imageUrl: newMain,
        referenceSelfieUrl: profile.referenceSelfieUrl || formData.referenceSelfieUrl || '',
        height: `${heightFeet}'${heightInches}\"`,
        weight: formData.weight && !formData.weight.includes('lbs') ? `${formData.weight}lbs` : formData.weight
      });
      return true;
    } catch (err) {
      console.error("Auto-persist error", err);
      showToast("Error saving picture to database. Check connection.", 'error');
      return false;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset file input value so selecting the same file again works
    e.target.value = '';

    if (!file) return;

    setIsProcessingImage(true);
    try {
      // Compress the uploaded file directly
      const compressed = await compressImage(file, 500, 0.65);
      
      const newPhoto: ProfilePhoto = {
        id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        url: compressed,
        isPrivate: newPhotoPrivacy,
        createdAt: Date.now(),
        caption: newPhotoPrivacy ? 'Private Photo' : 'Public Photo'
      };

      const updated = [...photos, newPhoto];
      const shouldBeMain = !newPhotoPrivacy && (!currentMainUrl || photos.length === 0);
      const nextMain = shouldBeMain ? compressed : currentMainUrl;

      await persistPhotos(updated, nextMain);
      showToast(newPhotoPrivacy ? "Picture saved to Private Vault" : "Public picture added to profile!");
    } catch (err: any) {
      console.error("Image processing error", err);
      showToast("Failed to process image. Please try another file.", 'error');
    } finally {
      setIsProcessingImage(false);
      setShowAddPhotoModal(false);
    }
  };

  const handleSelectAvatar = async (url: string) => {
    const newPhoto: ProfilePhoto = {
      id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      url,
      isPrivate: newPhotoPrivacy,
      createdAt: Date.now(),
      caption: newPhotoPrivacy ? 'Private Avatar' : 'Public Avatar'
    };
    const updated = [...photos, newPhoto];
    const shouldBeMain = !newPhotoPrivacy && (!currentMainUrl || photos.length === 0);
    const nextMain = shouldBeMain ? url : currentMainUrl;

    await persistPhotos(updated, nextMain);
    setShowAvatarPicker(false);
    setShowAddPhotoModal(false);
    showToast(newPhotoPrivacy ? "Avatar saved to Private Vault" : "Public avatar added to profile!");
  };

  const togglePhotoPrivacy = async (photoId: string) => {
    const updated = photos.map(p => {
      if (p.id === photoId) {
        return { ...p, isPrivate: !p.isPrivate };
      }
      return p;
    });

    let nextMain = currentMainUrl;
    const toggledPhoto = photos.find(p => p.id === photoId);
    if (toggledPhoto && toggledPhoto.url === currentMainUrl && !toggledPhoto.isPrivate) {
      const otherPublic = updated.find(p => !p.isPrivate);
      if (otherPublic) {
        nextMain = otherPublic.url;
      }
    }

    const isNowPrivate = updated.find(p => p.id === photoId)?.isPrivate;
    await persistPhotos(updated, nextMain);
    showToast(isNowPrivate ? "Picture moved to Private Vault" : "Picture is now Public");
  };

  const setAsMainPhoto = async (photo: ProfilePhoto) => {
    // A main photo is made public by default so members can see the profile
    const updated = photos.map(p => {
      if (p.id === photo.id) {
        return { ...p, isPrivate: false };
      }
      return p;
    });

    await persistPhotos(updated, photo.url);
    showToast("Updated main profile photo");
  };

  const deletePhoto = async (photoId: string) => {
    if (photos.length <= 1) {
      showToast("You must keep at least 1 profile picture", 'error');
      return;
    }

    const photoToDelete = photos.find(p => p.id === photoId);
    const updated = photos.filter(p => p.id !== photoId);
    let nextMain = currentMainUrl;
    if (photoToDelete && photoToDelete.url === currentMainUrl) {
      nextMain = updated.find(p => !p.isPrivate)?.url || updated[0].url;
    }

    await persistPhotos(updated, nextMain);
    showToast("Picture removed from profile");
  };

  const toggleInterest = (interest: string) => {
    const current = formData.interests || [];
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    setFormData(prev => ({ ...prev, interests: updated }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      showToast("Please provide a display name", 'error');
      return;
    }

    const parsedAge = parseInt(String(formData.age), 10);
    if (isNaN(parsedAge) || parsedAge < 18) {
      showToast("Age must be at least 18", 'error');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate({
        ...formData,
        name: formData.name.trim(),
        age: parsedAge,
        photos,
        imageUrl: currentMainUrl,
        referenceSelfieUrl: profile.referenceSelfieUrl || formData.referenceSelfieUrl || '',
        height: `${heightFeet}'${heightInches}\"`,
        weight: formData.weight && !formData.weight.includes('lbs') ? `${formData.weight}lbs` : formData.weight
      });
      onClose();
    } catch (err: any) {
      console.error("Save error", err);
      showToast("Failed to save changes. Please try again.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const publicCount = photos.filter(p => !p.isPrivate).length;
  const privateCount = photos.filter(p => p.isPrivate).length;

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 flex justify-center animate-in slide-in-from-right duration-300">
      <div className="w-full max-w-md h-full bg-slate-950 flex flex-col overflow-hidden">
        {/* Toast Notification Banner */}
        {statusMessage && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border text-xs font-bold animate-in fade-in slide-in-from-top duration-300 ${
            statusMessage.type === 'error'
              ? 'bg-red-500/90 text-white border-red-400'
              : 'bg-sky-500/90 text-white border-sky-300 shadow-sky-950/50'
          }`}>
            {statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Dedicated Fixed Header */}
        <header className="h-16 px-4 flex items-center justify-between bg-slate-950/95 backdrop-blur-md z-20 border-b border-slate-900 shrink-0">
          <button 
            onClick={onClose} 
            disabled={isSaving}
            className="p-2 hover:bg-slate-800 rounded-2xl transition-colors active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-sky-400" />
          </button>
          <h1 className="text-lg font-black italic tracking-tight text-white font-display">Edit Profile</h1>
          <button 
            onClick={handleSave} 
            disabled={isSaving || isProcessingImage}
            className="bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-sky-950/40 active:scale-95 transition-all flex items-center gap-2"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
        </header>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-6 space-y-8 pb-28">
        {/* MULTIPLE PICTURES & PRIVACY MANAGEMENT SECTION */}
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black uppercase tracking-wider text-white font-display">
                  Profile Pictures & Vault
                </h2>
                <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-bold">
                  {photos.length} Total
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Set each photo as <span className="text-sky-400 font-semibold">Public</span> or <span className="text-amber-400 font-semibold">Private</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddPhotoModal(true)}
              disabled={isProcessingImage || isSaving}
              className="bg-sky-500 hover:bg-sky-400 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-lg shadow-sky-900/40 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Picture</span>
            </button>
          </div>

          {/* Counts pill breakdown */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20 font-semibold">
              <Globe className="w-3.5 h-3.5" />
              <span>{publicCount} Public</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>{privateCount} Private</span>
            </span>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => {
              const isMain = currentMainUrl === photo.url;
              return (
                <div 
                  key={photo.id}
                  className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 bg-slate-950 group shadow-md transition-all ${
                    isMain ? 'border-sky-500 ring-2 ring-sky-500/30' : photo.isPrivate ? 'border-amber-500/40' : 'border-slate-800'
                  }`}
                >
                  <img 
                    src={photo.url} 
                    alt="Profile thumbnail" 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    {/* Public/Private Badge & Toggle Button */}
                    <button
                      type="button"
                      onClick={() => togglePhotoPrivacy(photo.id)}
                      title="Click to toggle Public / Private"
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg transition-transform active:scale-90 ${
                        photo.isPrivate 
                          ? 'bg-amber-500 text-black border border-amber-300 hover:bg-amber-400' 
                          : 'bg-sky-500 text-white border border-sky-400 hover:bg-sky-400'
                      }`}
                    >
                      {photo.isPrivate ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                      <span>{photo.isPrivate ? 'Private' : 'Public'}</span>
                    </button>

                    {/* Delete Photo Button */}
                    {photos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deletePhoto(photo.id)}
                        className="p-1 rounded-md bg-black/60 hover:bg-red-500/80 text-white transition-colors backdrop-blur-sm"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bottom Main Photo Indicator & Selector */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    {isMain ? (
                      <span className="px-2 py-1 rounded-md bg-sky-500 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Main</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAsMainPhoto(photo)}
                        className="px-2 py-1 rounded-md bg-black/60 hover:bg-sky-500 text-slate-300 hover:text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all backdrop-blur-sm"
                        title="Make this your primary profile picture"
                      >
                        <Star className="w-3 h-3 text-sky-400" />
                        <span>Set as Main</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Anti-Catfish & Verification Vault Notice */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-start gap-2.5 text-left">
            <ShieldAlert className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-snug">
              <strong className="text-slate-200 block text-[10px] uppercase tracking-wider mb-0.5">Private Verification Vault</strong>
              Your sign-up verification selfie is stored in a private biometric vault (never in your album and never viewed by the public). Every 24 hours, you snap a live selfie to verify your identity.
            </p>
          </div>
        </div>

        {/* Hidden inputs for camera capture & file picker */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/*" 
          onChange={handleFileUpload} 
        />
        <input 
          type="file" 
          ref={cameraInputRef} 
          className="hidden" 
          accept="image/*" 
          capture="user" 
          onChange={handleFileUpload} 
        />

        {/* PROFILE DETAILS FORM */}
        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Display Name</span>
            <input 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange}
              className="mt-1 block w-full bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-sky-500 text-slate-200 shadow-sm shadow-black/20 font-medium"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Age</span>
              <input 
                type="number"
                name="age" 
                min={18}
                max={100}
                value={formData.age} 
                onChange={handleInputChange}
                className="mt-1 block w-full bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-sky-500 text-slate-200 shadow-sm shadow-black/20"
              />
            </label>

            <label>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Role</span>
              <select 
                name="role" 
                value={formData.role} 
                onChange={handleInputChange}
                className="mt-1 block w-full bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-sky-500 text-slate-200 shadow-sm shadow-black/20 appearance-none"
              >
                <option value="Top">Top</option>
                <option value="Vers">Vers</option>
                <option value="Bottom">Bottom</option>
                <option value="Side">Side</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Height</span>
              <div className="flex gap-2 mt-1">
                <select 
                  value={heightFeet} 
                  onChange={(e) => setHeightFeet(parseInt(e.target.value))}
                  className="w-1/2 bg-slate-900 border-none rounded-xl px-3 py-3 text-slate-200 focus:ring-1 focus:ring-sky-500 shadow-sm shadow-black/20 appearance-none text-center font-bold"
                >
                  {[4, 5, 6, 7].map(f => (
                    <option key={f} value={f}>{f}'</option>
                  ))}
                </select>
                <select 
                  value={heightInches} 
                  onChange={(e) => setHeightInches(parseInt(e.target.value))}
                  className="w-1/2 bg-slate-900 border-none rounded-xl px-3 py-3 text-slate-200 focus:ring-1 focus:ring-sky-500 shadow-sm shadow-black/20 appearance-none text-center font-bold"
                >
                  {Array.from({ length: 12 }, (_, i) => i).map(i => (
                    <option key={i} value={i}>{i}"</option>
                  ))}
                </select>
              </div>
            </div>

            <label>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Weight (lbs)</span>
              <input 
                name="weight" 
                value={formData.weight?.replace('lbs', '') || ''} 
                onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                placeholder="165"
                className="mt-1 block w-full bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-sky-500 text-slate-200 shadow-sm shadow-black/20"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Race</span>
              <select 
                name="race" 
                value={formData.race} 
                onChange={handleInputChange}
                className="mt-1 block w-full bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-sky-500 text-slate-200 shadow-sm shadow-black/20 appearance-none"
              >
                {RACES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Status</span>
              <select 
                name="relationshipStatus" 
                value={formData.relationshipStatus} 
                onChange={handleInputChange}
                className="mt-1 block w-full bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-sky-500 text-slate-200 shadow-sm shadow-black/20 appearance-none"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Open">Open</option>
                <option value="Partnered">Partnered</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Hosting Preference</span>
            <select 
              name="hostTravel" 
              value={formData.hostTravel} 
              onChange={handleInputChange}
              className="mt-1 block w-full bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-sky-500 text-slate-200 shadow-sm shadow-black/20 appearance-none"
            >
              <option value="Host">Host</option>
              <option value="Travel">Travel</option>
              <option value="Both">Both</option>
              <option value="Ask">Ask</option>
            </select>
          </label>

          {/* Interests */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2 block">Interests</span>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => {
                const isSelected = formData.interests?.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected 
                        ? 'bg-sky-500 text-white shadow-md shadow-sky-950/40' 
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Bio</span>
            <textarea 
              name="bio" 
              rows={3}
              value={formData.bio} 
              onChange={handleInputChange}
              placeholder="Tell others about yourself..."
              className="mt-1 block w-full bg-slate-900 border-none rounded-xl px-4 py-3 focus:ring-1 focus:ring-sky-500 text-slate-200 shadow-sm shadow-black/20 resize-none"
            />
          </label>
        </div>
      </div>

      {/* ADD PHOTO MODAL */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-[130] flex items-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isProcessingImage && setShowAddPhotoModal(false)} />
          <div className="relative w-full bg-slate-900 rounded-t-[2.5rem] p-6 space-y-4 pb-10 border-t border-slate-800 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-black uppercase tracking-wider text-white font-display">
                Add Picture to Profile
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddPhotoModal(false)}
                disabled={isProcessingImage}
                className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>

            {/* Privacy Selector for this new photo */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Choose Picture Visibility:
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setNewPhotoPrivacy(false)}
                  className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    !newPhotoPrivacy
                      ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-950/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>🌐 Public</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNewPhotoPrivacy(true)}
                  className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                    newPhotoPrivacy
                      ? 'bg-amber-500 text-black border-amber-400 font-black shadow-lg shadow-amber-950/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>🔒 Private</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                {newPhotoPrivacy 
                  ? 'Locked in your private album. Accessible only when unlocked.' 
                  : 'Visible to everyone browsing your profile and on the grid.'}
              </p>
            </div>

            {/* Upload Options */}
            <div className="space-y-2.5">
              {isProcessingImage ? (
                <div className="py-6 flex flex-col items-center justify-center gap-2 text-sky-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider">Processing & saving picture...</span>
                </div>
              ) : (
                <>
                  <button 
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-slate-700/60"
                  >
                    <Camera className="w-5 h-5 text-sky-400" />
                    <span>Take Live Photo</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-slate-700/60"
                  >
                    <Upload className="w-5 h-5 text-sky-400" />
                    <span>Upload From Device</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setShowAvatarPicker(true)}
                    className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all border border-slate-700/60"
                  >
                    <Sparkles className="w-5 h-5 text-sky-400" />
                    <span>Choose Avatar / Sample</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AVATAR PICKER MODAL */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowAvatarPicker(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 rounded-[2.5rem] p-8 border border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-100 italic tracking-tight uppercase font-display">Pick an Avatar</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${newPhotoPrivacy ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'}`}>
                {newPhotoPrivacy ? 'Private' : 'Public'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {AVATARS.map((avatar, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectAvatar(avatar)}
                  className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-800 hover:border-sky-500 active:scale-90 transition-all bg-slate-950 shadow-inner"
                >
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ProfileEdit;
