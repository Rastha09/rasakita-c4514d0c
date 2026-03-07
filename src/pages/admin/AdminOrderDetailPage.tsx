import { useState, useEffect } from 'react';
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
import { ArrowLeft, Loader2, Truck, Store, CreditCard, Banknote, Package, CheckCircle, X, MapPin } from 'lucide-react';
import { useAdminOrderDetail, useUpdateOrderStatus, type OrderStatus } from '@/hooks/useAdminOrders';
import { formatCurrency, formatDateTime } from '@/lib/format-currency';
import { fetchProductsByIds, getProductThumb, type ProductWithImages } from '@/lib/product-image';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  NEW: { label: 'Baru', variant: 'outline' },
  CONFIRMED: { label: 'Dikonfirmasi', variant: 'default' },
  PROCESSING: { label: 'Diproses', variant: 'secondary' },
  OUT_FOR_DELIVERY: { label: 'Dikirim', variant: 'default' },
  READY_FOR_PICKUP: { label: 'Siap Diambil', variant: 'default' },
  COMPLETED: { label: 'Selesai', variant: 'outline' },
  CANCELED: { label: 'Dibatalkan', variant: 'destructive' },
};

export default function AdminOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useAdminOrderDetail(orderId || '');
  const updateStatus = useUpdateOrderStatus();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; nextStatus: OrderStatus | null; description: string }>({
    open: false,
    nextStatus: null,
    description: '',
  });
  const [productImages, setProductImages] = useState<Map<string, ProductWithImages>>(new Map());

  useEffect(() => {
    if (order?.items) {
      const productIds = order.items.map(item => item.product_id).filter(Boolean);
      if (productIds.length > 0) {
        fetchProductsByIds(productIds).then(setProductImages);
      }
    }
  }, [order?.items]);

  const handleStatusChange = (nextStatus: OrderStatus, description: string) => {
    setConfirmDialog({ open: true, nextStatus, description });
  };

  const confirmStatusChange = () => {
    if (order && confirmDialog.nextStatus) {
      const shouldUpdatePayment = order.order_status === 'NEW' && 
                                   order.payment_method === 'COD' && 
                                   confirmDialog.nextStatus === 'PROCESSING';
      
      updateStatus.mutate(
        { 
          orderId: order.id, 
          newStatus: confirmDialog.nextStatus,
          updatePayment: shouldUpdatePayment
        },
        { onSuccess: () => setConfirmDialog({ open: false, nextStatus: null, description: '' }) }
      );
    }
  };

  const handleReject = () => {
    handleStatusChange('CANCELED', 'Pesanan akan dibatalkan. Tindakan ini tidak dapat dikembalikan.');
  };

  // Status checks
  const isNew = order?.order_status === 'NEW' || order?.order_status === 'CONFIRMED';
  const isProcessing = order?.order_status === 'PROCESSING';
  const isDelivering = order?.order_status === 'OUT_FOR_DELIVERY' || order?.order_status === 'READY_FOR_PICKUP';
  const isQrisUnpaid = order?.payment_method === 'QRIS' && order?.payment_status !== 'PAID';
  const address = order?.customer_address as Record<string, any> | null;

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

        {/* Customer Info */}
        {address && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{address.recipient_name || address.name || 'Pelanggan'}</p>
                  {address.phone && <p className="text-sm text-muted-foreground">{address.phone}</p>}
                  {(address.address || address.address_line) && (
                    <p className="text-sm text-muted-foreground">{address.address || address.address_line}</p>
                  )}
                  {address.city && <p className="text-sm text-muted-foreground">{address.city} {address.postal_code || ''}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
            {order.items.map((item, idx) => {
              const product = productImages.get(item.product_id);
              const thumbUrl = getProductThumb(product);
              
              return (
                <div key={idx} className="flex items-start gap-3">
                  <img 
                    src={thumbUrl} 
                    alt={item.name}
                    className="w-12 h-12 rounded-lg object-cover bg-muted flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.qty} x {formatCurrency(item.price)}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground italic mt-1">
                        Catatan: {item.notes}
                      </p>
                    )}
                  </div>
                  <p className="font-medium flex-shrink-0">{formatCurrency(item.qty * item.price)}</p>
                </div>
              );
            })}
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

        {/* Actions - Full Status Flow */}
        <div className="space-y-2">
          {/* NEW orders: Terima & Proses + Tolak */}
          {isNew && !isQrisUnpaid && (
            <>
              <Button 
                onClick={() => handleStatusChange('PROCESSING', 'Pesanan akan dipindahkan ke status "Diproses". Lanjutkan?')} 
                className="w-full" 
                size="lg"
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Terima & Proses Pesanan
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-destructive text-destructive hover:bg-destructive/10" 
                size="lg"
                onClick={handleReject}
                disabled={updateStatus.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Tolak Pesanan
              </Button>
            </>
          )}
          
          {/* NEW + QRIS unpaid */}
          {isNew && isQrisUnpaid && (
            <>
              <Button disabled className="w-full" size="lg">
                Menunggu Pembayaran QRIS
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-destructive text-destructive hover:bg-destructive/10" 
                size="lg"
                onClick={handleReject}
                disabled={updateStatus.isPending}
              >
                <X className="h-4 w-4 mr-2" /> Tolak Pesanan
              </Button>
            </>
          )}
          
          {/* PROCESSING → Tandai Dikirim / Siap Diambil */}
          {isProcessing && (
            <Button 
              onClick={() => {
                const nextStatus: OrderStatus = order.shipping_method === 'PICKUP' ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY';
                const desc = order.shipping_method === 'PICKUP' 
                  ? 'Pesanan akan ditandai sebagai "Siap Diambil". Lanjutkan?'
                  : 'Pesanan akan ditandai sebagai "Dikirim". Lanjutkan?';
                handleStatusChange(nextStatus, desc);
              }}
              className="w-full" 
              size="lg"
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Truck className="h-4 w-4 mr-2" />
              )}
              {order.shipping_method === 'PICKUP' ? 'Tandai Siap Diambil' : 'Tandai Dikirim'}
            </Button>
          )}

          {/* OUT_FOR_DELIVERY / READY_FOR_PICKUP → Konfirmasi Selesai */}
          {isDelivering && (
            <Button 
              onClick={() => handleStatusChange('COMPLETED', 'Pesanan akan ditandai sebagai selesai. Stok akan otomatis berkurang. Lanjutkan?')}
              className="w-full bg-emerald-600 hover:bg-emerald-700" 
              size="lg"
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Konfirmasi Selesai
            </Button>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, nextStatus: null, description: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Perubahan Status</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
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