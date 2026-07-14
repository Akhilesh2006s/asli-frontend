import * as React from 'react';
import { TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function EduOTTTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        'grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl border border-ink/10 bg-mist p-1.5',
        className
      )}
      {...props}
    />
  );
}

export const eduOttTabTriggerClass =
  'w-full rounded-xl py-3.5 text-base font-semibold text-ink/55 data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-green-500 data-[state=active]:to-indigo-blue-600 data-[state=active]:text-white data-[state=active]:shadow-glow';
