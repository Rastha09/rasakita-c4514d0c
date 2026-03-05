import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { useSuperAdmin, Profile } from '@/hooks/useSuperAdmin';
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Users, Pencil, Loader2, ShieldCheck, Store as StoreIcon, User, Plus, Trash2, Search } from 'lucide-react';
import { formatDateTime } from '@/lib/format-currency';

const roleLabels: Record<Profile['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  CUSTOMER: 'Customer',
};

const roleBadgeVariants: Record<Profile['role'], 'default' | 'secondary' | 'outline'> = {
  SUPER_ADMIN: 'default',
  ADMIN: 'secondary',
  CUSTOMER: 'outline',
};

export default function SuperAdminUsersPage() {
  const { 
    users, usersLoading, storeAdmins, updateUserRole, assignStoreAdmin, removeStoreAdmin 
  } = useSuperAdmin();
  const { data: store } = useStore();
  
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<Profile['role']>('CUSTOMER');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const getStoreAdminEntry = (userId: string) => storeAdmins.find(sa => sa.user_id === userId);

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (u.phone || '').includes(searchQuery);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenRoleEdit = (user: Profile) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setIsRoleDialogOpen(true);
  };

  const handleOpenAssign = () => {
    setSelectedUserId('');
    setIsAssignDialogOpen(true);
  };

  const handleSubmitRole = async () => {
    if (!editingUser) return;
    await updateUserRole.mutateAsync({ id: editingUser.id, role: selectedRole });
    setIsRoleDialogOpen(false);
  };

  const handleAssignAdmin = async () => {
    if (!selectedUserId || !store?.id) return;
    await assignStoreAdmin.mutateAsync({ user_id: selectedUserId, store_id: store.id });
    setIsAssignDialogOpen(false);
  };

  const handleRemoveAdmin = async (userId: string, storeId: string) => {
    await removeStoreAdmin.mutateAsync({ user_id: userId, store_id: storeId });
  };

  const getRoleIcon = (role: Profile['role']) => {
    switch (role) {
      case 'SUPER_ADMIN': return ShieldCheck;
      case 'ADMIN': return StoreIcon;
      default: return User;
    }
  };

  const availableUsers = users.filter(u => {
    const isAdmin = storeAdmins.some(sa => sa.user_id === u.id);
    return u.role !== 'SUPER_ADMIN' && !isAdmin;
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Kelola Users</h1>
            <p className="text-sm text-muted-foreground">{users.length} pengguna terdaftar</p>
          </div>
          <Button onClick={handleOpenAssign} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Tambah Admin
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama atau telepon..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Semua Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Role</SelectItem>
              <SelectItem value="CUSTOMER">Customer</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {users.length === 0 ? 'Belum ada pengguna' : 'Tidak ada user yang cocok'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Bergabung</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  const storeAdminEntry = getStoreAdminEntry(user.id);
                  const isAdmin = !!storeAdminEntry;
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                            {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{user.phone || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={roleBadgeVariants[user.role]} className="gap-1 w-fit">
                            <RoleIcon className="h-3 w-3" />
                            {roleLabels[user.role]}
                          </Badge>
                          {isAdmin && (
                            <Badge variant="secondary" className="gap-1 w-fit">
                              <StoreIcon className="h-3 w-3" />
                              Store Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatDateTime(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenRoleEdit(user)} title="Edit Role">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {isAdmin && storeAdminEntry && (
                            <Button 
                              variant="ghost" size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveAdmin(user.id, storeAdminEntry.store_id)}
                              title="Hapus admin"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Role User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{editingUser?.full_name || 'Unnamed'}</p>
              <p className="text-sm text-muted-foreground">{editingUser?.phone || '-'}</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Profile['role'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSubmitRole} disabled={updateUserRole.isPending}>
              {updateUserRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Admin Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pilih User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger><SelectValue placeholder="Pilih user" /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || 'Unnamed'} ({user.phone || '-'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAssignAdmin} disabled={assignStoreAdmin.isPending || !selectedUserId}>
              {assignStoreAdmin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}