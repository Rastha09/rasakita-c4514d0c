import { useState } from 'react';
import { SuperAdminLayout } from '@/components/layouts/SuperAdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Store, Package, ShoppingBag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminTokoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ['sa-stores'],
    queryFn: async () => {
      const { data: storesData } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
      const stores = storesData || [];
      
      const enriched = await Promise.all(stores.map(async (store) => {
        const [prodRes, orderRes, adminRes] = await Promise.all([
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
          supabase.from('store_admins').select('user_id').eq('store_id', store.id).limit(1),
        ]);
        
        let adminName = '-';
        if (adminRes.data?.[0]) {
          const { data: prof } = await supabase.from('profiles').select('full_name').eq('id', adminRes.data[0].user_id).single();
          adminName = prof?.full_name || '-';
        }

        return {
          ...store,
          productCount: prodRes.count || 0,
          orderCount: orderRes.count || 0,
          adminName,
        };
      }));

      return enriched;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ storeId, isActive }: { storeId: string; isActive: boolean }) => {
      const { error } = await supabase.from('stores').update({ is_active: isActive }).eq('id', storeId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['sa-stores'] });
      toast({ title: vars.isActive ? 'Toko diaktifkan' : 'Toko dinonaktifkan' });
    },
    onError: (error) => {
      toast({ title: 'Gagal mengubah status', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Kelola Toko</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>)}
          </div>
        ) : stores?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">Belum ada toko</p>
            <p className="text-sm text-muted-foreground">Toko yang terdaftar akan muncul di sini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stores?.map((store) => (
              <Card key={store.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold truncate">{store.name}</p>
                        <Badge variant={store.is_active ? 'default' : 'secondary'} className="text-xs">
                          {store.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">Admin: {store.adminName}</p>
                      <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" /> {store.productCount} produk</span>
                        <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" /> {store.orderCount} pesanan</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={store.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ storeId: store.id, isActive: checked })}
                        disabled={toggleActive.isPending}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {store.is_active ? 'Aktif' : 'Off'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}