import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  orderId: string;
  userId: string;
  onSuccess?: () => void;
}

export function ReviewModal({
  open,
  onOpenChange,
  productId,
  productName,
  orderId,
  userId,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const queryClient = useQueryClient();

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      // Insert the review
      const { error: insertError } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          user_id: userId,
          order_id: orderId,
          rating,
          comment: comment.trim() || null,
        });

      if (insertError) throw insertError;

      // Recalculate product rating
      const { error: rpcError } = await supabase.rpc('recalculate_product_rating', {
        p_product_id: productId,
      });

      if (rpcError) {
        console.error('Failed to recalculate rating:', rpcError);
        // Non-blocking - review was still saved
      }
    },
    onSuccess: () => {
      toast.success('Ulasan berhasil dikirim!');
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setRating(5);
      setComment('');
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('Submit review error:', error);
      if (error.message.includes('duplicate key')) {
        toast.error('Anda sudah memberikan ulasan untuk produk ini');
      } else {
        toast.error('Gagal mengirim ulasan');
      }
    },
  });

  const handleSubmit = () => {
    if (rating < 1 || rating > 5) {
      toast.error('Pilih rating 1-5 bintang');
      return;
    }
    submitReviewMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Beri Ulasan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Produk</p>
            <p className="font-medium">{productName}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= (hoveredRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        'h-8 w-8 transition-colors',
                        isActive
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'fill-muted text-muted-foreground'
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Komentar (opsional)</p>
            <Textarea
              placeholder="Bagikan pengalamanmu dengan produk ini..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {comment.length}/500
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitReviewMutation.isPending}
            className="w-full"
          >
            {submitReviewMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Mengirim...
              </>
            ) : (
              'Kirim Ulasan'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
