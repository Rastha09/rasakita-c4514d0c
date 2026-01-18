import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatRatingCount } from '@/lib/format-number';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface ProductReviewSectionProps {
  productId: string;
  ratingAvg: number;
  ratingCount: number;
}

type SortFilter = 'terbaru' | 'tertinggi';

const REVIEWS_PER_PAGE = 5;

export function ProductReviewSection({
  productId,
  ratingAvg,
  ratingCount,
}: ProductReviewSectionProps) {
  const [sortFilter, setSortFilter] = useState<SortFilter>('terbaru');
  const [visibleCount, setVisibleCount] = useState(REVIEWS_PER_PAGE);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['product-reviews', productId, sortFilter],
    queryFn: async () => {
      // First fetch reviews
      let query = supabase
        .from('product_reviews')
        .select('id, rating, comment, created_at, user_id')
        .eq('product_id', productId);

      if (sortFilter === 'terbaru') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query
          .order('rating', { ascending: false })
          .order('created_at', { ascending: false });
      }

      const { data: reviewsData, error: reviewsError } = await query;
      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set(reviewsData.map((r) => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      // Create a map of user_id to full_name
      const profileMap = new Map<string, string | null>();
      profilesData?.forEach((p) => {
        profileMap.set(p.id, p.full_name);
      });

      // Merge reviews with profile names
      return reviewsData.map((review) => ({
        ...review,
        userName: profileMap.get(review.user_id) || null,
      }));
    },
    enabled: !!productId,
    staleTime: 0, // Always refetch for fresh data
  });

  // Reset visible count when filter changes
  const handleFilterChange = (filter: SortFilter) => {
    setSortFilter(filter);
    setVisibleCount(REVIEWS_PER_PAGE);
  };

  const visibleReviews = reviews.slice(0, visibleCount);
  const hasMore = reviews.length > visibleCount;

  const loadMore = () => {
    setVisibleCount((prev) => prev + REVIEWS_PER_PAGE);
  };

  // Get user initial from name
  const getInitial = (name: string | null) => {
    if (!name) return 'P';
    return name.charAt(0).toUpperCase();
  };

  // Render stars
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-muted text-muted'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="px-4 py-6 border-t">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Ulasan</h3>
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{ratingAvg.toFixed(1)}</span>
            <span>({formatRatingCount(ratingCount)} ulasan)</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      {ratingCount > 0 && (
        <div className="flex gap-2 mb-4">
          <Button
            variant={sortFilter === 'terbaru' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full text-xs h-8"
            onClick={() => handleFilterChange('terbaru')}
          >
            Terbaru
          </Button>
          <Button
            variant={sortFilter === 'tertinggi' ? 'default' : 'outline'}
            size="sm"
            className="rounded-full text-xs h-8"
            onClick={() => handleFilterChange('tertinggi')}
          >
            Rating Tertinggi
          </Button>
        </div>
      )}

      {/* Empty State */}
      {ratingCount === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Belum ada ulasan.</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && ratingCount > 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded" />
                  <div className="h-3 w-16 bg-muted rounded" />
                  <div className="h-4 w-full bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews List */}
      {!isLoading && visibleReviews.length > 0 && (
        <div className="space-y-4">
          {visibleReviews.map((review) => {
            const userName = review.userName || 'Pembeli';
            
            return (
              <div key={review.id} className="border-b pb-4 last:border-b-0">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                    {getInitial(userName)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{userName}</span>
                      {renderStars(review.rating)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(review.created_at), 'd MMM yyyy', { locale: id })}
                    </p>
                    <p className="text-sm mt-2 text-foreground">
                      {review.comment || (
                        <span className="text-muted-foreground italic">Tanpa komentar</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && !isLoading && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={loadMore}
          >
            Lihat lainnya ({reviews.length - visibleCount} ulasan lagi)
          </Button>
        </div>
      )}
    </div>
  );
}
