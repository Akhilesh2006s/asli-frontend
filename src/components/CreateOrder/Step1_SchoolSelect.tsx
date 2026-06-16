import { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Building2, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchSchoolsForOrder } from '@/lib/schools-for-order';
import type { School } from './types';
import { useCreateOrder } from './CreateOrderContext';

function brandBadgeClass(brand: string) {
  if (brand.toLowerCase().includes('asli')) {
    return 'bg-orange-100 text-orange-600 hover:bg-orange-100 border-orange-200';
  }
  return 'bg-sky-100 text-sky-700 hover:bg-sky-100 border-sky-200';
}

function SchoolCard({
  school,
  selected,
  onSelect,
}: {
  school: School;
  selected: boolean;
  onSelect: () => void;
}) {
  const location = [school.city, school.state].filter(Boolean).join(', ') || '—';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border p-4 text-left transition-all duration-200',
        'hover:border-orange-600/40 hover:shadow-md',
        selected
          ? 'border-orange-600 bg-orange-50/60 shadow-md ring-2 ring-orange-600/20'
          : 'border-gray-200 bg-white shadow-sm',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            selected ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-500',
          )}
        >
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold leading-snug text-gray-900 break-words">{school.name}</p>
            {selected && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />}
          </div>
          <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{location}</span>
          </p>
          <Badge variant="outline" className={cn('mt-2 w-fit', brandBadgeClass(school.brand))}>
            {school.brand}
          </Badge>
        </div>
      </div>
    </button>
  );
}

export default function Step1_SchoolSelect() {
  const { state, selectSchool } = useCreateOrder();
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchools = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSchoolsForOrder();
      setSchools(data);
      if (data.length === 0) {
        setError('No schools found. Add schools in School Management first.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load schools';
      setError(msg);
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSchools();
  }, []);

  const filteredSchools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.state || '').toLowerCase().includes(q) ||
        s.brand.toLowerCase().includes(q),
    );
  }, [search, schools]);

  return (
    <div className="flex flex-col gap-4">
      <div className="pr-8">
        <h3 className="text-lg font-semibold text-gray-900">Select School</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Schools are loaded from your School Management database.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search schools by name or city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          disabled={loading}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600 mb-3" />
          <p className="text-sm">Loading schools…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50/50 py-10 px-4 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
          <p className="text-sm font-medium text-gray-800">{error}</p>
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => void loadSchools()}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="max-h-[min(420px,55vh)] overflow-y-auto pr-1">
          {filteredSchools.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-500">No schools match your search</p>
              <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {filteredSchools.map((school) => (
                <SchoolCard
                  key={school.id}
                  school={school}
                  selected={state.selectedSchool?.id === school.id}
                  onSelect={() => selectSchool(school)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
