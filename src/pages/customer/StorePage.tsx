import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { ProductCard } from '@/components/customer/ProductCard';
import { CategoryFilter } from '@/components/customer/CategoryFilter';
import { Footer } from '@/components/customer/Footer';
import { useAuth } from '@/lib/auth';
import { useStoreContext } from '@/lib/store-context';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProductThumb, getProductImageUrl } from '@/lib/product-image';

const StorePage = () => {
  const { user, profile } = useAuth();
  const { store } = useStoreContext();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories = [] } = useCategories(store?.id);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'home', store?.id, selectedCategory],
    queryFn: async () => {
      if (!store?.id) return [];
      let query = supabase
        .from('products')
        .select('*')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!store?.id,
  });

  const handleProductClick = (slug: string) => {
    navigate(`/product/${slug}`);
  };

  return (
    <CustomerLayout>
      <div className="px-4 py-6">
        {/* Store Banner & Hero */}
        {store?.banner_path ? (
          <div className="relative rounded-2xl overflow-hidden mb-6">
            <img 
              src={getProductImageUrl(store.banner_path)} 
              alt={`${store.name} banner`}
              className="w-full h-40 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="flex items-center gap-3 mb-2">
                {store?.logo_path && (
                  <img 
                    src={getProductImageUrl(store.logo_path)} 
                    alt={`${store.name} logo`}
                    className="w-16 h-16 rounded-xl border-2 border-white object-cover shadow-lg"
                  />
                )}
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-white">{store?.name}</h1>
                  <p className="text-white/80 text-sm">
                    {user ? `Halo, ${profile?.full_name || 'Customer'}!` : 'Selamat datang!'}
                  </p>
                </div>
              </div>
              {!user && (
                <Button asChild variant="secondary" size="sm" className="gap-1">
                  <Link to="/login">
                    Masuk <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="gradient-primary rounded-2xl p-6 text-primary-foreground mb-6">
            {store?.logo_path && (
              <img 
                src={getProductImageUrl(store.logo_path)} 
                alt={`${store.name} logo`}
                className="w-16 h-16 rounded-xl mb-3 object-cover"
              />
            )}
            <h1 className="text-2xl font-bold mb-2">Selamat Datang! 👋</h1>
            <p className="text-primary-foreground/90 mb-4">
              {user ? `Halo, ${profile?.full_name || 'Customer'}!` : `Temukan produk terbaik di ${store?.name || 'sini'}`}
            </p>
            {!user && (
              <Button asChild variant="secondary" className="gap-2">
                <Link to="/login">
                  Masuk <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="mb-4">
            <CategoryFilter
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        )}

        {/* Products */}
        <h2 className="text-lg font-semibold mb-4">
          {selectedCategory 
            ? categories.find(c => c.id === selectedCategory)?.name || 'Produk'
            : 'Produk Populer'}
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
                stock={product.stock}
                onClick={() => handleProductClick(product.slug)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>
              {selectedCategory 
                ? 'Tidak ada produk di kategori ini' 
                : 'Belum ada produk tersedia'}
            </p>
          </div>
        )}
      </div>
      {!user && <Footer />}
    </CustomerLayout>
  );
};

export default StorePage;
