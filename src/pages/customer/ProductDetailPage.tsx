import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Minus, Plus, ArrowLeft, Loader2, Star } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/lib/cart';
import { toast } from '@/hooks/use-toast';
import { formatSoldCount, formatRatingCount } from '@/lib/format-number';
import { getProductThumb } from '@/lib/product-image';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, updateQty, removeItem, getItemQty } = useCart();

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

  // Get product image
  const getProductImage = useCallback(() => {
    if (!product) return null;
    return getProductThumb(product);
  }, [product]);

  // Debounced toast
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showDebouncedToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      toast({
        description: 'Keranjang diperbarui',
        duration: 2000,
      });
    }, 700);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Realtime qty update functions
  const handleIncrement = () => {
    if (!product) return;
    const newQty = cartQty + 1;
    if (product.stock > 0 && newQty > product.stock) return;

    if (isInCart) {
      updateQty(product.id, newQty);
    } else {
      addItem({
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: getProductImage() || undefined,
        qty: 1,
      });
    }
    showDebouncedToast();
  };

  const handleDecrement = () => {
    if (!product || cartQty <= 0) return;
    const newQty = cartQty - 1;

    if (newQty <= 0) {
      removeItem(product.id);
    } else {
      updateQty(product.id, newQty);
    }
    showDebouncedToast();
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: getProductImage() || undefined,
      qty: 1,
    });
    showDebouncedToast();
  };

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
            
            {/* Rating & Sold */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium">{(product.rating_avg || 4.7).toFixed(1)}</span>
              <span>({formatRatingCount(product.rating_count || 0)} ulasan)</span>
              <span className="mx-1">•</span>
              <span>Terjual {formatSoldCount(product.sold_count || 0)}</span>
            </div>
            
            <p className="text-2xl font-bold text-primary mt-3">
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
          {/* Quantity Stepper - only show if in cart or product available */}
          {(isInCart || product.stock > 0) && (
            <div className="flex items-center gap-2 bg-muted rounded-full p-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full"
                onClick={handleDecrement}
                disabled={cartQty <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{cartQty}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-full"
                onClick={handleIncrement}
                disabled={product.stock > 0 && cartQty >= product.stock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Main Action Button */}
          {product.stock <= 0 ? (
            <Button
              className="flex-1 h-12 rounded-full text-base font-semibold"
              disabled
            >
              Stok Habis
            </Button>
          ) : isInCart ? (
            <Button
              className="flex-1 h-12 rounded-full text-base font-semibold"
              onClick={() => navigate('/cart')}
            >
              Lihat Keranjang
            </Button>
          ) : (
            <Button
              className="flex-1 h-12 rounded-full text-base font-semibold"
              onClick={handleAddToCart}
            >
              Tambah ke Keranjang
            </Button>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
