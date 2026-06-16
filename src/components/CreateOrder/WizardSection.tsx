import { cn } from '@/lib/utils';
import { orderCard, orderSectionDesc, orderSectionTitle } from './create-order-theme';

type WizardSectionProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
};

export default function WizardSection({
  title,
  description,
  children,
  className,
  noPadding,
}: WizardSectionProps) {
  return (
    <section className={cn(orderCard, !noPadding && 'p-4 sm:p-5', className)}>
      <div className="mb-4">
        <h3 className={orderSectionTitle}>{title}</h3>
        {description && <p className={orderSectionDesc}>{description}</p>}
      </div>
      {children}
    </section>
  );
}
