import { useState } from 'react';
import { Plus, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressCard } from './AddressCard';
import { AddressFormModal } from './AddressFormModal';
import { useCustomerAddresses, CustomerAddress, AddressFormData } from '@/hooks/useCustomerAddresses';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AddressSection() {
  const { addresses, isLoading, createAddress, updateAddress, deleteAddress, setDefaultAddress } = useCustomerAddresses();
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (data: AddressFormData) => {
    if (editingAddress) {
      await updateAddress.mutateAsync({ id: editingAddress.id, data });
    } else {
      await createAddress.mutateAsync(data);
    }
    setShowForm(false);
    setEditingAddress(null);
  };

  const handleEdit = (address: CustomerAddress) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteAddress.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Alamat Pengiriman</h3>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => {
              setEditingAddress(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-6">
            <MapPin className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">Belum ada alamat tersimpan</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              Tambah alamat pertama
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((address) => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={handleEdit}
                onDelete={setDeletingId}
                onSetDefault={(id) => setDefaultAddress.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>

      <AddressFormModal
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingAddress(null);
        }}
        address={editingAddress}
        onSubmit={handleSubmit}
        isLoading={createAddress.isPending || updateAddress.isPending}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Alamat?</AlertDialogTitle>
            <AlertDialogDescription>
              Alamat ini akan dihapus secara permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
