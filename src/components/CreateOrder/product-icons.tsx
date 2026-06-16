import { BookMarked, BookOpen, Layers, Package, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { orderIconBox } from './create-order-theme';

type ProductIconSource = {
  id: string;
  name: string;
  isCustom?: boolean;
};

export function getProductIcon(source: ProductIconSource): LucideIcon {
  if (source.isCustom) return Sparkles;
  const lower = source.name.toLowerCase();
  if (lower.startsWith('beta')) return Layers;
  if (lower.startsWith('alpha')) return BookOpen;
  return BookMarked;
}

export function ProductIcon({
  product,
  className,
  iconClassName,
}: {
  product: ProductIconSource;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = getProductIcon(product);
  return (
    <div
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
        orderIconBox,
        className,
      )}
    >
      <Icon className={cn('h-5 w-5', iconClassName)} />
    </div>
  );
}
