import { createContext, useContext, ReactNode } from 'react';
import { Store } from '@/hooks/useStore';

interface StoreContextValue {
  store: Store | null;
  storeSlug: string;
  isLoading: boolean;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ 
  children, 
  store, 
  storeSlug,
  isLoading 
}: { 
  children: ReactNode; 
  store: Store | null;
  storeSlug: string;
  isLoading: boolean;
}) {
  return (
    <StoreContext.Provider value={{ store, storeSlug, isLoading }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStoreContext() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStoreContext must be used within a StoreProvider');
  }
  return context;
}
