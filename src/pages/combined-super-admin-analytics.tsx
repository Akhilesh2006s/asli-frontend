import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SuperAdminAnalyticsDashboard from './super-admin-analytics';
import DetailedAIAnalyticsDashboard from './detailed-ai-analytics';
import { BarChart3, BrainCircuit } from 'lucide-react';

/**
 * Single Analytics area: platform overview (schools) + exam / AI insights.
 * Choosing a school on the overview opens the AI tab scoped to that school.
 */
export default function CombinedSuperAdminAnalytics() {
  const [mainTab, setMainTab] = useState<'overview' | 'ai'>('overview');
  const [focusAdminId, setFocusAdminId] = useState<string | null>(null);

  const handleSelectSchool = (admin: { id: string; name: string; email: string }) => {
    setFocusAdminId(admin.id);
    setMainTab('ai');
  };

  const handleClearSchoolFocus = () => {
    setFocusAdminId(null);
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={mainTab}
        onValueChange={(v) => setMainTab(v as 'overview' | 'ai')}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-1 sm:grid-cols-2 h-auto gap-1">
          <TabsTrigger value="overview" className="gap-2 py-2.5">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            Platform &amp; B2C overview
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 py-2.5">
            <BrainCircuit className="h-3 w-3 sm:h-4 sm:w-4" />
            Exam &amp; AI insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 focus-visible:outline-none">
          <SuperAdminAnalyticsDashboard onSelectSchool={handleSelectSchool} />
        </TabsContent>

        <TabsContent value="ai" className="mt-6 focus-visible:outline-none">
          <DetailedAIAnalyticsDashboard
            singleAdminId={focusAdminId}
            onClearSchoolFocus={handleClearSchoolFocus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
