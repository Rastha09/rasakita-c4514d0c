import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, RotateCcw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

type SimulateAction = 'PAID' | 'EXPIRED' | 'RESET';

export default function PaymentsDebugPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [orderId, setOrderId] = useState('');

  const simulateMutation = useMutation({
    mutationFn: async (action: SimulateAction) => {
      if (!session?.access_token) throw new Error('Not authenticated');
      if (!orderId.trim()) throw new Error('Order ID is required');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/duitku-simulate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId: orderId.trim(), action }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to simulate');
      }
      return result;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Simulasi berhasil');
    },
    onError: (error) => {
      console.error('Simulate error:', error);
      toast.error(error instanceof Error ? error.message : 'Gagal melakukan simulasi');
    },
  });

  const handleSimulate = (action: SimulateAction) => {
    if (!orderId.trim()) {
      toast.error('Masukkan Order ID');
      return;
    }
    simulateMutation.mutate(action);
  };

  const isLoading = simulateMutation.isPending;

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Debug Pembayaran</h1>
            <p className="text-sm text-muted-foreground">Sandbox Mode Only</p>
          </div>
        </div>

        {/* Warning */}
        <Alert className="mb-6 border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Mode Sandbox</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Halaman ini hanya tersedia dalam mode sandbox Duitku.
            Simulasi ini tidak mempengaruhi transaksi nyata.
          </AlertDescription>
        </Alert>

        {/* Input Order ID */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order ID</CardTitle>
            <CardDescription>
              Masukkan UUID order yang ingin disimulasikan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID (UUID)</Label>
              <Input
                id="orderId"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Simulation Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                Simulasi PAID
              </CardTitle>
              <CardDescription>
                Set pembayaran menjadi sukses dan order menjadi CONFIRMED
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleSimulate('PAID')}
                disabled={isLoading || !orderId.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simulasi Bayar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Simulasi EXPIRED
              </CardTitle>
              <CardDescription>
                Set pembayaran dan order menjadi EXPIRED
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => handleSimulate('EXPIRED')}
                disabled={isLoading || !orderId.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Simulasi Expired
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <RotateCcw className="h-5 w-5" />
                Reset UNPAID
              </CardTitle>
              <CardDescription>
                Reset status pembayaran ke PENDING/UNPAID dengan waktu baru
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                onClick={() => handleSimulate('RESET')}
                disabled={isLoading || !orderId.trim()}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Reset Pembayaran
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
