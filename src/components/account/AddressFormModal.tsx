import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomerAddress, AddressFormData } from '@/hooks/useCustomerAddresses';

interface AddressFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: CustomerAddress | null;
  onSubmit: (data: AddressFormData) => void;
  isLoading?: boolean;
}

export function AddressFormModal({ 
  open, 
  onOpenChange, 
  address,
  onSubmit,
  isLoading 
}: AddressFormModalProps) {
  const [form, setForm] = useState<AddressFormData>({
    label: 'Rumah',
    recipient_name: '',
    phone: '',
    address_line: '',
    city: '',
    postal_code: '',
    is_default: false,
  });

  useEffect(() => {
    if (address) {
      setForm({
        label: address.label,
        recipient_name: address.recipient_name,
        phone: address.phone,
        address_line: address.address_line,
        city: address.city || '',
        postal_code: address.postal_code || '',
        is_default: address.is_default,
      });
    } else {
      setForm({
        label: 'Rumah',
        recipient_name: '',
        phone: '',
        address_line: '',
        city: '',
        postal_code: '',
        is_default: false,
      });
    }
  }, [address, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const isEdit = !!address;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Alamat' : 'Tambah Alamat Baru'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Label Alamat</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Rumah / Kantor / dll"
              required
            />
          </div>

          <div>
            <Label>Nama Penerima</Label>
            <Input
              value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
              placeholder="Nama lengkap penerima"
              required
            />
          </div>

          <div>
            <Label>No. Telepon</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="08xxxxxxxxxx"
              type="tel"
              required
            />
          </div>

          <div>
            <Label>Alamat Lengkap</Label>
            <Input
              value={form.address_line}
              onChange={(e) => setForm({ ...form, address_line: e.target.value })}
              placeholder="Jl. Nama Jalan No. XX, RT/RW, Kelurahan, Kecamatan"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kota</Label>
              <Input
                value={form.city || ''}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Nama kota"
              />
            </div>
            <div>
              <Label>Kode Pos</Label>
              <Input
                value={form.postal_code || ''}
                onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                placeholder="12345"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={form.is_default}
              onCheckedChange={(checked) => setForm({ ...form, is_default: checked as boolean })}
            />
            <label htmlFor="is_default" className="text-sm">
              Jadikan alamat utama
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isEdit ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
