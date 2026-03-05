import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format-currency';

interface Notification {
  id: string;
  icon: string;
  text: string;
  time: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { storeAdmin, profile } = useAuth();
  const isSuperAdmin = profile?.role === 'SUPER_ADMIN';

  const { data: notifications = [] } = useQuery({
    queryKey: ['admin-notifications', storeAdmin?.store_id, isSuperAdmin],
    queryFn: async (): Promise<Notification[]> => {
      const results: Notification[] = [];

      if (isSuperAdmin) {
        // Recent orders across all stores
        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_code, created_at, order_status')
          .in('order_status', ['NEW', 'CONFIRMED'])
          .order('created_at', { ascending: false })
          .limit(5);

        orders?.forEach(o => {
          results.push({
            id: o.id,
            icon: '📦',
            text: `Pesanan baru ${o.order_code}`,
            time: formatDateTime(o.created_at),
          });
        });

        // Recent users
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        users?.forEach(u => {
          results.push({
            id: u.id,
            icon: '👤',
            text: `User baru: ${u.full_name || 'Anonymous'}`,
            time: formatDateTime(u.created_at),
          });
        });
      } else if (storeAdmin?.store_id) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_code, created_at, order_status')
          .eq('store_id', storeAdmin.store_id)
          .in('order_status', ['NEW', 'CONFIRMED'])
          .order('created_at', { ascending: false })
          .limit(5);

        orders?.forEach(o => {
          results.push({
            id: o.id,
            icon: '📦',
            text: `Pesanan baru ${o.order_code}`,
            time: formatDateTime(o.created_at),
          });
        });
      }

      return results.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 5);
    },
    refetchInterval: 30000,
  });

  const count = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border">
          <p className="font-semibold text-sm">Notifikasi</p>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Tidak ada notifikasi</p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/50">
                <p className="text-sm">
                  <span className="mr-1.5">{n.icon}</span>
                  {n.text}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
