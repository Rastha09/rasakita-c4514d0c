import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { useLocation } from 'react-router-dom';

export default function CustomerPlaceholder() {
  const location = useLocation();
  const pageName = location.pathname.split('/').pop() || 'Page';

  return (
    <CustomerLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
        <h1 className="text-xl font-bold capitalize mb-2">{pageName}</h1>
        <p className="text-muted-foreground text-center">Halaman ini akan segera tersedia</p>
      </div>
    </CustomerLayout>
  );
}
