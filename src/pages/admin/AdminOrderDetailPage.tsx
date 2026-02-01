import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { ArrowLeft, Loader2, Truck, Store, CreditCard, Banknote, Package } from 'lucide-react';
import { useAdminOrderDetail, useUpdateOrderStatus, type OrderStatus } from '@/hooks/useAdminOrders';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  NEW: { label: 'Baru', variant: 'outline' },
  PAID: { label: 'Dibayar', variant: 'default' },
  PROCESSING: { label: 'Diproses', variant: 'secondary' },
  COMPLETED: { label: 'Selesai', variant: 'outline' },
  CANCELLED: { label: 'Dibatalkan', variant: 'destructive' },
};

export default function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useAdminOrderDetail(orderId || '');
  const updateStatus = useUpdateOrderStatus();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; nextStatus: OrderStatus | null }>({
    open: false,
    nextStatus: null,
  });

  const handleStatusChange = (nextStatus: OrderStatus) => {
    setConfirmDialog({ open: true, nextStatus });
  };

  const confirmStatusChange = () => {
    if (order && confirmDialog.nextStatus) {
      updateStatus.mutate(
        { orderId: order.id, newStatus: confirmDialog.nextStatus },
        { onSuccess: () => setConfirmDialog({ open: false, nextStatus: null }) }
      );
    }
  };

  const canProcess = order?.order_status === 'PAID';
  const canComplete = order?.order_status === 'PROCESSING';
  
  // Block processing if QRIS payment not yet paid
  const isQrisUnpaid = order?.payment_method === 'QRIS' && order?.payment_status !== 'PAID';

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Pesanan tidak ditemukan</p>
          <Button variant="link" onClick={() => navigate('/admin/orders')}>
            Kembali ke daftar pesanan
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">{order.order_code}</h1>
            <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
          </div>
          <Badge variant={statusConfig[order.order_status]?.variant || 'outline'} className="text-sm">
            {statusConfig[order.order_status]?.label || order.order_status}
          </Badge>
        </div>

        {/* Order Info */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              {order.shipping_method === 'PICKUP' ? (
                <Store className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Truck className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {order.shipping_method === 'PICKUP' ? 'Ambil di Tempat' : 'Pengiriman Kurir'}
                </p>
                {order.customer_address && (
                  <p className="text-sm text-muted-foreground">
                    {(order.customer_address as { address?: string })?.address}
                  </p>
                )}
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              {order.payment_method === 'QRIS' ? (
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Banknote className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">{order.payment_method}</p>
                <p className="text-sm text-muted-foreground">
                  Status: {order.payment_status === 'PAID' ? 'Lunas' : 'Belum Bayar'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daftar Item</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.qty} x {formatCurrency(item.price)}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground italic mt-1">
                      Catatan: {item.notes}
                    </p>
                  )}
                </div>
                <p className="font-medium">{formatCurrency(item.qty * item.price)}</p>
              </div>
            ))}
            <Separator />
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ongkir</span>
                <span>{formatCurrency(order.shipping_fee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {order.notes && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">Catatan Pembeli</p>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {canProcess && (
            <>
              {isQrisUnpaid ? (
                <Button disabled className="w-full" size="lg">
                  Menunggu Pembayaran QRIS
                </Button>
              ) : (
                <Button 
                  onClick={() => handleStatusChange('PROCESSING')} 
                  className="w-full" 
                  size="lg"
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Package className="h-4 w-4 mr-2" />
                  )}
                  Proses Pesanan
                </Button>
              )}
            </>
          )}
          {canComplete && (
            <Button 
              onClick={() => handleStatusChange('COMPLETED')} 
              className="w-full" 
              size="lg"
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Selesaikan Pesanan
            </Button>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, nextStatus: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan Status</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.nextStatus === 'PROCESSING' 
                ? 'Pesanan akan dipindahkan ke status "Diproses". Lanjutkan?'
                : 'Pesanan akan ditandai sebagai selesai. Stok akan otomatis berkurang. Lanjutkan?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Ya, Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
