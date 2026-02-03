import { useState } from 'react';
import { User, Phone, Mail, LogOut, Loader2, Edit2, Check, X, ShieldCheck, Store } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function AccountPage() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { full_name: string; phone: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name || null,
          phone: data.phone || null,
        })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profil berhasil diperbarui');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Force refresh the page to update auth context
      window.location.reload();
    },
    onError: () => {
      toast.error('Gagal memperbarui profil');
    },
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/makka-bakerry');
    toast.success('Berhasil keluar');
  };

  const handleSave = () => {
    updateProfileMutation.mutate(editForm);
  };

  const handleCancel = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
    });
    setIsEditing(false);
  };

  // Determine layout based on role
  const isAdmin = profile?.role === 'ADMIN';
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';
  const isNonCustomer = isAdmin || isSuperAdmin;

  // For ADMIN/SUPER_ADMIN, don't wrap in CustomerLayout
  const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
    if (isNonCustomer) {
      return <div className="min-h-screen bg-background p-4">{children}</div>;
    }
    return <CustomerLayout>{children}</CustomerLayout>;
  };

  if (loading) {
    return (
      <ContentWrapper>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ContentWrapper>
    );
  }

  if (!user) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Belum Login</h2>
          <p className="text-muted-foreground text-sm text-center mb-6">
            Masuk untuk melihat dan mengelola akun Anda
          </p>
          <Button asChild className="rounded-full px-6">
            <a href="/login">Masuk</a>
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <ContentWrapper>
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4">Akun Saya</h1>

        {/* Admin/SuperAdmin Quick Access */}
        {isNonCustomer && (
          <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Akses Cepat</h3>
            {isSuperAdmin && (
              <Button asChild className="w-full rounded-full mb-2" variant="default">
                <Link to="/superadmin">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Masuk Super Admin
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button asChild className="w-full rounded-full" variant="default">
                <Link to="/admin">
                  <Store className="h-4 w-4 mr-2" />
                  Masuk Admin
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-4 shadow-card mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{profile?.full_name || 'Pengguna'}</h2>
                <Badge variant="secondary" className="rounded-full text-xs mt-1">
                  {profile?.role || 'CUSTOMER'}
                </Badge>
              </div>
            </div>
            {!isEditing && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Nama Lengkap</label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Nama lengkap"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">No. Telepon</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  type="tel"
                  className="rounded-xl"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={handleCancel}
                  disabled={updateProfileMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" /> Batal
                </Button>
                <Button
                  className="flex-1 rounded-full"
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Simpan
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Telepon</p>
                  <p className="text-sm font-medium">{profile?.phone || 'Belum diisi'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full rounded-full text-destructive border-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Keluar
        </Button>
      </div>
    </ContentWrapper>
  );
}
