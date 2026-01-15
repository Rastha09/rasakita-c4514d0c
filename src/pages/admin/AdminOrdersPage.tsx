import { AdminLayout } from '@/components/layouts/AdminLayout';
import { ShoppingBag } from 'lucide-react';

export default function AdminOrdersPage() {
  return (
    <AdminLayout>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold mb-2">Pesanan</h1>
        <p className="text-muted-foreground text-center">
          Halaman manajemen pesanan akan segera hadir
        </p>
      </div>
    </AdminLayout>
  );
}
