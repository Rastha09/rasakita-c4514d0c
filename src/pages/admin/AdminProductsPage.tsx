import { useState } from 'react';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Plus, Loader2, Package, Star, ShoppingBag, Search } from 'lucide-react';
import { useAdminProducts, useToggleProductActive } from '@/hooks/useAdminProducts';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/format-currency';
import { formatSoldCount } from '@/lib/format-number';
import { getProductImageUrl } from '@/lib/product-image';
import { Link } from 'react-router-dom';

export default function AdminProductsPage() {
  const { data: products, isLoading } = useAdminProducts();
  const toggleActive = useToggleProductActive();
  const { storeAdmin } = useAuth();
  const { data: categories } = useCategories(storeAdmin?.store_id);
  const [search, setSearch] = useState('');

  const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

  const filtered = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Produk</h1>
          <Button asChild>
            <Link to="/admin/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Tambah
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <Card key={i}><CardContent className="p-4"><div className="flex gap-3"><div className="w-16 h-16 rounded-lg bg-muted animate-pulse" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded animate-pulse w-2/3" /><div className="h-3 bg-muted rounded animate-pulse w-1/3" /></div></div></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium">{search ? 'Produk tidak ditemukan' : 'Belum ada produk'}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'Coba kata kunci lain' : 'Tambah produk pertama Anda'}
            </p>
            {!search && (
              <Button asChild>
                <Link to="/admin/products/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Produk
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Product Image */}
                    <Link to={`/admin/products/${product.id}`} className="shrink-0">
                      <div className="w-[72px] h-[72px] bg-muted">
                        <img
                          src={getProductImageUrl(product.images[0])}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 p-3 min-w-0">
                      <Link to={`/admin/products/${product.id}`}>
                        <h3 className="font-medium truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-primary font-semibold">{formatCurrency(product.price)}</span>
                          <span className="text-xs text-muted-foreground">Stok: {product.stock}</span>
                        </div>
                      </Link>
                      
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {product.category_id && categoryMap.has(product.category_id) && (
                          <Badge variant="outline" className="text-xs">
                            {categoryMap.get(product.category_id)}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {product.rating_avg}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ShoppingBag className="h-3 w-3" />
                          {formatSoldCount(product.sold_count)}
                        </span>
                      </div>
                    </div>

                    {/* Toggle */}
                    <div className="flex flex-col items-center justify-center px-3 gap-1">
                      <Switch
                        checked={product.is_active}
                        onCheckedChange={(checked) => 
                          toggleActive.mutate({ productId: product.id, isActive: checked })
                        }
                        disabled={toggleActive.isPending}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {product.is_active ? 'Aktif' : 'Off'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}