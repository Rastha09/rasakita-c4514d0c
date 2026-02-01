import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  stock: number;
  images: string[];
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  created_at: string;
}

export interface ProductFormData {
  name: string;
  price: number;
  stock: number;
  description?: string;
  category_id?: string;
  is_active: boolean;
  images: string[];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function useAdminProducts() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['admin-products', profile?.store_id],
    queryFn: async () => {
      if (!profile?.store_id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', profile.store_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(p => ({
        ...p,
        images: Array.isArray(p.images) ? p.images as string[] : [],
      })) as Product[];
    },
    enabled: !!profile?.store_id,
  });
}

export function useAdminProduct(productId: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['admin-product', productId],
    queryFn: async () => {
      if (!profile?.store_id || !productId) return null;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('store_id', profile.store_id)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        images: Array.isArray(data.images) ? data.images as string[] : [],
      } as Product;
    },
    enabled: !!profile?.store_id && !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: ProductFormData) => {
      if (!profile?.store_id) throw new Error('Store not found');

      const slug = generateSlug(formData.name) + '-' + Date.now();

      const { error } = await supabase
        .from('products')
        .insert({
          store_id: profile.store_id,
          name: formData.name,
          slug,
          price: formData.price,
          stock: Math.max(0, formData.stock),
          description: formData.description || null,
          category_id: formData.category_id || null,
          is_active: formData.is_active,
          images: formData.images as unknown as Json,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({
        title: 'Produk ditambahkan',
        description: 'Produk baru berhasil ditambahkan',
      });
    },
    onError: (error) => {
      toast({
        title: 'Gagal menambah produk',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, formData }: { productId: string; formData: ProductFormData }) => {
      const { error } = await supabase
        .from('products')
        .update({
          name: formData.name,
          price: formData.price,
          stock: Math.max(0, formData.stock),
          description: formData.description || null,
          category_id: formData.category_id || null,
          is_active: formData.is_active,
          images: formData.images as unknown as Json,
        })
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product'] });
      toast({
        title: 'Produk diperbarui',
        description: 'Perubahan produk berhasil disimpan',
      });
    },
    onError: (error) => {
      toast({
        title: 'Gagal memperbarui',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({
        title: 'Produk dihapus',
        description: 'Produk berhasil dihapus',
      });
    },
    onError: (error) => {
      toast({
        title: 'Gagal menghapus',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUploadProductImage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      return filePath;
    },
    onError: (error) => {
      toast({
        title: 'Gagal upload gambar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useToggleProductActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, isActive }: { productId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive })
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast({
        title: variables.isActive ? 'Produk diaktifkan' : 'Produk dinonaktifkan',
      });
    },
    onError: (error) => {
      toast({
        title: 'Gagal mengubah status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
