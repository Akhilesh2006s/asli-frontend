import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  type AccessMode,
  type SchoolRoleAccessState,
  type RoleVidyaState,
  SCHOOL_PORTAL_MODULE_GROUPS,
  TEACHER_PORTAL_MODULE_GROUPS,
  STUDENT_PORTAL_MODULE_GROUPS,
  SCHOOL_PORTAL_FEATURE_IDS,
  TEACHER_PORTAL_FEATURE_IDS,
  STUDENT_PORTAL_FEATURE_IDS,
} from '@/lib/school-role-access';

const FIELD_CLASS =
  'border border-slate-300 bg-slate-100 text-slate-900 shadow-sm placeholder:text-slate-500 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400/30';

type RoleKey = keyof SchoolRoleAccessState;

const ROLE_TABS: { key: RoleKey; label: string; hint: string }[] = [
  { key: 'admin', label: 'Admin', hint: 'School admin portal modules and Vidya caps' },
  { key: 'teacher', label: 'Teacher', hint: 'Teacher dashboard modules and Vidya caps' },
  { key: 'student', label: 'Student', hint: 'Student dashboard modules and Vidya caps' },
];

const GROUPS: Record<
  RoleKey,
  { category: string; modules: { id: string; title: string; description: string }[] }[]
> = {
  admin: SCHOOL_PORTAL_MODULE_GROUPS,
  teacher: TEACHER_PORTAL_MODULE_GROUPS,
  student: STUDENT_PORTAL_MODULE_GROUPS,
};

const FEATURE_IDS: Record<RoleKey, string[]> = {
  admin: SCHOOL_PORTAL_FEATURE_IDS,
  teacher: TEACHER_PORTAL_FEATURE_IDS,
  student: STUDENT_PORTAL_FEATURE_IDS,
};

