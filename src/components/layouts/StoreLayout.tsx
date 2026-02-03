import { ReactNode } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { StoreProvider } from '@/lib/store-context';
import { Loader2 } from 'lucide-react';
import StoreNotFound from '@/pages/customer/StoreNotFound';

interface StoreLayoutProps {
  children?: ReactNode;
}

export function StoreLayout({ children }: StoreLayoutProps) {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { data: store, isLoading, isError } = useStore(storeSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store || isError) {
    return <StoreNotFound />;
  }

  return (
    <StoreProvider store={store} storeSlug={storeSlug || ''} isLoading={isLoading}>
      {children || <Outlet />}
    </StoreProvider>
  );
}
