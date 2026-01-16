import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Minus, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/lib/cart';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, updateQty, getItemQty } = useCart();
  const [localQty, setLocalQty] = useState(1);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const cartQty = product ? getItemQty(product.id) : 0;
  const isInCart = cartQty > 0;

  // Get first image from images array
  const getProductImage = () => {
    if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0] as string;
    }
    return null;
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: getProductImage() || undefined,
      qty: localQty,
    });
  };

  const handleUpdateCart = () => {
    if (!product) return;
    updateQty(product.id, localQty);
  };

  const incrementQty = () => setLocalQty((q) => q + 1);
  const decrementQty = () => setLocalQty((q) => Math.max(1, q - 1));

  // Sync localQty with cart when product loads
  useState(() => {
    if (isInCart) {
      setLocalQty(cartQty);
    }
  });

  if (isLoading) {
    return (
      <CustomerLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CustomerLayout>
    );
  }

  if (error || !product) {
    return (
      <CustomerLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold mb-2">Produk tidak ditemukan</h1>
          <p className="text-muted-foreground mb-6">
            Produk yang Anda cari tidak tersedia atau sudah dihapus.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
        </div>
      </CustomerLayout>
    );
  }

  const image = getProductImage();

  return (
    <CustomerLayout>
      <div className="pb-28">
        {/* Back Button */}
        <div className="px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Product Image */}
        <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
          {image ? (
            <img
              src={image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <ShoppingBag className="h-24 w-24 text-muted-foreground" />
          )}
        </div>

        {/* Product Info */}
        <div className="px-4 py-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="text-2xl font-bold text-primary mt-2">
              Rp {product.price.toLocaleString('id-ID')}
            </p>
          </div>

          {product.description && (
            <div>
              <h3 className="font-semibold mb-2">Deskripsi</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {product.description}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Stok:</span>
            <span className={product.stock > 0 ? 'text-green-600' : 'text-destructive'}>
              {product.stock > 0 ? `${product.stock} tersedia` : 'Habis'}
            </span>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-4 z-40">
        <div className="flex items-center gap-4 max-w-lg mx-auto">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-2 bg-muted rounded-full p-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full"
              onClick={decrementQty}
              disabled={localQty <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-semibold">{localQty}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 rounded-full"
              onClick={incrementQty}
              disabled={product.stock > 0 && localQty >= product.stock}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Add/Update Button */}
          <Button
            className="flex-1 h-12 rounded-full text-base font-semibold"
            onClick={isInCart ? handleUpdateCart : handleAddToCart}
            disabled={product.stock <= 0}
          >
            {product.stock <= 0
              ? 'Stok Habis'
              : isInCart
              ? 'Update Keranjang'
              : 'Tambah ke Keranjang'}
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
