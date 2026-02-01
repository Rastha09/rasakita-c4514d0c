import { supabase } from '@/integrations/supabase/client';

/**
 * Get thumbnail URL from product images array
 * Returns first image URL or placeholder if empty
 */
export function getProductThumb(images: unknown): string {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return '/placeholder.svg';
  }
  
  const firstImage = images[0];
  if (typeof firstImage !== 'string' || !firstImage) {
    return '/placeholder.svg';
  }
  
  // If it's already a full URL, return as-is
  if (firstImage.startsWith('http://') || firstImage.startsWith('https://')) {
    return firstImage;
  }
  
  // If it's a storage path, construct the public URL
  const { data } = supabase.storage.from('product-images').getPublicUrl(firstImage);
  return data?.publicUrl || '/placeholder.svg';
}

/**
 * Get full image URL from storage path
 */
export function getProductImageUrl(imagePath?: string): string {
  if (!imagePath) {
    return '/placeholder.svg';
  }
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a storage path, construct the public URL
  const { data } = supabase.storage.from('product-images').getPublicUrl(imagePath);
  return data?.publicUrl || '/placeholder.svg';
}

/**
 * Product thumbnail component props
 */
export interface ProductWithImages {
  id: string;
  images?: unknown;
}

/**
 * Batch fetch products by IDs for thumbnail display
 */
export async function fetchProductsByIds(productIds: string[]): Promise<Map<string, ProductWithImages>> {
  if (!productIds.length) return new Map();
  
  const { data, error } = await supabase
    .from('products')
    .select('id, images')
    .in('id', productIds);
  
  if (error || !data) return new Map();
  
  const map = new Map<string, ProductWithImages>();
  data.forEach((product) => {
    map.set(product.id, product);
  });
  
  return map;
}
