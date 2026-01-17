import { ShoppingBag, Plus, Minus, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/lib/cart';
import { cn } from '@/lib/utils';
import { formatSoldCount, formatRatingCount } from '@/lib/format-number';

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image?: string;
  rating_avg?: number;
  rating_count?: number;
  sold_count?: number;
  onClick?: () => void;
}

export function ProductCard({ 
  id, 
  name, 
  price, 
  image, 
  rating_avg = 4.7, 
  rating_count = 0, 
  sold_count = 0,
  onClick 
}: ProductCardProps) {
  const { addItem, updateQty, getItemQty } = useCart();
  const qty = getItemQty(id);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addItem({ product_id: id, name, price, image });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQty(id, qty + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateQty(id, qty - 1);
  };

  return (
    <div 
      className="bg-card rounded-2xl p-3 shadow-card cursor-pointer transition-transform active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="aspect-square bg-muted rounded-xl mb-2 flex items-center justify-center overflow-hidden">
        {image ? (
          <img src={image} alt={name} className="w-full h-full object-cover" />
        ) : (
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <h3 className="font-medium text-sm truncate mb-1">{name}</h3>
      
      {/* Rating & Sold */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span>{rating_avg.toFixed(1)}</span>
        <span>({formatRatingCount(rating_count)})</span>
        <span className="mx-0.5">•</span>
        <span>Terjual {formatSoldCount(sold_count)}</span>
      </div>
      
      <div className="flex items-center justify-between">
        <p className="text-primary font-semibold text-sm">
          Rp {price.toLocaleString('id-ID')}
        </p>
        {qty === 0 ? (
          <Button
            size="icon"
            variant="default"
            className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              className="h-7 w-7 rounded-full"
              onClick={handleDecrement}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <span className="w-6 text-center text-sm font-medium">{qty}</span>
            <Button
              size="icon"
              variant="default"
              className="h-7 w-7 rounded-full bg-primary hover:bg-primary/90"
              onClick={handleIncrement}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
