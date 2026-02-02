import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { useSuperAdmin, Profile } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Pencil, Loader2, ShieldCheck, Store, User } from 'lucide-react';
import { formatDateTime } from '@/lib/format-currency';

const roleLabels: Record<Profile['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin Toko',
  CUSTOMER: 'Customer',
};

const roleBadgeVariants: Record<Profile['role'], 'default' | 'secondary' | 'outline'> = {
  SUPER_ADMIN: 'default',
  ADMIN: 'secondary',
  CUSTOMER: 'outline',
};

export default function SuperAdminUsersPage() {
  const { users, usersLoading, stores, updateUserRole } = useSuperAdmin();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<Profile['role']>('CUSTOMER');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');

  const handleOpenEdit = (user: Profile) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedStoreId(user.store_id || '');
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!editingUser) return;

    await updateUserRole.mutateAsync({
      id: editingUser.id,
      role: selectedRole,
      store_id: selectedRole === 'ADMIN' ? selectedStoreId : null,
    });
    
    setIsDialogOpen(false);
  };

  const getRoleIcon = (role: Profile['role']) => {
    switch (role) {
      case 'SUPER_ADMIN': return ShieldCheck;
      case 'ADMIN': return Store;
      default: return User;
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold">Kelola Users</h1>
          <p className="text-sm text-muted-foreground">Daftar semua pengguna di platform</p>
        </div>

        {/* Users Table */}
        {usersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Belum ada pengguna</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Toko</TableHead>
                  <TableHead className="hidden md:table-cell">Bergabung</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-muted-foreground">{user.phone || '-'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={roleBadgeVariants[user.role]} className="gap-1">
                          <RoleIcon className="h-3 w-3" />
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {user.store?.name || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatDateTime(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER">Customer</SelectItem>
                  <SelectItem value="ADMIN">Admin Toko</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === 'ADMIN' && (
              <div className="space-y-2">
                <Label>Toko</Label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih toko" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admin harus terhubung dengan toko
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={updateUserRole.isPending || (selectedRole === 'ADMIN' && !selectedStoreId)}
            >
              {updateUserRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
