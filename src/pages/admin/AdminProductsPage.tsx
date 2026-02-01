import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Loader2, Package, Star, ShoppingBag } from 'lucide-react';
import { useAdminProducts, useToggleProductActive } from '@/hooks/useAdminProducts';
import { formatCurrency } from '@/lib/format-currency';
import { formatSoldCount } from '@/lib/format-number';
import { getProductImageUrl } from '@/lib/product-image';
import { Link } from 'react-router-dom';

export default function AdminProductsPage() {
  const { data: products, isLoading } = useAdminProducts();
  const toggleActive = useToggleProductActive();

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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">Belum ada produk</p>
            <Button asChild>
              <Link to="/admin/products/new">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Produk Pertama
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {products?.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    {/* Product Image */}
                    <Link to={`/admin/products/${product.id}`} className="shrink-0">
                      <div className="w-24 h-24 bg-muted">
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
                        <p className="text-primary font-semibold">{formatCurrency(product.price)}</p>
                      </Link>
                      
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {product.rating_avg}
                        </span>
                        <span className="flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3" />
                          {formatSoldCount(product.sold_count)} terjual
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <Badge variant={product.stock > 0 ? 'secondary' : 'destructive'}>
                          Stok: {product.stock}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {product.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                          <Switch
                            checked={product.is_active}
                            onCheckedChange={(checked) => 
                              toggleActive.mutate({ productId: product.id, isActive: checked })
                            }
                            disabled={toggleActive.isPending}
                          />
                        </div>
                      </div>
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
