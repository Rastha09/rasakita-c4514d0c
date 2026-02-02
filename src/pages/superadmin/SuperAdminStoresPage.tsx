import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { useSuperAdmin, Store } from '@/hooks/useSuperAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Store as StoreIcon, Loader2 } from 'lucide-react';
import { formatDateTime } from '@/lib/format-currency';

export default function SuperAdminStoresPage() {
  const { stores, storesLoading, createStore, updateStore, toggleStoreActive } = useSuperAdmin();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', address: '' });

  const handleOpenCreate = () => {
    setEditingStore(null);
    setFormData({ name: '', slug: '', address: '' });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      slug: store.slug,
      address: store.address || '',
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) return;

    if (editingStore) {
      await updateStore.mutateAsync({
        id: editingStore.id,
        name: formData.name,
        slug: formData.slug,
        address: formData.address || null,
      });
    } else {
      await createStore.mutateAsync({
        name: formData.name,
        slug: formData.slug,
        address: formData.address || undefined,
      });
    }
    
    setIsDialogOpen(false);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const isPending = createStore.isPending || updateStore.isPending;

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Kelola Toko</h1>
            <p className="text-sm text-muted-foreground">Daftar semua toko di platform</p>
          </div>
          <Button onClick={handleOpenCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Tambah Toko
          </Button>
        </div>

        {/* Stores Table */}
        {storesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stores.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <StoreIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Belum ada toko terdaftar</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Toko</TableHead>
                  <TableHead className="hidden md:table-cell">Slug</TableHead>
                  <TableHead className="hidden md:table-cell">Dibuat</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <StoreIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{store.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{store.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {store.slug}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatDateTime(store.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={store.is_active}
                          onCheckedChange={(checked) => 
                            toggleStoreActive.mutate({ id: store.id, is_active: checked })
                          }
                        />
                        <Badge variant={store.is_active ? 'default' : 'secondary'}>
                          {store.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenEdit(store)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStore ? 'Edit Toko' : 'Tambah Toko Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Toko</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: editingStore ? formData.slug : generateSlug(e.target.value),
                  });
                }}
                placeholder="Nama toko"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
                placeholder="nama-toko"
              />
              <p className="text-xs text-muted-foreground">
                URL: /{formData.slug || 'nama-toko'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat (opsional)</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Alamat toko"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isPending || !formData.name || !formData.slug}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStore ? 'Simpan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
}
