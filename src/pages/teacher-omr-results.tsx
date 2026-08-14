import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, Search } from 'lucide-react';
import TeacherShell from '@/components/layout/TeacherShell';
import { getAuthToken } from '@/lib/auth-utils';
import { API_BASE_URL } from '@/lib/api-config';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TeacherOmrRow = {
  _id: string;
  candidateId: string;
  percentage: number;
  totalMarks: number;
  finalRank?: number | null;
  testRank?: number | null;
  testTitle?: string;
  testNo?: string;
  maths?: { marks: number };
  physics?: { marks: number };
  chemistry?: { marks: number };
  biology?: { marks: number };
  student?: {
    _id: string;
    fullName: string;
    email: string;
    classNumber?: string;
    section?: string;
  } | null;
};

export default function TeacherOmrResultsPage() {
  const [rows, setRows] = useState<TeacherOmrRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const token = getAuthToken();
    setLoading(true);
    fetch(`${API_BASE_URL}/api/teacher/omr-results`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to load');
        setRows(Array.isArray(data.data) ? data.data : []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = r.student?.fullName || '';
      const email = r.student?.email || '';
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        r.candidateId.toLowerCase().includes(q) ||
        (r.testTitle || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <TeacherShell>
      <div className="w-full">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
            Offline Results
          </p>
          <h1 className="mt-1 flex items-center gap-2.5 font-display text-2xl font-bold text-slate-900 sm:text-3xl">
            <ScanLine className="h-7 w-7 shrink-0 text-orange-600" aria-hidden />
            Offline Results
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Offline scores for students in your classes (after school admin assigns Candidate IDs).
          </p>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="rounded-xl border-orange-200 pl-9"
            placeholder="Search student or test"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : error ? (
          <Card className="rounded-2xl border-red-100">
            <CardContent className="p-6 text-sm text-red-700">{error}</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-orange-100">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <ScanLine className="mb-3 h-12 w-12 text-orange-300" />
              <p className="font-semibold text-slate-800">No Offline Results Yet</p>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Ask your school admin to upload the offline score list and assign candidates to students.
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="rounded-2xl border-orange-100 overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Test</TableHead>
                        <TableHead>%</TableHead>
                        <TableHead>Rank</TableHead>
                        <TableHead>M/P/C/B</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((r) => (
                        <TableRow key={r._id}>
                          <TableCell>
                            <p className="font-medium text-slate-900">
                              {r.student?.fullName || 'Student'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {r.student?.classNumber
                                ? `${r.student.classNumber}${r.student.section || ''}`
                                : r.candidateId}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-[240px]">
                            <p className="truncate text-sm">{r.testTitle}</p>
                            <p className="text-xs text-slate-500">#{r.testNo || '—'}</p>
                          </TableCell>
                          <TableCell className="font-semibold">{r.percentage}</TableCell>
                          <TableCell>{r.finalRank ?? r.testRank ?? '—'}</TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {r.maths?.marks ?? 0}/{r.physics?.marks ?? 0}/
                            {r.chemistry?.marks ?? 0}/{r.biology?.marks ?? 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </TeacherShell>
  );
}
