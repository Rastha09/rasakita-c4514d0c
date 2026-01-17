import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { ProductCard } from '@/components/customer/ProductCard';
import { EmptyState } from '@/components/customer/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { getProductThumb } from '@/lib/product-image';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'search', query],
    queryFn: async () => {
      let q = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (query.trim()) {
        q = q.ilike('name', `%${query}%`);
      }

      const { data, error } = await q.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleProductClick = (slug: string) => {
    navigate(`/product/${slug}`);
  };

  return (
    <CustomerLayout>
      <div className="px-4 py-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari produk..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 h-12 rounded-full bg-muted border-0 focus-visible:ring-primary"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-2xl p-3 animate-pulse">
                <div className="aspect-square bg-muted rounded-xl mb-2" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                price={product.price}
                image={getProductThumb(product)}
                rating_avg={product.rating_avg}
                rating_count={product.rating_count}
                sold_count={product.sold_count}
                onClick={() => handleProductClick(product.slug)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title={query ? 'Produk tidak ditemukan' : 'Cari Produk'}
            description={
              query
                ? `Tidak ada produk dengan kata kunci "${query}"`
                : 'Ketik kata kunci untuk mencari produk'
            }
          />
        )}
      </div>
    </CustomerLayout>
  );
}
