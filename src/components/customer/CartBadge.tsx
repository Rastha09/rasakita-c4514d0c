import { useCart } from '@/lib/cart';

export function CartBadge() {
  const { totalItems } = useCart();

  if (totalItems === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
      {totalItems > 99 ? '99+' : totalItems}
    </span>
  );
}
