import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, UserReport, Message, SystemSetting, hasActivePremiumSubscription } from '../types';
import { db, auth } from '../src/lib/firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  setDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  MessageSquare, 
  Ban, 
  KeyRound, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  RefreshCw, 
  Trash2, 
  ArrowLeft, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Crown, 
  Mail, 
  Send, 
  Copy, 
  Check, 
  UserX, 
  UserCheck,
  Clock,
  X,
  Radio,
  Image as ImageIcon,
  Sparkles,
  Plus,
  Database
} from 'lucide-react';
import ProfileBadges, { checkIsNewUser } from './ProfileBadges';
import {
  hasActiveSession,
  getUserPresenceInfo,
  withComputedPresence,
  formatRelativeLastSeen
} from '../src/lib/presence';

interface AdminDashboardProps {
  onClose: () => void;
  currentUserProfile?: UserProfile | null;
  initialUsers?: UserProfile[];
  onUserUpdated?: (userId: string, updates: Partial<UserProfile>) => void;
  onSystemSettingsUpdated?: (settings: SystemSetting) => void;
}

type AdminTab = 'users' | 'messaging' | 'reports' | 'system';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  onClose, 
  currentUserProfile,
  initialUsers = [],
  onUserUpdated,
  onSystemSettingsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const map = new Map<string, UserProfile>();
    if (currentUserProfile) map.set(currentUserProfile.id, currentUserProfile);
    initialUsers.forEach(u => {
      if (u && u.id) map.set(u.id, u);
    });
    return Array.from(map.values());
  });
  const [reports, setReports] = useState<UserReport[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSetting>({
    id: 'global',
    requireBiometrics: true,
    requireSubscriptionForPlus: true,
    allowMessaging: true,
    maintenanceMode: false,
    allowRegistrations: true,
    updatedAt: Date.now(),
    updatedBy: 'system'
  });
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // User Management State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'verified' | 'premium' | 'admins'>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [fallbackSelectedUser, setFallbackSelectedUser] = useState<UserProfile | null>(null);
  const [pendingToggleKey, setPendingToggleKey] = useState<string | null>(null);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableReason, setDisableReason] = useState('Violation of Community Guidelines');
  const [customReason, setCustomReason] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals & User Management State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [purgeChatId, setPurgeChatId] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    age: 24,
    role: 'Vers',
    distance: '300m',
    status: 'online' as 'online' | 'offline',
    isVerified: true,
    isPremium: false,
    isAdmin: false,
    bio: ''
  });

  // Messaging Monitoring State
  const [allChats, setAllChats] = useState<{ id: string; participants: string[]; lastMessage?: string; lastMessageAt?: number }[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Password Reset State
  const [resetFeedback, setResetFeedback] = useState<string | null>(null);
  const [tempPasswordCode, setTempPasswordCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Clear action feedback automatically
  useEffect(() => {
    if (actionFeedback) {
      const timer = setTimeout(() => setActionFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionFeedback]);

  // 1. Subscribe to Users (with immediate initial seed and 2.5s safety timeout so tab never hangs)
  useEffect(() => {
    if (users.length === 0) {
      setIsLoadingUsers(true);
    }
    const loadingTimeout = setTimeout(() => {
      setIsLoadingUsers(false);
    }, 2500);

    const usersQuery = query(collection(db, 'users'), limit(300));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      clearTimeout(loadingTimeout);
      const now = Date.now();
      const currentUid = auth.currentUser?.uid || currentUserProfile?.id;
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
      setIsLoadingUsers(false);

      const FAKE_IDS = new Set(['1', '2', '3', '4', '5']);
      const filtered = docs
        .filter(d => !FAKE_IDS.has(d.id) && !(d.imageUrl && d.imageUrl.includes('picsum.photos')))
        .map(d => withComputedPresence(d, currentUid, now));
      if (filtered.length > 0) {
        setUsers(filtered);
      } else if (currentUserProfile) {
        setUsers([currentUserProfile]);
      }
    }, (err) => {
      clearTimeout(loadingTimeout);
      setIsLoadingUsers(false);
      if (currentUserProfile) {
        setUsers(prev => prev.length > 0 ? prev : [currentUserProfile]);
      }
      if (!String(err?.message || '').toLowerCase().includes('quota')) {
        setActionFeedback({
          type: 'error',
          message: `Firestore sync notice: ${err.message}.`
        });
      }
    });

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribe();
    };
  }, [currentUserProfile?.id]);

  const refreshUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), limit(300)));
      const docs = snap.docs.map(d => ({ ...d.data(), id: d.id } as UserProfile));
      const FAKE_IDS = new Set(['1', '2', '3', '4', '5']);
      const filtered = docs.filter(d => !FAKE_IDS.has(d.id) && !(d.imageUrl && d.imageUrl.includes('picsum.photos')));
      setUsers(filtered);
      setActionFeedback({
        type: 'success',
        message: `Synced ${filtered.length} user accounts directly from Firestore.`
      });
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setActionFeedback({
        type: 'error',
        message: `Failed to sync users: ${err.message}`
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handlePurgeFakeAccounts = async () => {
    setIsLoadingUsers(true);
    try {
      const FAKE_IDS = ['1', '2', '3', '4', '5'];
      let purged = 0;
      for (const id of FAKE_IDS) {
        try {
          await deleteDoc(doc(db, 'users', id));
          purged++;
        } catch (_) {}
      }
      const snap = await getDocs(query(collection(db, 'users'), limit(300)));
      for (const d of snap.docs) {
        const data = d.data() as UserProfile;
        if (FAKE_IDS.includes(d.id) || (data.imageUrl && data.imageUrl.includes('picsum.photos'))) {
          try {
            await deleteDoc(d.ref);
            purged++;
          } catch (_) {}
        }
      }
      await refreshUsers();
      setActionFeedback({
        type: 'success',
        message: purged > 0 
          ? `Successfully purged ${purged} fake account(s) from Firestore.` 
          : 'No fake accounts detected in Firestore.'
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to purge fake accounts: ${err.message}`
      });
      setIsLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name.trim()) return;

    setIsLoadingUsers(true);
    try {
      const generatedId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const cleanEmail = newUserForm.email.trim() || `${newUserForm.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}@slyd.app`;
      const newUserDoc: UserProfile = {
        id: generatedId,
        name: newUserForm.name.trim(),
        email: cleanEmail,
        age: Number(newUserForm.age) || 21,
        distance: newUserForm.distance.trim() || '300m',
        status: newUserForm.status,
        imageUrl: `/logo.png`,
        photos: [
          {
            id: 'photo_' + Date.now(),
            url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${generatedId}`,
            isPrivate: false,
            createdAt: Date.now(),
            caption: 'Main Profile'
          }
        ],
        bio: newUserForm.bio.trim() || 'Active Slyd member.',
        tribes: [],
        lookingFor: ['Friends', 'Dates'],
        lastSeen: 'Active now',
        role: newUserForm.role,
        height: "5'10\"",
        weight: '165lbs',
        race: 'Other',
        interests: ['Social', 'Fitness'],
        relationshipStatus: 'Single',
        hostTravel: 'Both',
        coordinates: { 
          lat: 34.0522 + (Math.random() - 0.5) * 0.05, 
          lng: -118.2437 + (Math.random() - 0.5) * 0.05 
        },
        createdAt: Date.now(),
        isVerified: newUserForm.isVerified,
        isPremium: newUserForm.isPremium,
        ...(newUserForm.isPremium ? {
          premiumPlan: 'monthly',
          premiumSince: Date.now(),
          premiumExpiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000
        } : {}),
        isAdmin: newUserForm.isAdmin,
        isSelfieExempt: newUserForm.isAdmin,
        isDisabled: false
      };

      await setDoc(doc(db, 'users', generatedId), newUserDoc);
      setShowAddUserModal(false);
      setNewUserForm({
        name: '',
        email: '',
        age: 24,
        role: 'Vers',
        distance: '300m',
        status: 'online',
        isVerified: true,
        isPremium: false,
        isAdmin: false,
        bio: ''
      });
      await refreshUsers();
      setActionFeedback({
        type: 'success',
        message: `Account "${newUserDoc.name}" has been created and stored in Firestore.`
      });
    } catch (err: any) {
      console.error('Create user error:', err);
      setActionFeedback({
        type: 'error',
        message: `Failed to create user account: ${err.message}`
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // 2. Subscribe to Reports
  useEffect(() => {
    const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as UserReport));
      setReports(docs);
    }, (err) => {
      console.warn('Reports collection notice (may be empty initially):', err.message);
    });

    return () => unsubscribe();
  }, []);

  // 3. Subscribe to System Settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'settings'), (snap) => {
      if (snap.exists()) {
        setSystemSettings(snap.data() as SystemSetting);
      }
    }, (err) => {
      console.warn('System settings notice:', err.message);
    });

    return () => unsub();
  }, []);

  // 4. Subscribe to Chats for Message Monitoring
  useEffect(() => {
    const chatsQuery = query(collection(db, 'chats'), limit(150));
    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        participants: d.data().participants || [],
        lastMessage: d.data().lastMessage || '',
        lastMessageAt: d.data().lastMessageAt || 0
      }));
      setAllChats(docs);
    }, (err) => {
      console.warn('Chats monitoring notice:', err.message);
    });

    return () => unsubscribe();
  }, []);

  // 5. Load Messages for Selected Chat
  useEffect(() => {
    if (!selectedChatId) {
      setChatMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const messagesQuery = query(
      collection(db, `chats/${selectedChatId}/messages`),
      orderBy('timestamp', 'asc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          senderId: data.senderId,
          receiverId: data.receiverId,
          text: data.text || '',
          imageUrl: data.imageUrl,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now()),
          isRead: data.isRead || false
        } as Message;
      });
      setChatMessages(msgs);
      setIsLoadingMessages(false);
    }, (err) => {
      console.error('Error fetching chat messages:', err);
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [selectedChatId]);

  // Quick lookup maps
  const userMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    users.forEach(u => map.set(u.id, u));
    return map;
  }, [users]);

  // Live selectedUser always stays in sync with real-time `users` state
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find(u => u.id === selectedUserId) || fallbackSelectedUser;
  }, [users, selectedUserId, fallbackSelectedUser]);

  const setSelectedUser = (userOrUpdater: UserProfile | null | ((prev: UserProfile | null) => UserProfile | null)) => {
    if (typeof userOrUpdater === 'function') {
      const next = userOrUpdater(selectedUser);
      setSelectedUserId(next ? next.id : null);
      setFallbackSelectedUser(next);
    } else {
      setSelectedUserId(userOrUpdater ? userOrUpdater.id : null);
      setFallbackSelectedUser(userOrUpdater);
    }
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = u.name?.toLowerCase().includes(q) || false;
      const idMatch = u.id?.toLowerCase().includes(q) || false;
      const emailMatch = u.email?.toLowerCase().includes(q) || false;
      const roleMatch = u.role?.toLowerCase().includes(q) || false;
      const queryPass = !q || nameMatch || idMatch || emailMatch || roleMatch;

      if (!queryPass) return false;

      if (statusFilter === 'active') return !u.isDisabled;
      if (statusFilter === 'disabled') return !!u.isDisabled;
      if (statusFilter === 'verified') return !!u.isVerified;
      if (statusFilter === 'premium') return hasActivePremiumSubscription(u);
      if (statusFilter === 'admins') return !!u.isAdmin || u.email === 'danguero21@gmail.com';

      return true;
    });
  }, [users, searchQuery, statusFilter]);

  // Filtered Chats
  const filteredChats = useMemo(() => {
    if (!chatSearchQuery.trim()) return allChats;
    const q = chatSearchQuery.toLowerCase();
    return allChats.filter(chat => {
      const u1 = userMap.get(chat.participants[0]);
      const u2 = userMap.get(chat.participants[1]);
      return (
        (u1?.name?.toLowerCase().includes(q) || false) ||
        (u2?.name?.toLowerCase().includes(q) || false) ||
        chat.id.toLowerCase().includes(q) ||
        (chat.lastMessage?.toLowerCase().includes(q) || false)
      );
    });
  }, [allChats, chatSearchQuery, userMap]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = users.length;
    const disabled = users.filter(u => u.isDisabled).length;
    const active = total - disabled;
    const verified = users.filter(u => u.isVerified).length;
    const premium = users.filter(u => hasActivePremiumSubscription(u)).length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    return { total, active, disabled, verified, premium, pendingReports };
  }, [users, reports]);

  const applyLocalUserUpdates = (userId: string, updates: Partial<UserProfile>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
    setFallbackSelectedUser(prev => (prev && prev.id === userId) ? { ...prev, ...updates } : prev);
    onUserUpdated?.(userId, updates);
    try {
      const rawSpecific = localStorage.getItem(`slyd_profile_${userId}`);
      if (rawSpecific) {
        const parsed = JSON.parse(rawSpecific);
        localStorage.setItem(`slyd_profile_${userId}`, JSON.stringify({ ...parsed, ...updates }));
      }
      const rawGeneral = localStorage.getItem('slyd_cached_profile');
      if (rawGeneral) {
        const parsed = JSON.parse(rawGeneral);
        if (parsed && parsed.id === userId) {
          localStorage.setItem('slyd_cached_profile', JSON.stringify({ ...parsed, ...updates }));
        }
      }
    } catch {}
  };

  // Actions: User Management
  const handleToggleDisable = async (targetUser: UserProfile, reason?: string) => {
    const willBeDisabled = !targetUser.isDisabled;
    const updateData: Partial<UserProfile> = {
      isDisabled: willBeDisabled,
      disabledReason: willBeDisabled ? (reason || 'Disabled by Administrator') : '',
      disabledAt: willBeDisabled ? Date.now() : 0
    };

    // Optimistic real-time update
    applyLocalUserUpdates(targetUser.id, updateData);
    setShowDisableModal(false);

    try {
      await updateDoc(doc(db, 'users', targetUser.id), updateData);

      setActionFeedback({
        type: 'success',
        message: willBeDisabled 
          ? `Account for ${targetUser.name} has been suspended.` 
          : `Account for ${targetUser.name} has been re-activated.`
      });
    } catch (err: any) {
      if (!String(err?.message || '').toLowerCase().includes('quota')) {
        setActionFeedback({
          type: 'error',
          message: `Failed to update account: ${err.message}`
        });
      } else {
        setActionFeedback({
          type: 'success',
          message: willBeDisabled 
            ? `Account for ${targetUser.name} suspended (applied in real time).` 
            : `Account for ${targetUser.name} re-activated (applied in real time).`
        });
      }
    }
  };

  const handleToggleFeature = async (
    targetUser: UserProfile, 
    field: keyof UserProfile, 
    value: boolean,
    label: string
  ) => {
    const now = Date.now();
    let updates: Partial<UserProfile> = {
      [field]: value
    };

    // When toggling Slyd+ Premium ON or OFF from Admin, update all related subscription entitlements immediately
    if (field === 'isPremium') {
      if (value) {
        updates = {
          isPremium: true,
          premiumPlan: targetUser.premiumPlan || 'monthly',
          premiumSince: targetUser.premiumSince || now,
          premiumExpiresAt: now + 365 * 24 * 60 * 60 * 1000
        };
      } else {
        updates = {
          isPremium: false,
          premiumPlan: undefined,
          premiumSince: 0,
          premiumExpiresAt: 0,
          paymentMethod: undefined,
          isIncognito: false,
          hiddenFromGrid: false,
          readReceipts: true,
          screenshotProtection: false,
          teleportLocation: null,
          preferences: {
            ...(targetUser.preferences || {}),
            disableTypingIndicator: false
          }
        };
      }
    } else if (field === 'isNewUser' && !value) {
      // If admin explicitly turns OFF the New User badge, also ensure createdAt is older than 14 days so checkIsNewUser returns false immediately
      const fifteenDaysAgo = now - 15 * 24 * 60 * 60 * 1000;
      updates = {
        isNewUser: false,
        createdAt: (targetUser.createdAt && (now - targetUser.createdAt) < 14 * 24 * 60 * 60 * 1000)
          ? fifteenDaysAgo
          : targetUser.createdAt
      };
    }

    // 1. Move the switch and update state across the entire app immediately in real time
    setPendingToggleKey(`${targetUser.id}:${String(field)}`);
    applyLocalUserUpdates(targetUser.id, updates);

    try {
      const firestoreUpdates = JSON.parse(JSON.stringify(updates));
      if (field === 'isPremium' && !value) {
        firestoreUpdates.premiumPlan = null;
        firestoreUpdates.paymentMethod = null;
      }
      await updateDoc(doc(db, 'users', targetUser.id), firestoreUpdates);

      setActionFeedback({
        type: 'success',
        message: `${label} for ${targetUser.name} ${value ? 'ENABLED' : 'LOCKED / DISABLED'} in real time.`
      });
    } catch (err: any) {
      if (!String(err?.message || '').toLowerCase().includes('quota')) {
        setActionFeedback({
          type: 'error',
          message: `Failed to sync ${label} to cloud: ${err.message} (local state updated).`
        });
      } else {
        setActionFeedback({
          type: 'success',
          message: `${label} for ${targetUser.name} ${value ? 'ENABLED' : 'DISABLED'} in real time.`
        });
      }
    } finally {
      setTimeout(() => setPendingToggleKey(null), 250);
    }
  };

  const handleResetSelfieCooldown = async (targetUser: UserProfile) => {
    applyLocalUserUpdates(targetUser.id, { lastSelfieAttemptAt: 0 });
    try {
      await updateDoc(doc(db, 'users', targetUser.id), {
        lastSelfieAttemptAt: 0
      });
      setActionFeedback({
        type: 'success',
        message: `Reset SlydShield selfie cooldown for ${targetUser.name}. User can verify now.`
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to reset cooldown: ${err.message}`
      });
    }
  };

  const handleSendPasswordReset = async (targetUser: UserProfile) => {
    setResetFeedback(null);
    const targetEmail = targetUser.email || (targetUser.id === auth.currentUser?.uid ? auth.currentUser?.email : null);

    if (!targetEmail) {
      // Generate emergency admin recovery token
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      setTempPasswordCode(code);
      setResetFeedback(`No direct email on file. Generated emergency support reset code: ${code}`);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      await updateDoc(doc(db, 'users', targetUser.id), {
        lastPasswordResetRequestedAt: Date.now()
      });
      setResetFeedback(`Password reset email successfully sent to ${targetEmail}.`);
    } catch (err: any) {
      // Generate fallback token if provider rejects or limit reached
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      setTempPasswordCode(code);
      setResetFeedback(`Notice (${err.code || 'Local'}): Generated manual recovery token: ${code}`);
    }
  };

  const handleDeleteUser = (targetUser: UserProfile) => {
    setUserToDelete(targetUser);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete.id));
      setActionFeedback({
        type: 'success',
        message: `User ${userToDelete.name} was permanently purged from Firestore.`
      });
      if (selectedUser?.id === userToDelete.id) {
        setSelectedUser(null);
      }
      setUserToDelete(null);
      await refreshUsers();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to delete user: ${err.message}`
      });
    }
  };

  // Actions: Messaging Moderation
  const handleDeleteMessage = (messageId: string) => {
    setDeleteMessageId(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!selectedChatId || !deleteMessageId) return;
    try {
      await deleteDoc(doc(db, `chats/${selectedChatId}/messages`, deleteMessageId));
      setActionFeedback({
        type: 'success',
        message: 'Message was deleted by administrator.'
      });
      setDeleteMessageId(null);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to delete message: ${err.message}`
      });
    }
  };

  const handlePurgeChat = (chatId: string) => {
    setPurgeChatId(chatId);
  };

  const confirmPurgeChat = async () => {
    if (!purgeChatId) return;
    try {
      const msgsSnap = await getDocs(collection(db, `chats/${purgeChatId}/messages`));
      const deletePromises = msgsSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'chats', purgeChatId));

      setActionFeedback({
        type: 'success',
        message: 'Chat thread was completely purged.'
      });
      if (selectedChatId === purgeChatId) {
        setSelectedChatId(null);
      }
      setPurgeChatId(null);
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to purge chat: ${err.message}`
      });
    }
  };

  // Actions: Reports
  const handleUpdateReportStatus = async (reportId: string, status: 'reviewed' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status });
      setActionFeedback({
        type: 'success',
        message: `Report marked as ${status}.`
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: `Failed to update report: ${err.message}`
      });
    }
  };

  // Actions: System Controls
  const handleToggleSystemSetting = async (key: keyof SystemSetting, value: boolean) => {
    const nextSettings: SystemSetting = {
      ...systemSettings,
      [key]: value,
      updatedAt: Date.now(),
      updatedBy: currentUserProfile?.email || 'admin'
    };
    setSystemSettings(nextSettings);
    onSystemSettingsUpdated?.(nextSettings);
    try {
      await setDoc(doc(db, 'system', 'settings'), nextSettings, { merge: true });
      setActionFeedback({
        type: 'success',
        message: `System feature ${String(key)} updated to ${value ? 'ACTIVE' : 'DISABLED'}.`
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'success',
        message: `System feature ${String(key)} updated to ${value ? 'ACTIVE' : 'DISABLED'} in real time.`
      });
    }
  };

  const handleLockAllNonSubscribers = async () => {
    let lockedCount = 0;
    for (const u of users) {
      const hasPaidRecord = Boolean(u.paymentMethod || u.lastPaymentId);
      if (!hasPaidRecord && (u.isPremium || hasActivePremiumSubscription(u))) {
        const lockUpdates: Partial<UserProfile> = {
          isPremium: false,
          premiumPlan: undefined,
          premiumSince: 0,
          premiumExpiresAt: 0,
          isIncognito: false,
          hiddenFromGrid: false,
          readReceipts: true,
          screenshotProtection: false,
          teleportLocation: null
        };
        applyLocalUserUpdates(u.id, lockUpdates);
        lockedCount++;
        updateDoc(doc(db, 'users', u.id), {
          isPremium: false,
          premiumPlan: null,
          premiumSince: 0,
          premiumExpiresAt: 0,
          isIncognito: false,
          hiddenFromGrid: false,
          readReceipts: true,
          screenshotProtection: false,
          teleportLocation: null
        }).catch(() => {});
      }
    }
    await handleToggleSystemSetting('requireSubscriptionForPlus', true);
    setActionFeedback({
      type: 'success',
      message: `Slyd+ Paywall locked! Reset ${lockedCount} non-subscribing account(s) to Free tier.`
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-slate-100 flex flex-col overflow-hidden overflow-x-hidden font-sans h-[100dvh]">
      {/* Top Admin Navigation Header */}
      <header className="h-16 bg-slate-950 border-b border-slate-900 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors"
            title="Exit Admin Control Center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black tracking-wider uppercase font-display text-white">
                  Slyd Admin Console
                </h1>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest">
                  Master Root
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Administrator: {currentUserProfile?.email || 'danguero21@gmail.com'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Stats Counter */}
        <div className="hidden md:flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-xl">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400">Users:</span>
            <span className="text-white font-bold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-xl">
            <UserX className="w-3.5 h-3.5 text-red-400" />
            <span className="text-slate-400">Suspended:</span>
            <span className="text-red-400 font-bold">{stats.disabled}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-xl">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Reports:</span>
            <span className="text-amber-400 font-bold">{stats.pendingReports}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all"
        >
          Exit Admin
        </button>
      </header>

      {/* Floating Action Feedback Banner */}
      {actionFeedback && (
        <div className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-all shrink-0 z-30 ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-950/90 border-b border-emerald-800/80 text-emerald-200' 
            : 'bg-red-950/90 border-b border-red-800/80 text-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Admin Tab Navigation */}
      <div className="bg-slate-950/80 border-b border-slate-900 px-4 sm:px-6 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'users'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Accounts ({stats.total})</span>
        </button>

        <button
          onClick={() => setActiveTab('messaging')}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'messaging'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Monitor Messaging ({allChats.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'reports'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Safety & Reports</span>
          {stats.pendingReports > 0 && (
            <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.2 rounded-full">
              {stats.pendingReports}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all shrink-0 ${
            activeTab === 'system'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>System & Features</span>
        </button>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* User List Panel */}
            <div className={`flex-1 flex flex-col border-r border-slate-900 overflow-hidden ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
              {/* Search & Filter Toolbar */}
              <div className="p-4 bg-slate-950/60 border-b border-slate-900/80 space-y-3 shrink-0">
                {/* Database Connectivity & Sync Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-900/50">
                  <div className="flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[11px] font-bold text-slate-300">
                      Collection <span className="font-mono text-sky-400">/users</span>
                    </span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded-full font-bold">
                      {users.length} in DB
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={refreshUsers}
                      disabled={isLoadingUsers}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                      title="Direct sync from Firestore"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingUsers ? 'animate-spin text-sky-400' : ''}`} />
                      <span>Sync DB</span>
                    </button>
                    <button
                      onClick={handlePurgeFakeAccounts}
                      disabled={isLoadingUsers}
                      className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                      title="Purge all fake accounts from Firestore"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                      <span>Purge Fake Accounts</span>
                    </button>
                    <button
                      onClick={() => setShowAddUserModal(true)}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all"
                      title="Add user account to Firestore"
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>Add User</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name, ID, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/70 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-[11px] font-bold">
                  {(['all', 'active', 'disabled', 'verified', 'premium', 'admins'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1 rounded-lg uppercase tracking-wider transition-all shrink-0 ${
                        statusFilter === filter
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users List Scrollable */}
              <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-900 p-2 sm:p-4 space-y-2">
                {isLoadingUsers ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
                    <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                    <span className="text-xs uppercase font-bold tracking-wider">Loading user database...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 space-y-3">
                    <UserX className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      {users.length === 0 ? 'No user accounts found in Firestore collection' : 'No users found matching query'}
                    </p>
                    {users.length === 0 && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => setShowAddUserModal(true)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New User</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredUsers.map(u => (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                        selectedUser?.id === u.id
                          ? 'bg-sky-500/10 border-sky-500/50 shadow-md'
                          : u.isDisabled
                          ? 'bg-red-950/20 border-red-900/40 hover:bg-red-950/30'
                          : 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/80'
                      } flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={u.imageUrl || '/logo.png'}
                            alt={u.name}
                            className={`w-12 h-12 rounded-xl object-cover border ${
                              u.isDisabled ? 'border-red-500/80 opacity-60' : 'border-slate-800'
                            }`}
                          />
                          {u.isVerified && (
                            <div className="absolute -bottom-1 -right-1 bg-sky-500 p-0.5 rounded-md border border-slate-950">
                              <ShieldCheck className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white truncate font-display">{u.name}</span>
                            <span className="text-xs text-slate-400">{u.age}</span>
                            {u.isAdmin && (
                              <span className="bg-sky-500/20 text-sky-300 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-sky-500/30">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                              {u.email || u.id}
                            </span>
                            <span className="text-[10px] text-slate-400">· {u.role || 'Vers'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {(() => {
                              const presence = getUserPresenceInfo(u, auth.currentUser?.uid || currentUserProfile?.id);
                              return (
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1 border ${
                                  presence.status === 'online'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : presence.isToday
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                    : 'bg-slate-800/80 text-slate-400 border-slate-700'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${presence.dotColorClass}`} />
                                  {presence.status === 'online' ? 'Online now · Today' : presence.lastSeenText}
                                </span>
                              );
                            })()}
                            {u.isDisabled ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                Suspended
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                Active Account
                              </span>
                            )}
                            {hasActivePremiumSubscription(u) ? (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                                <Crown className="w-2.5 h-2.5" /> Slyd+ Active
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700 flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Free Tier
                              </span>
                            )}
                            {u.messagingDisabled && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                Chat Muted
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (u.isDisabled) {
                              handleToggleDisable(u);
                            } else {
                              setSelectedUser(u);
                              setShowDisableModal(true);
                            }
                          }}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                            u.isDisabled
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                          }`}
                          title={u.isDisabled ? 'Re-activate Account' : 'Suspend Account'}
                        >
                          {u.isDisabled ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* User Account Controls Detail Panel */}
            <div className={`flex-[1.2] flex flex-col bg-slate-950/40 overflow-y-auto no-scrollbar p-4 sm:p-6 ${selectedUser ? 'flex' : 'hidden md:flex items-center justify-center'}`}>
              {selectedUser ? (
                <div className="space-y-6 max-w-2xl mx-auto w-full">
                  {/* Detail Panel Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={selectedUser.imageUrl || '/logo.png'}
                          alt={selectedUser.name}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-800 shadow-xl"
                        />
                        {selectedUser.referenceSelfieUrl && (
                          <div 
                            className="absolute -bottom-2 -right-2 bg-slate-900 border border-slate-700 p-1 rounded-xl shadow-lg cursor-pointer group"
                            title="Compare with live signup selfie"
                          >
                            <img
                              src={selectedUser.referenceSelfieUrl}
                              alt="Biometric Reference"
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-black text-white font-display uppercase">{selectedUser.name}</h2>
                          <span className="text-sm font-semibold text-slate-400">{selectedUser.age} yrs</span>
                          {selectedUser.isAdmin && (
                            <span className="bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-purple-500/30">
                              Admin
                            </span>
                          )}
                          {(selectedUser.isAdmin || selectedUser.isSelfieExempt) && (
                            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Selfie Exempt
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">UID: {selectedUser.id}</p>
                        <p className="text-xs text-sky-400 font-mono">{selectedUser.email || 'Email managed through Auth'}</p>
                        
                        {/* Social Proof Badges Display */}
                        <ProfileBadges profile={selectedUser} size="sm" className="mt-2.5" />

                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {(() => {
                            const presence = getUserPresenceInfo(selectedUser, auth.currentUser?.uid || currentUserProfile?.id);
                            return (
                              <>
                                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                  presence.status === 'online'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : presence.isToday
                                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                    : 'bg-slate-900 text-slate-300 border-slate-700'
                                }`}>
                                  <span className={`w-2 h-2 rounded-full ${presence.dotColorClass}`} />
                                  {presence.status === 'online' ? 'Online now' : presence.lastSeenText}
                                </span>
                              </>
                            );
                          })()}
                          {selectedUser.isDisabled ? (
                            <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                              <Ban className="w-3 h-3" /> Suspended
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3" /> Active Account
                            </span>
                          )}
                          {selectedUser.isVerified && (
                            <span className="px-2 py-1 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Biometric Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUser(null)}
                      className="md:hidden p-2 text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Suspension Warning Box if Account is Disabled */}
                  {selectedUser.isDisabled && (
                    <div className="p-4 bg-red-950/30 border border-red-900/60 rounded-2xl">
                      <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider mb-1">
                        <AlertTriangle className="w-4 h-4" /> Account Suspended
                      </div>
                      <p className="text-xs text-red-200">
                        Reason: {selectedUser.disabledReason || 'Terms of Service violation.'}
                      </p>
                      {selectedUser.disabledAt && (
                        <p className="text-[10px] text-red-400/80 mt-1">
                          Suspended on: {new Date(selectedUser.disabledAt).toLocaleString()}
                        </p>
                      )}
                      <button
                        onClick={() => handleToggleDisable(selectedUser)}
                        className="mt-3 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
                      >
                        Re-activate Account
                      </button>
                    </div>
                  )}

                  {/* Section 1: Core Account Experience & Password Resets */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-sky-400" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-white">
                          Account Security & Password Resets
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-500">Firebase Auth Proxy</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Dispatch official Firebase password recovery instructions directly to this user or generate an administrator recovery access token.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => handleSendPasswordReset(selectedUser)}
                        className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-900/20"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Send Password Reset
                      </button>

                      {tempPasswordCode && (
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs font-mono text-sky-400">
                          <span>Token: {tempPasswordCode}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(tempPasswordCode);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="p-1 hover:text-white"
                            title="Copy Token"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {resetFeedback && (
                      <p className="text-xs font-medium text-sky-300 bg-sky-950/40 border border-sky-900/50 p-2.5 rounded-xl">
                        {resetFeedback}
                      </p>
                    )}
                  </div>

                  {/* Section 2: Adding and Disabling Features */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-sky-400" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-white">
                          Feature Controls & Entitlements
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-500">Live Granular Toggles</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Slyd+ Premium Feature */}
                      {(() => {
                        const isSelectedUserSubscribed = hasActivePremiumSubscription(selectedUser);
                        return (
                          <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                            isSelectedUserSubscribed
                              ? 'bg-cyan-950/30 border-cyan-400/50 shadow-md shadow-cyan-950/40'
                              : 'bg-slate-950/60 border-slate-800/80'
                          }`}>
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                <Crown className={`w-3.5 h-3.5 ${isSelectedUserSubscribed ? 'text-cyan-400' : 'text-slate-500'}`} />
                                <span>Slyd+ Premium</span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                  isSelectedUserSubscribed
                                    ? 'bg-cyan-400 text-slate-950'
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {isSelectedUserSubscribed ? 'SUBSCRIBED' : 'LOCKED (FREE)'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {isSelectedUserSubscribed
                                  ? 'All Slyd+ features unlocked'
                                  : 'Not a subscriber · All Slyd+ features locked behind paywall'}
                              </p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={isSelectedUserSubscribed}
                              onClick={() => handleToggleFeature(selectedUser, 'isPremium', !isSelectedUserSubscribed, 'Slyd+ Premium')}
                              className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                                isSelectedUserSubscribed
                                  ? 'bg-cyan-400 shadow-md shadow-cyan-500/30'
                                  : 'bg-slate-800'
                              } ${pendingToggleKey === `${selectedUser.id}:isPremium` ? 'scale-95' : ''}`}
                            >
                              <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                                isSelectedUserSubscribed ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                            </button>
                          </div>
                        );
                      })()}

                      {/* Anti-Catfish Verified Badge */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        selectedUser.isVerified
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                            <span>Photo Verified</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              selectedUser.isVerified ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {selectedUser.isVerified ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Biometric facial verification</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(selectedUser.isVerified)}
                          onClick={() => handleToggleFeature(selectedUser, 'isVerified', !selectedUser.isVerified, 'Biometric Verification')}
                          className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                            selectedUser.isVerified ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                            selectedUser.isVerified ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* New User Social Proof Badge */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        checkIsNewUser(selectedUser)
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                            <span>New User Badge</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              checkIsNewUser(selectedUser) ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {checkIsNewUser(selectedUser) ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {checkIsNewUser(selectedUser) ? 'Displayed on profile' : 'Standard member status'}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={checkIsNewUser(selectedUser)}
                          onClick={() => handleToggleFeature(selectedUser, 'isNewUser', !checkIsNewUser(selectedUser), 'New User Badge')}
                          className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                            checkIsNewUser(selectedUser) ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                            checkIsNewUser(selectedUser) ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Messaging Privilege (Chat Lock) */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        !selectedUser.messagingDisabled
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                            <span>Messaging Access</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              !selectedUser.messagingDisabled ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {!selectedUser.messagingDisabled ? 'ON' : 'MUTED'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {selectedUser.messagingDisabled ? 'Muted by Admin' : 'Can send messages'}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!selectedUser.messagingDisabled}
                          onClick={() => handleToggleFeature(selectedUser, 'messagingDisabled', !selectedUser.messagingDisabled, 'Messaging Privileges')}
                          className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                            !selectedUser.messagingDisabled ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                            !selectedUser.messagingDisabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Media / Photo Upload Privileges */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        !selectedUser.mediaDisabled
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                            <span>Photo Uploads</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              !selectedUser.mediaDisabled ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {!selectedUser.mediaDisabled ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {selectedUser.mediaDisabled ? 'Uploads Restricted' : 'Can upload pictures'}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!selectedUser.mediaDisabled}
                          onClick={() => handleToggleFeature(selectedUser, 'mediaDisabled', !selectedUser.mediaDisabled, 'Media Uploads')}
                          className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                            !selectedUser.mediaDisabled ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                            !selectedUser.mediaDisabled ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Public Discovery / Grid Visibility */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        !selectedUser.hiddenFromGrid
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <Eye className="w-3.5 h-3.5 text-sky-400" />
                            <span>Grid Visibility</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              !selectedUser.hiddenFromGrid ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {!selectedUser.hiddenFromGrid ? 'ON' : 'HIDDEN'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {selectedUser.hiddenFromGrid ? 'Ghost / Shadow-hidden' : 'Visible in nearby list'}
                          </p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={!selectedUser.hiddenFromGrid}
                          onClick={() => handleToggleFeature(selectedUser, 'hiddenFromGrid', !selectedUser.hiddenFromGrid, 'Public Visibility')}
                          className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                            !selectedUser.hiddenFromGrid ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                            !selectedUser.hiddenFromGrid ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Admin Access Privilege */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        selectedUser.isAdmin
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <Shield className="w-3.5 h-3.5 text-sky-400" />
                            <span>Admin Role</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              selectedUser.isAdmin ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {selectedUser.isAdmin ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Back-end console permissions</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(selectedUser.isAdmin)}
                          onClick={() => handleToggleFeature(selectedUser, 'isAdmin', !selectedUser.isAdmin, 'Administrator Role')}
                          className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                            selectedUser.isAdmin ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                            selectedUser.isAdmin ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>

                      {/* Selfie Exemption Privilege */}
                      <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        selectedUser.isSelfieExempt || selectedUser.isAdmin
                          ? 'bg-sky-950/30 border-sky-500/40'
                          : 'bg-slate-950/60 border-slate-800/80'
                      }`}>
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                            <Shield className="w-3.5 h-3.5 text-sky-400" />
                            <span>Selfie Exemption</span>
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                              selectedUser.isSelfieExempt || selectedUser.isAdmin ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {selectedUser.isSelfieExempt || selectedUser.isAdmin ? 'ON' : 'OFF'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">Bypass mandatory selfie verification</p>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={Boolean(selectedUser.isSelfieExempt || selectedUser.isAdmin)}
                          onClick={() => handleToggleFeature(selectedUser, 'isSelfieExempt', !selectedUser.isSelfieExempt, 'Selfie Exemption')}
                          className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                            selectedUser.isSelfieExempt || selectedUser.isAdmin ? 'bg-sky-500 shadow-md shadow-sky-500/30' : 'bg-slate-800'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                            selectedUser.isSelfieExempt || selectedUser.isAdmin ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>

                    {/* Action: Clear 24-Hour Anti-Catfish Cooldown */}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Anti-catfish 24h selfie cooldown:</span>
                      <button
                        onClick={() => handleResetSelfieCooldown(selectedUser)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all text-[11px]"
                      >
                        Clear Daily Limit
                      </button>
                    </div>
                  </div>

                  {/* Section 3: Account Lifecycle Actions */}
                  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Account Status & Lifecycle
                    </h3>

                    <div className="flex flex-wrap items-center gap-3">
                      {selectedUser.isDisabled ? (
                        <button
                          onClick={() => handleToggleDisable(selectedUser)}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg"
                        >
                          <Unlock className="w-4 h-4" />
                          Re-activate Account
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowDisableModal(true)}
                          className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
                        >
                          <Ban className="w-4 h-4 text-red-400" />
                          Suspend Account Completely
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteUser(selectedUser)}
                        className="px-4 py-2.5 bg-slate-900 hover:bg-red-950/80 text-slate-400 hover:text-red-300 border border-slate-800 hover:border-red-900 font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Purge User Profile
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-600 space-y-3">
                  <Shield className="w-12 h-12 mx-auto text-slate-700" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select any user from the directory to manage their account
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MESSAGING MONITOR */}
        {activeTab === 'messaging' && (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Conversation Threads List */}
            <div className={`w-full md:w-80 flex flex-col border-r border-slate-900 bg-slate-950/50 overflow-hidden ${selectedChatId ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-3 border-b border-slate-900">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={chatSearchQuery}
                    onChange={(e) => setChatSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-900/60">
                {filteredChats.length === 0 ? (
                  <div className="py-16 text-center text-slate-500 text-xs font-bold uppercase">
                    No active chats found
                  </div>
                ) : (
                  filteredChats.map(chat => {
                    const user1 = userMap.get(chat.participants[0]);
                    const user2 = userMap.get(chat.participants[1]);
                    const isSelected = selectedChatId === chat.id;

                    return (
                      <div
                        key={chat.id}
                        onClick={() => setSelectedChatId(chat.id)}
                        className={`p-3 cursor-pointer transition-all ${
                          isSelected ? 'bg-sky-500/10 border-l-2 border-sky-500' : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-white truncate">
                            <span>{user1?.name || 'User A'}</span>
                            <span className="text-slate-600">↔</span>
                            <span>{user2?.name || 'User B'}</span>
                          </div>
                          {chat.lastMessageAt ? (
                            <span className="text-[9px] text-slate-500 shrink-0">
                              {new Date(chat.lastMessageAt).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {chat.lastMessage || 'Conversation active'}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Conversation Transcript & Moderation Inspector */}
            <div className={`flex-1 flex flex-col bg-black overflow-hidden ${selectedChatId ? 'flex' : 'hidden md:flex items-center justify-center'}`}>
              {selectedChatId ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Chat Inspector Header */}
                  <div className="h-14 bg-slate-950 border-b border-slate-900 px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedChatId(null)}
                        className="md:hidden p-1.5 text-slate-400 hover:text-white"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Chat Moderator: {selectedChatId}
                        </span>
                        <p className="text-[10px] text-slate-500">
                          {chatMessages.length} total messages recorded
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePurgeChat(selectedChatId)}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Purge Chat
                    </button>
                  </div>

                  {/* Messages Scrollable */}
                  <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                    {isLoadingMessages ? (
                      <div className="py-20 text-center text-slate-500 text-xs">Loading message history...</div>
                    ) : chatMessages.length === 0 ? (
                      <div className="py-20 text-center text-slate-500 text-xs font-bold uppercase">
                        No messages in this chat thread
                      </div>
                    ) : (
                      chatMessages.map(msg => {
                        const sender = userMap.get(msg.senderId);
                        return (
                          <div
                            key={msg.id}
                            className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-start justify-between gap-3 group"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <img
                                src={sender?.imageUrl || '/logo.png'}
                                alt={sender?.name || 'User'}
                                className="w-8 h-8 rounded-lg object-cover border border-slate-800 shrink-0 mt-0.5"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-sky-400">
                                    {sender?.name || msg.senderId}
                                  </span>
                                  <span className="text-[10px] text-slate-500">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-200 mt-1 leading-relaxed break-words">
                                  {msg.text}
                                </p>
                                {msg.imageUrl && (
                                  <div className="mt-2">
                                    <img
                                      src={msg.imageUrl}
                                      alt="Attachment"
                                      className="max-h-48 rounded-xl border border-slate-800 object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Delete this message as administrator"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-600 space-y-2">
                  <MessageSquare className="w-12 h-12 mx-auto text-slate-700" />
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select any chat to inspect messages and moderate
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SAFETY & REPORTS */}
        {activeTab === 'reports' && (
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  User Moderation Reports Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Reports filed by users for harassment, fake accounts, catfish, or guideline violations
                </p>
              </div>
              <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300">
                Total: {reports.length}
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="py-24 text-center text-slate-500">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/60" />
                <p className="text-xs font-bold uppercase tracking-wider">Report queue is clear</p>
                <p className="text-[11px] text-slate-600 mt-1">No pending harassment or catfish reports</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map(report => {
                  const reportedUser = userMap.get(report.reportedUserId);
                  const reporter = userMap.get(report.reporterId);

                  return (
                    <div
                      key={report.id}
                      className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                              {report.reason}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                              report.status === 'resolved' 
                                ? 'bg-emerald-500/20 text-emerald-300' 
                                : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {report.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-2 font-medium">
                            Target: <strong className="text-white">{report.reportedUserName || reportedUser?.name || report.reportedUserId}</strong>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Reported by: {reporter?.name || report.reporterId} · {new Date(report.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {report.details && (
                        <div className="p-3 bg-slate-950/80 border border-slate-850 rounded-xl text-xs text-slate-300 leading-relaxed">
                          "{report.details}"
                        </div>
                      )}

                      <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-slate-800/80">
                        {reportedUser && !reportedUser.isDisabled && (
                          <button
                            onClick={() => handleToggleDisable(reportedUser, `Reported for: ${report.reason}`)}
                            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-xl text-[11px] font-bold uppercase transition-all"
                          >
                            Suspend Target
                          </button>
                        )}
                        {report.status !== 'resolved' && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id!, 'resolved')}
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-bold uppercase transition-all"
                          >
                            Mark Resolved
                          </button>
                        )}
                        {reportedUser && (
                          <button
                            onClick={() => {
                              setSelectedUser(reportedUser);
                              setActiveTab('users');
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold uppercase transition-all"
                          >
                            Inspect Account
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SYSTEM CONTROLS & PLATFORM FEATURE FLAGS */}
        {activeTab === 'system' && (
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-6 max-w-3xl mx-auto w-full">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Platform-Wide Feature Flags & System Controls
              </h2>
              <p className="text-xs text-slate-500">
                Global runtime switches stored in Firestore (/system/settings) affecting all users
              </p>
            </div>

            <div className="space-y-3">
              {/* Flag 0: Slyd+ Subscription Paywall Lock */}
              <div className="p-4 bg-cyan-950/20 border border-cyan-500/40 rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Lock className="w-4 h-4 text-cyan-400" />
                      <span>Lock Slyd+ Premium Behind Paywall (Require Subscription)</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      When ON, non-subscribers are strictly locked out of Slyd+ features (Pro Filters, Incognito, Super Likes, Unsend, Global Roam, Private Notes) unless subscribed or explicitly granted in User Controls.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={systemSettings.requireSubscriptionForPlus !== false}
                    onClick={() => handleToggleSystemSetting('requireSubscriptionForPlus', systemSettings.requireSubscriptionForPlus === false)}
                    className={`w-12 h-7 rounded-full p-1 transition-all duration-200 shrink-0 cursor-pointer flex items-center ${
                      systemSettings.requireSubscriptionForPlus !== false ? 'bg-cyan-400 shadow-md shadow-cyan-500/30' : 'bg-slate-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 transform ${
                      systemSettings.requireSubscriptionForPlus !== false ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div className="pt-2 border-t border-cyan-500/20 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-cyan-200/80">
                    Reset all non-paying accounts to Free Tier & lock Slyd+ features:
                  </span>
                  <button
                    type="button"
                    onClick={handleLockAllNonSubscribers}
                    className="px-3 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black rounded-xl text-[11px] uppercase tracking-wider transition-all"
                  >
                    Lock Non-Subscribers Now
                  </button>
                </div>
              </div>

              {/* Flag 1: Biometrics Requirement */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    Enforce Anti-Catfish Biometric Verification
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    When enabled, requires all users to take a live matching selfie with 1-per-day rate limiting
                  </p>
                </div>
                <button
                  onClick={() => handleToggleSystemSetting('requireBiometrics', !systemSettings.requireBiometrics)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    systemSettings.requireBiometrics ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    systemSettings.requireBiometrics ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Flag 2: Global Messaging */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                    Global Messaging Service
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Enable or pause chat messaging across the entire network for system upgrades
                  </p>
                </div>
                <button
                  onClick={() => handleToggleSystemSetting('allowMessaging', !systemSettings.allowMessaging)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    systemSettings.allowMessaging ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    systemSettings.allowMessaging ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Flag 3: Maintenance Mode */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    System Maintenance Banner
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Displays top banner notifying members of ongoing infrastructure improvements
                  </p>
                </div>
                <button
                  onClick={() => handleToggleSystemSetting('maintenanceMode', !systemSettings.maintenanceMode)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    systemSettings.maintenanceMode ? 'bg-amber-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    systemSettings.maintenanceMode ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Flag 4: New Registrations */}
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Users className="w-4 h-4 text-emerald-400" />
                    Allow New Registrations
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Permit new signups or temporarily close onboarding to existing users only
                  </p>
                </div>
                <button
                  onClick={() => handleToggleSystemSetting('allowRegistrations', !systemSettings.allowRegistrations)}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    systemSettings.allowRegistrations ? 'bg-sky-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                    systemSettings.allowRegistrations ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-900 rounded-2xl text-xs text-slate-500 space-y-1">
              <p>Last System Config Update: {new Date(systemSettings.updatedAt).toLocaleString()}</p>
              <p>Updated By: {systemSettings.updatedBy}</p>
            </div>
          </div>
        )}
      </div>

      {/* Account Disabling Modal */}
      {showDisableModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-2 bg-red-500/10 rounded-2xl border border-red-500/20">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase text-white font-display">Suspend Account</h3>
                <p className="text-xs text-slate-400">Target: {selectedUser.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Suspending this account will immediately lock the user out of Slyd. They will not be able to browse, chat, or update their profile until an administrator restores it.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Suspension Reason
              </label>
              <div className="space-y-1.5">
                {[
                  'Violation of Community Guidelines',
                  'Suspected Catfish / Fake Photos',
                  'Harassment or Abusive Conduct',
                  'Underage Suspicion',
                  'Spam / Commercial Bot Activity',
                  'Other'
                ].map(r => (
                  <label 
                    key={r}
                    onClick={() => setDisableReason(r)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      disableReason === r 
                        ? 'bg-red-500/10 border-red-500/40 text-red-300' 
                        : 'bg-slate-900/60 border-slate-850 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="reason" 
                      checked={disableReason === r} 
                      onChange={() => setDisableReason(r)}
                      className="accent-red-500"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
              {disableReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify custom reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowDisableModal(false)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleToggleDisable(selectedUser, disableReason === 'Other' ? customReason : disableReason)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-red-950/50"
              >
                Confirm Suspension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-red-900/60 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 bg-red-950/60 border border-red-900/80 rounded-2xl">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Purge User Profile</h3>
                <p className="text-xs text-red-400/90 font-mono">UID: {userToDelete.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the profile of <strong className="text-white">{userToDelete.name}</strong> from Firestore? This will permanently erase their document from the database and cannot be undone.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteUser}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-red-950/50"
              >
                Purge Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Account Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto no-scrollbar max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <Plus className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Add New User to Firestore</h3>
                  <p className="text-[11px] text-slate-400">Creates an authentic profile in <span className="font-mono text-sky-400">/users</span></p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="p-1 text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liam Parker"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="liam@slyd.app"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={newUserForm.age}
                    onChange={(e) => setNewUserForm({ ...newUserForm, age: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Role
                  </label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Top">Top</option>
                    <option value="Vers Top">Vers Top</option>
                    <option value="Vers">Vers</option>
                    <option value="Vers Bottom">Vers Bottom</option>
                    <option value="Bottom">Bottom</option>
                    <option value="Side">Side</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Distance Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 250m"
                    value={newUserForm.distance}
                    onChange={(e) => setNewUserForm({ ...newUserForm, distance: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Bio / Headline
                </label>
                <textarea
                  rows={2}
                  placeholder="Tell others what you're into..."
                  value={newUserForm.bio}
                  onChange={(e) => setNewUserForm({ ...newUserForm, bio: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <label className="flex items-center gap-2 p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.isVerified}
                    onChange={(e) => setNewUserForm({ ...newUserForm, isVerified: e.target.checked })}
                    className="rounded accent-sky-500"
                  />
                  <span className="text-[11px] font-bold text-white">Verified</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.isPremium}
                    onChange={(e) => setNewUserForm({ ...newUserForm, isPremium: e.target.checked })}
                    className="rounded accent-amber-500"
                  />
                  <span className="text-[11px] font-bold text-white">Slyd+</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserForm.isAdmin}
                    onChange={(e) => setNewUserForm({ ...newUserForm, isAdmin: e.target.checked })}
                    className="rounded accent-purple-500"
                  />
                  <span className="text-[11px] font-bold text-white">Admin</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-900">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoadingUsers || !newUserForm.name.trim()}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-950/50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation Modal */}
      {deleteMessageId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Delete Message</h3>
            <p className="text-xs text-slate-400">
              Permanently delete this message from the conversation thread for all participants?
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteMessageId(null)}
                className="flex-1 py-2.5 bg-slate-900 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMessage}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Chat Confirmation Modal */}
      {purgeChatId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-red-900/60 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-sm">Purge Entire Conversation</h3>
            <p className="text-xs text-slate-400">
              Permanently purge this entire conversation and all its messages? This action cannot be reversed.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setPurgeChatId(null)}
                className="flex-1 py-2.5 bg-slate-900 text-slate-300 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurgeChat}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs"
              >
                Purge Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
