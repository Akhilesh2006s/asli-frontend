import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  IIT_CATEGORIES,
  IIT_FUTURE_CATEGORY_SLOT,
  PRODUCT_IIT,
  formatIitCategoryLabel,
} from '@/lib/products';
import { BookOpen, Layers } from 'lucide-react';

/**
 * Super Admin Products overview — IIT tracks Alpha / Beta / Gamma + reserved future slot.
 * School assignment of categories is done in School Management (Asli Prep schools).
 */
export default function ProductsManagement() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">Products</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Product lines control which books, digital content, and AI catalogs a school can access.
          Assign Alpha, Beta, and/or Gamma to each Asli Prep school under School Management.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-orange-50 p-2 text-orange-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{PRODUCT_IIT}</CardTitle>
              <CardDescription className="mt-1">
                Separate curriculum tracks under IIT. Subject names (e.g. Maths) can exist once per
                category without colliding.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {IIT_CATEGORIES.map((cat) => (
              <div
                key={cat}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{formatIitCategoryLabel(cat)}</p>
                  <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                    Active
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Tag subjects, content, and books with this category so only schools assigned{' '}
                  {formatIitCategoryLabel(cat)} can see them.
                </p>
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 opacity-70">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-700">{IIT_FUTURE_CATEGORY_SLOT.label}</p>
                <Badge variant="outline" className="text-[10px]">
                  Reserved
                </Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Empty slot for a future IIT curriculum track. Not assignable yet.
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-3 rounded-lg border border-orange-100 bg-orange-50/60 p-4 text-sm text-slate-700">
            <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <div>
              <p className="font-medium text-slate-900">How to use</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs sm:text-sm text-slate-600">
                <li>Create subjects/content/books with an IIT category (or leave General).</li>
                <li>Open School Management → enable Asli Prep → select Alpha / Beta / Gamma.</li>
                <li>That school only sees matching category content plus general curriculum rows.</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
