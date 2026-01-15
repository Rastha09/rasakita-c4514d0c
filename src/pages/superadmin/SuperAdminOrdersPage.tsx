import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { ShoppingBag } from 'lucide-react';

export default function SuperAdminOrdersPage() {
  return (
    <SuperAdminLayout>
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold mb-2">Semua Pesanan</h1>
        <p className="text-muted-foreground text-center">
          Halaman overview pesanan akan segera hadir
        </p>
      </div>
    </SuperAdminLayout>
  );
}
