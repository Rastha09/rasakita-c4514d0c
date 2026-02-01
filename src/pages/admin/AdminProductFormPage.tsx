import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Loader2, ImagePlus, X, Trash2 } from 'lucide-react';
import { 
  useAdminProduct, 
  useCreateProduct, 
  useUpdateProduct, 
  useDeleteProduct,
  useUploadProductImage,
  type ProductFormData 
} from '@/hooks/useAdminProducts';
import { getProductImageUrl } from '@/lib/product-image';
import { useToast } from '@/hooks/use-toast';

export default function AdminProductFormPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = productId === 'new';
  
  const { data: existingProduct, isLoading: isLoadingProduct } = useAdminProduct(isNew ? '' : productId || '');
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const uploadImage = useUploadProductImage();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    name: '',
    price: 0,
    stock: 0,
    description: '',
    is_active: true,
    images: [],
  });

  useEffect(() => {
    if (existingProduct) {
      setForm({
        name: existingProduct.name,
        price: existingProduct.price,
        stock: existingProduct.stock,
        description: existingProduct.description || '',
        category_id: existingProduct.category_id || undefined,
        is_active: existingProduct.is_active,
        images: existingProduct.images,
      });
    }
  }, [existingProduct]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Ukuran file terlalu besar',
        description: 'Maksimal 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast({
        title: 'Format tidak didukung',
        description: 'Gunakan format JPEG, PNG, WebP, atau GIF',
        variant: 'destructive',
      });
      return;
    }

    try {
      const imagePath = await uploadImage.mutateAsync(file);
      setForm(prev => ({ ...prev, images: [...prev.images, imagePath] }));
    } catch {
      // Error already handled by hook
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast({ title: 'Nama produk wajib diisi', variant: 'destructive' });
      return;
    }

    if (form.price <= 0) {
      toast({ title: 'Harga harus lebih dari 0', variant: 'destructive' });
      return;
    }

    if (form.stock < 0) {
      toast({ title: 'Stok tidak boleh negatif', variant: 'destructive' });
      return;
    }

    try {
      if (isNew) {
        await createProduct.mutateAsync(form);
      } else if (productId) {
        await updateProduct.mutateAsync({ productId, formData: form });
      }
      navigate('/admin/products');
    } catch {
      // Error already handled by hooks
    }
  };

  const handleDelete = async () => {
    if (!productId) return;
    
    try {
      await deleteProduct.mutateAsync(productId);
      navigate('/admin/products');
    } catch {
      // Error already handled by hook
    }
  };

  const isSubmitting = createProduct.isPending || updateProduct.isPending;

  if (!isNew && isLoadingProduct) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/admin/products')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold flex-1">
            {isNew ? 'Tambah Produk' : 'Edit Produk'}
          </h1>
          {!isNew && (
            <Button 
              type="button" 
              variant="destructive" 
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Images */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Foto Produk</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex gap-2 flex-wrap">
              {form.images.map((img, idx) => (
                <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={getProductImageUrl(img)} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadImage.isPending}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-primary transition-colors disabled:opacity-50"
              >
                {uploadImage.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Format: JPEG, PNG, WebP, GIF. Maks 5MB.
            </p>
          </CardContent>
        </Card>

        {/* Product Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informasi Produk</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Produk *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Ayam Geprek Original"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Harga (Rp) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  value={form.price || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                  placeholder="15000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stok *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stock || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi produk..."
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">Status Produk</Label>
                <p className="text-xs text-muted-foreground">
                  {form.is_active ? 'Produk tampil di toko' : 'Produk disembunyikan'}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Read-only stats for existing products */}
        {!isNew && existingProduct && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Statistik (Read-only)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Rating</span>
                  <p className="font-medium">{existingProduct.rating_avg} ({existingProduct.rating_count} ulasan)</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Terjual</span>
                  <p className="font-medium">{existingProduct.sold_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isNew ? 'Tambah Produk' : 'Simpan Perubahan'}
        </Button>
      </form>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk "{existingProduct?.name}" akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