function portalCheckboxId(prefix: string, moduleId: string) {
  return `${prefix}-${moduleId.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function RoleVidyaBlock({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string;
  value: RoleVidyaState;
  onChange: (next: RoleVidyaState) => void;
}) {
  const limited = value.vidyaUsageMode === 'limited';
  return (
    <div className="space-y-3 rounded-lg border border-sky-100 bg-sky-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Vidya AI chatbot</h4>
          <p className="mt-0.5 text-xs text-slate-600">
            Turn chat on or off. AI tools stay available when chat is off unless limited below.
          </p>
        </div>
        <Switch
          id={`${idPrefix}-vidya-enabled`}
          checked={value.enabled}
          onCheckedChange={(checked) => onChange({ ...value, enabled: checked === true })}
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900">Vidya usage limits</h4>
        <p className="mt-1 text-xs text-slate-600">
          Unlimited = no daily caps. Limited = choose chatbot, AI tools, or both, and set how many
          this role may use per 24 hours.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={value.vidyaUsageMode === 'unlimited' ? 'default' : 'outline'}
          className={cn(
            value.vidyaUsageMode === 'unlimited' && 'bg-emerald-600 hover:bg-emerald-700'
          )}
          onClick={() =>
            onChange({
              ...value,
              vidyaUsageMode: 'unlimited',
              vidyaLimitChatbot: false,
              vidyaLimitTools: false,
            })
          }
        >
          Vidya unlimited
        </Button>
        <Button
          type="button"
          size="sm"
          variant={limited ? 'default' : 'outline'}
          className={cn(limited && 'bg-amber-600 hover:bg-amber-700')}
          onClick={() =>
            onChange({
              ...value,
              vidyaUsageMode: 'limited',
              vidyaLimitChatbot: value.vidyaLimitChatbot || !value.vidyaLimitTools,
              vidyaLimitTools: value.vidyaLimitTools,
            })
          }
        >
          Vidya limited
        </Button>
      </div>

      {limited ? (
        <div className="space-y-3 rounded-md border border-amber-200/80 bg-white/80 p-3">
          <p className="text-xs font-medium text-slate-700">Apply limits to</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <Checkbox
                id={`${idPrefix}-limit-chat`}
                checked={value.vidyaLimitChatbot}
                onCheckedChange={(c) =>
                  onChange({ ...value, vidyaLimitChatbot: c === true })
                }
              />
              Vidya AI chatbot
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <Checkbox
                id={`${idPrefix}-limit-tools`}
                checked={value.vidyaLimitTools}
                onCheckedChange={(c) => onChange({ ...value, vidyaLimitTools: c === true })}
              />
              AI tools (generations)
            </label>
          </div>
          {!value.vidyaLimitChatbot && !value.vidyaLimitTools ? (
            <p className="text-xs text-amber-700">
              Select at least one: chatbot and/or AI tools.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {value.vidyaLimitChatbot ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-chat-per-day`}>Chats per day (24h)</Label>
                <Input
                  id={`${idPrefix}-chat-per-day`}
                  type="number"
                  min={1}
                  max={10000}
                  className={FIELD_CLASS}
                  value={value.vidyaChatPerDay}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      vidyaChatPerDay: Math.max(1, Math.floor(Number(e.target.value) || 1)),
                    })
                  }
                />
              </div>
            ) : null}
            {value.vidyaLimitTools ? (
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-gen-per-day`}>Generations per day (24h)</Label>
                <Input
                  id={`${idPrefix}-gen-per-day`}
                  type="number"
                  min={1}
                  max={10000}
                  className={FIELD_CLASS}
                  value={value.vidyaGenerationsPerDay}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      vidyaGenerationsPerDay: Math.max(
                        1,
                        Math.floor(Number(e.target.value) || 1)
                      ),
                    })
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-xs text-emerald-800">No daily Vidya chat or generation caps for this role.</p>
      )}
    </div>
  );
}

export function SchoolRoleAccessPanel({
  idPrefix,
  value,
  onChange,
  activeRole,
  onActiveRoleChange,
}: {
  idPrefix: string;
  value: SchoolRoleAccessState;
  onChange: (next: SchoolRoleAccessState) => void;
  activeRole: RoleKey;
  onActiveRoleChange: (role: RoleKey) => void;
}) {
  const role = activeRole;
  const block = value[role];
  const groups = GROUPS[role];
  const allIds = FEATURE_IDS[role];
  const tab = ROLE_TABS.find((t) => t.key === role)!;

  const setAccessMode = (mode: AccessMode) => {
    onChange({
      ...value,
      [role]: {
        ...block,
        accessMode: mode,
        features:
          mode === 'unlimited'
            ? [...allIds]
            : block.features.length > 0
              ? block.features
              : [...allIds],
      },
    });
  };

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/90 p-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Role access &amp; Vidya limits</h3>
        <p className="mt-1 text-xs text-slate-600">
          Configure Admin, Teacher, and Student separately. Each role has dashboard features
          (Limited / Unlimited) and its own Vidya chat/tools caps.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((t) => (
          <Button
            key={t.key}
            type="button"
            size="sm"
            variant={activeRole === t.key ? 'default' : 'outline'}
            className={cn(activeRole === t.key && 'bg-slate-800 hover:bg-slate-900')}
            onClick={() => onActiveRoleChange(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <p className="text-xs text-slate-600">{tab.hint}</p>

      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm font-medium text-gray-800">Dashboard features</p>
            <p className="text-xs text-gray-600">
              Unlimited turns on every module for this role. Limited lets you choose which modules
              they can use.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={cn(
                'text-xs sm:text-sm',
                block.accessMode === 'limited' ? 'font-semibold text-gray-900' : 'text-gray-500'
              )}
            >
              Limited
            </span>
            <Switch
              checked={block.accessMode === 'unlimited'}
              onCheckedChange={(checked) => setAccessMode(checked ? 'unlimited' : 'limited')}
              aria-label={`Toggle unlimited ${role} portal access`}
            />
            <span
              className={cn(
                'text-xs sm:text-sm',
                block.accessMode === 'unlimited'
                  ? 'font-semibold text-orange-800'
                  : 'text-gray-500'
              )}
            >
              Unlimited
            </span>
          </div>
        </div>

        {block.accessMode === 'limited' && (
          <div className="border-t border-slate-200/80 pt-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-medium text-gray-700">Modules for {tab.label.toLowerCase()}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    onChange({
                      ...value,
                      [role]: { ...block, features: [...allIds] },
                    })
                  }
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() =>
                    onChange({
                      ...value,
                      [role]: { ...block, features: [] },
                    })
                  }
                >
                  Clear all
                </Button>
              </div>
            </div>
            <div className="space-y-5">
              {groups.map((group) => (
                <div key={group.category}>
                  <p className="mb-2 text-mini font-semibold uppercase tracking-wide text-slate-500">
                    {group.category}
                  </p>
                  <div className="grid gap-2 grid-cols-1 lg:grid-cols-2">
                    {group.modules.map((mod) => {
                      const cid = portalCheckboxId(`${idPrefix}-${role}`, mod.id);
                      return (
                        <div
                          key={mod.id}
                          className="flex gap-3 rounded-lg border border-slate-200/90 bg-slate-50/80 p-3 shadow-sm"
                        >
                          <Checkbox
                            id={cid}
                            className="mt-0.5 shrink-0"
                            checked={block.features.includes(mod.id)}
                            onCheckedChange={(c) => {
                              const on = c === true;
                              const next = new Set(block.features);
                              if (on) next.add(mod.id);
                              else next.delete(mod.id);
                              onChange({
                                ...value,
                                [role]: { ...block, features: Array.from(next) },
                              });
                            }}
                          />
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <Label
                              htmlFor={cid}
                              className="cursor-pointer text-xs sm:text-sm font-medium text-slate-900"
                            >
                              {mod.title}
                            </Label>
                            <p className="text-xs leading-snug text-slate-600">{mod.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RoleVidyaBlock
        idPrefix={`${idPrefix}-${role}`}
        value={block.vidya}
        onChange={(vidya) => onChange({ ...value, [role]: { ...block, vidya } })}
      />
    </div>
  );
}

export type { RoleKey };
