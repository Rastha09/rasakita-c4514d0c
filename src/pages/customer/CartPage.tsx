import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { EmptyState } from '@/components/customer/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/lib/cart';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CartPage() {
  const { items, updateQty, updateNotes, removeItem, subtotal } = useCart();
  const navigate = useNavigate();

  // Fetch current stock for all cart items
  const productIds = items.map((item) => item.product_id);
  const { data: productsStock } = useQuery({
    queryKey: ['cart-products-stock', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return new Map<string, number>();
      const { data, error } = await supabase
        .from('products')
        .select('id, stock')
        .in('id', productIds);
      if (error) throw error;
      const map = new Map<string, number>();
      data.forEach((p) => map.set(p.id, p.stock));
      return map;
    },
    enabled: productIds.length > 0,
  });

  const getStock = (productId: string) => productsStock?.get(productId) ?? 0;

  if (items.length === 0) {
    return (
      <CustomerLayout>
        <EmptyState
          icon={ShoppingCart}
          title="Keranjang Kosong"
          description="Yuk, mulai belanja dan temukan produk favoritmu!"
          actionLabel="Belanja Sekarang"
          actionLink="/"
        />
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="px-4 py-4 pb-32">
        <h1 className="text-xl font-bold mb-4">Keranjang</h1>

        <div className="space-y-3">
          {items.map((item) => {
            const stock = getStock(item.product_id);
            const isMaxQty = item.qty >= stock;
            const isOutOfStock = stock <= 0;
            
            const handleIncrement = () => {
              if (isMaxQty) {
                toast.error('Stok tidak cukup');
                return;
              }
              updateQty(item.product_id, item.qty + 1);
            };
            
            return (
              <div
                key={item.product_id}
                className="bg-card rounded-2xl p-4 shadow-card"
              >
                <div className="flex gap-3">
                  <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-sm truncate">{item.name}</h3>
                        {isOutOfStock && (
                          <span className="text-xs text-destructive">Stok habis</span>
                        )}
                        {!isOutOfStock && stock < item.qty && (
                          <span className="text-xs text-destructive">Stok tersisa {stock}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.product_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-primary font-semibold text-sm mb-2">
                      Rp {item.price.toLocaleString('id-ID')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => updateQty(item.product_id, item.qty - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.qty}</span>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={handleIncrement}
                        disabled={isMaxQty}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Input
                    placeholder="Catatan (opsional)"
                    value={item.notes || ''}
                    onChange={(e) => updateNotes(item.product_id, e.target.value)}
                    className="text-sm h-10 rounded-xl bg-muted border-0"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t border-border p-4 safe-bottom z-40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-lg font-bold">
            Rp {subtotal.toLocaleString('id-ID')}
          </span>
        </div>
        <Button
          className="w-full h-12 rounded-full text-base font-semibold"
          onClick={() => navigate('/checkout')}
        >
          Checkout
        </Button>
      </div>
    </CustomerLayout>
  );
}
