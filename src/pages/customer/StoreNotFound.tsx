import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

const StoreNotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <Store className="h-10 w-10 text-muted-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">Toko Tidak Ditemukan</h1>
        <p className="text-muted-foreground mb-6">
          Maaf, toko yang Anda cari tidak tersedia atau sudah tidak aktif.
        </p>
        <Button asChild>
          <Link to="/">Kembali ke Beranda</Link>
        </Button>
      </div>
    </div>
  );
};

export default StoreNotFound;
