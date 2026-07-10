import { useState } from 'react';
import { FileText, FlaskConical, GraduationCap, Loader2 } from 'lucide-react';
import { SixSectionViewer } from '@/components/ai-v2/six-section-viewer';
import { mapV2ToViewer } from '@/lib/six-section-map';

/** DEV-ONLY live V2 preview: calls the real /six-section endpoint (Pro model) and
 *  renders the minimized 6-section output in the new UI. Route: /six-preview */

const TOOLS = [
  { slug: 'worksheet-mcq-generator', name: 'Worksheet & MCQ Generator', icon: FileText, board: 'CBSE', classLabel: 'Class 10', subject: 'Mathematics', topic: 'Chapter 8: Introduction to Trigonometry', subTopic: '8.3 Trigonometric Ratios of Standard Angles' },
  { slug: 'concept-mastery-helper', name: 'Concept Mastery Helper', icon: GraduationCap, board: 'CBSE', classLabel: 'Class 10', subject: 'Science', topic: 'Chapter 5: Life Processes', subTopic: 'Photosynthesis' },
  { slug: 'activity-project-generator', name: 'Activity & Project Generator', icon: FlaskConical, board: 'CBSE', classLabel: 'Class 6', subject: 'Science', topic: 'Chapter 1: The Wonderful World of Science', subTopic: '1.1 Science Around Us' },
];

function token() {
  const k = Object.keys(localStorage).find((x) => /token|auth/i.test(x) && (localStorage.getItem(x) || '').length > 20);
  return k ? localStorage.getItem(k) || '' : '';
}

export default function SixPreview() {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const [result, setResult] = useState<{ tool: (typeof TOOLS)[number]; sc: Record<string, unknown> } | null>(null);

  async function run(tool: (typeof TOOLS)[number]) {
    setBusy(tool.slug); setErr(''); setResult(null);
    try {
      const res = await fetch('/api/ai-generator/six-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() },
        body: JSON.stringify({ toolSlug: tool.slug, board: tool.board, classLabel: tool.classLabel, subject: tool.subject, topic: tool.topic, subTopic: tool.subTopic }),
      });
      const json = await res.json();
      if (!res.ok || !json?.data?.structuredContent) throw new Error(json?.message || `HTTP ${res.status}`);
      setResult({ tool, sc: json.data.structuredContent });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy('');
    }
  }

  const props = result
    ? mapV2ToViewer(result.tool.slug, result.sc, {
        name: result.tool.name, icon: result.tool.icon,
        curriculum: { board: result.tool.board, class: result.tool.classLabel.replace(/\D/g, ''), subject: result.tool.subject, chapter: result.tool.topic.match(/\d+/)?.[0], subtopic: result.tool.subTopic },
        chapter: { title: result.tool.topic, subtopic: 'Subtopic: ' + result.tool.subTopic, icon: result.tool.icon },
      })
    : null;

  return (
    <div className="min-h-screen bg-white px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">V2 Six-Section — Live Preview</h1>
        <p className="mt-1 text-sm text-slate-500">Generates real content on the Pro model via the V2 endpoint, then renders the minimized 6 sections in the new UI.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TOOLS.map((t) => (
            <button
              key={t.slug}
              onClick={() => run(t)}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 dark:border-slate-700"
            >
              {busy === t.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <t.icon className="h-4 w-4" />}
              {busy === t.slug ? 'Generating (Pro)…' : `Generate: ${t.name.split(' ')[0]}`}
            </button>
          ))}
        </div>
        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">Error: {err}</p>}
        {busy && <p className="mt-3 text-sm text-slate-500">Calling Gemini Pro — this takes ~20–60s…</p>}
      </div>

      {props && <div className="mx-auto mt-8 max-w-4xl"><SixSectionViewer {...props} /></div>}
    </div>
  );
}
