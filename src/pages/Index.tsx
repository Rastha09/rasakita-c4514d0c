import { useQuery } from '@tanstack/react-query';
import { CustomerLayout } from '@/components/layouts/CustomerLayout';
import { ProductCard } from '@/components/customer/ProductCard';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getProductThumb } from '@/lib/product-image';

const Index = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'home'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleProductClick = (slug: string) => {
    navigate(`/makka-bakerry/product/${slug}`);
  };

  return (
    <CustomerLayout>
      <div className="px-4 py-6">
        {/* Hero Section */}
        <div className="gradient-primary rounded-2xl p-6 text-primary-foreground mb-6">
          <h1 className="text-2xl font-bold mb-2">Selamat Datang! 👋</h1>
          <p className="text-primary-foreground/90 mb-4">
            {user ? `Halo, ${profile?.full_name || 'Customer'}!` : 'Temukan produk terbaik di sini'}
          </p>
          {!user && (
            <Button asChild variant="secondary" className="gap-2">
              <Link to="/login" state={{ from: '/makka-bakerry' }}>
                Masuk <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {/* Products */}
        <h2 className="text-lg font-semibold mb-4">Produk Populer</h2>
        
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
            <p>Belum ada produk tersedia</p>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

export default Index;
