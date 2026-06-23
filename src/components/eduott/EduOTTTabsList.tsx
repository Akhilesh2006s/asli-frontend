import * as React from 'react';
import { TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/** Two-column tab bar that stays visible on mobile (default TabsList h-10 clips stacked tabs). */
export function EduOTTTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        'grid h-auto w-full grid-cols-2 gap-1 p-1 sm:gap-1.5',
        className
      )}
      {...props}
    />
  );
}
