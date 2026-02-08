'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, User, Mail, MessageCircle, Smile } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUIStore } from '@/store/ui-store';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';

export function SettingsDialog() {
  const { isSettingsOpen, setSettingsOpen } = useUIStore();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pre-fill form when dialog opens
  useEffect(() => {
    if (isSettingsOpen && user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setStatus(user.status || '');
      setError('');
      setSuccess('');
    }
  }, [isSettingsOpen, user]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await api.patch('/api/users/me', {
        name: name.trim(),
        bio: bio.trim() || undefined,
        status: status.trim() || undefined,
      });

      // Update auth store with new user data
      if (user) {
        setUser({
          ...user,
          name: (updated as any).name ?? user.name,
          bio: (updated as any).bio ?? user.bio,
          status: (updated as any).status ?? user.status,
        });
      }

      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Avatar Preview */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user?.name} />}
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-lg font-medium">
                {name?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{name || 'Your Name'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your display name"
              maxLength={50}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="flex h-9 w-full rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself"
              maxLength={300}
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {bio.length}/300
            </p>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-2">
              <Smile className="h-3.5 w-3.5 text-muted-foreground" />
              Status
            </label>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="What's on your mind?"
              maxLength={100}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* Error / Success Messages */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          {success && (
            <p className="text-sm text-emerald-600">{success}</p>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
