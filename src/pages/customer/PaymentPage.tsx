import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw, QrCode } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  SUCCESS: { label: 'Pembayaran Berhasil', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  EXPIRED: { label: 'Kedaluwarsa', color: 'bg-red-100 text-red-700', icon: XCircle },
  FAILED: { label: 'Gagal', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export default function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState<string>('');

  // Fetch order and payment
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['payment', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID');

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Get latest PENDING payment
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return { order, payment };
    },
    enabled: !!orderId && !!user,
    refetchInterval: (query) => {
      // Poll every 5 seconds while PENDING
      const data = query.state.data;
      if (data?.order?.payment_status === 'UNPAID' && data?.payment?.status === 'PENDING') {
        return 5000;
      }
      return false;
    },
  });

  const order = data?.order;
  const payment = data?.payment;

  // Countdown timer
  useEffect(() => {
    if (!payment?.expired_at || payment.status !== 'PENDING') {
      setCountdown('');
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const expiry = new Date(payment.expired_at!).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setCountdown('00:00');
        refetch();
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [payment?.expired_at, payment?.status, refetch]);

  // Create new invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/duitku-create-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invoice');
      }
      return result;
    },
    onSuccess: () => {
      toast.success('Invoice pembayaran berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['payment', orderId] });
    },
    onError: (error) => {
      console.error('Create invoice error:', error);
      toast.error('Gagal membuat invoice pembayaran');
    },
  });

  const handleRefresh = () => {
    refetch();
    toast.info('Memperbarui status...');
  };

  const handleCreateNewPayment = () => {
    createInvoiceMutation.mutate();
  };

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  if (!order) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Pesanan tidak ditemukan</p>
          <Button onClick={() => navigate('/makka-bakerry/orders')}>Kembali ke Pesanan</Button>
        </div>
      </CustomerLayout>
    );
  }

  // If payment is complete, redirect to order detail
  if (order.payment_status === 'PAID') {
    return (
      <CustomerLayout>
        <div className="px-4 py-8 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Pembayaran Berhasil!</h1>
          <p className="text-muted-foreground mb-6">Terima kasih, pesanan Anda sedang diproses</p>
          <Button onClick={() => navigate(`/makka-bakerry/orders/${orderId}`)}>Lihat Detail Pesanan</Button>
        </div>
      </CustomerLayout>
    );
  }

  const paymentStatus = payment?.status || 'PENDING';
  const statusConfig = PAYMENT_STATUS_CONFIG[paymentStatus] || PAYMENT_STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  const isExpired = paymentStatus === 'EXPIRED' || 
    (payment?.expired_at && new Date(payment.expired_at) < new Date());
  const showQR = payment?.qr_string && paymentStatus === 'PENDING' && !isExpired;

  return (
    <CustomerLayout>
      <div className="px-4 py-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(`/makka-bakerry/orders/${orderId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Pembayaran QRIS</h1>
            <p className="text-xs text-muted-foreground">{order.order_code}</p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center mb-6">
          <Badge className={cn('rounded-full text-sm px-4 py-2 flex items-center gap-2', statusConfig.color)}>
            <StatusIcon className="h-4 w-4" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* QR Code */}
        {showQR ? (
          <div className="bg-card rounded-2xl p-6 shadow-card mb-4 text-center">
            <div className="bg-white p-4 rounded-xl inline-block mb-4">
              {payment.qr_string ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payment.qr_string)}`}
                  alt="QR Code"
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-muted rounded-lg">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Countdown */}
            {countdown && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-1">Bayar dalam</p>
                <p className="text-2xl font-bold text-primary font-mono">{countdown}</p>
              </div>
            )}

            {/* Amount */}
            <div className="bg-muted/50 rounded-xl p-4 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Total Pembayaran</p>
              <p className="text-2xl font-bold">Rp {order.total.toLocaleString('id-ID')}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              Scan QR code dengan aplikasi e-wallet atau mobile banking Anda
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-6 shadow-card mb-4 text-center">
            {isExpired ? (
              <>
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Pembayaran Kedaluwarsa</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Batas waktu pembayaran telah habis
                </p>
              </>
            ) : paymentStatus === 'FAILED' ? (
              <>
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Pembayaran Gagal</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Terjadi kesalahan saat memproses pembayaran
                </p>
              </>
            ) : !payment ? (
              <>
                <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Belum Ada Invoice</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Buat invoice pembayaran untuk melanjutkan
                </p>
              </>
            ) : null}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {showQR && (
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Cek Status Pembayaran
            </Button>
          )}

          {(isExpired || paymentStatus === 'FAILED' || !payment) && (
            <Button
              className="w-full rounded-full"
              onClick={handleCreateNewPayment}
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Membuat Invoice...
                </>
              ) : (
                'Buat Pembayaran Baru'
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate(`/makka-bakerry/orders/${orderId}`)}
          >
            Lihat Detail Pesanan
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
