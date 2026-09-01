'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  Braces,
  Check,
  ChevronRight,
  Database,
  LoaderCircle,
  Mic,
  Network,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { IntegrationStatus } from '@/core/integrations';
import type { GraphPathRecord } from '@/core/neo4j';

const providerLanes = [
  { key: 'turnstile', icon: ShieldCheck, name: 'Cloudflare Turnstile', role: 'Validates single-use visitor tokens before protected AI and voice requests.', artifact: 'Verified action + hostname' },
  { key: 'mistral', icon: Sparkles, name: 'Mistral', role: 'Generates the same strict signal-card schema and supplies a trained-embedding ablation.', artifact: 'Grounded JSON + embeddings' },
  { key: 'neo4j', icon: Network, name: 'Neo4j Aura', role: 'Connects signals, reviewed evidence, benchmark runs, models, backends, and technologies.', artifact: 'Inspectable Cypher paths' },
  { key: 'deepgram', icon: Mic, name: 'Deepgram', role: 'Transcribes opt-in microphone audio and synthesizes a cited executive briefing.', artifact: 'Transcript + MP3 briefing' },
] as const;

export function IntelligenceFabric({ status }: { status: IntegrationStatus | null }) {
  const [paths, setPaths] = useState<GraphPathRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Loading the server-side relationship graph.');

  async function loadGraph() {
    setLoading(true);
    try {
      const response = await fetch('/api/graph/paths', { cache: 'no-store' });
      const payload = (await response.json()) as { paths?: GraphPathRecord[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Evidence graph is unavailable.');
      setPaths(payload.paths ?? []);
      setMessage(`${payload.paths?.length ?? 0} bounded relationships returned from Neo4j.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Evidence graph is unavailable.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetch('/api/graph/paths', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as { paths?: GraphPathRecord[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? 'Evidence graph is unavailable.');
        setPaths(payload.paths ?? []);
        setMessage(`${payload.paths?.length ?? 0} bounded relationships returned from Neo4j.`);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Evidence graph is unavailable.'))
      .finally(() => setLoading(false));
  }, []);

  const configured = (key: typeof providerLanes[number]['key']) => {
    if (!status) return false;
    if (key === 'turnstile') return status.turnstileConfigured;
    if (key === 'mistral') return status.mistralConfigured;
    if (key === 'neo4j') return status.neo4jConfigured;
    return status.deepgramConfigured;
  };

  return (
    <section id="intelligence-fabric" className="relative z-10 border-b border-border/70 bg-[radial-gradient(circle_at_86%_8%,oklch(0.82_0.16_165/.08),transparent_30%),linear-gradient(180deg,oklch(0.14_0.014_250),oklch(0.17_0.018_245))] py-16">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-8 grid gap-5 lg:grid-cols-[1fr_.7fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Multimodal evidence fabric</p>
            <h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">Security, grounded generation, graph context, and voice—without collapsing their boundaries.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Each provider has one narrow responsibility. Permanent credentials remain on the server; the browser receives only a public Turnstile site key, sanitized data, graph results, and user-requested audio.</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[.18em] text-primary">Trust sequence</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300"><span>Verify</span><ChevronRight className="size-3 text-primary" /><span>Retrieve</span><ChevronRight className="size-3 text-primary" /><span>Traverse</span><ChevronRight className="size-3 text-primary" /><span>Generate</span><ChevronRight className="size-3 text-primary" /><span>Speak</span></div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {providerLanes.map((provider) => (
            <Card key={provider.key} className="border border-border/70 bg-card/80">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3"><span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><provider.icon className="size-4" /></span><Badge variant="outline" className={configured(provider.key) ? 'border-emerald-400/20 text-emerald-300' : 'border-amber-300/20 text-amber-200'}>{configured(provider.key) ? 'Configured' : 'Optional'}</Badge></div>
                <p className="mt-4 font-heading text-sm font-semibold">{provider.name}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{provider.role}</p>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[.14em] text-primary">{provider.artifact}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-5 overflow-hidden border border-primary/20 bg-card/80">
          <CardHeader className="border-b border-border/60">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><CardTitle className="flex items-center gap-2"><Network className="size-4 text-primary" /> Live Neo4j evidence paths</CardTitle><CardDescription className="mt-1">Read-only, bounded relationship records—not raw logs or high-frequency metrics.</CardDescription></div>
              <Button size="sm" variant="outline" disabled={loading} onClick={() => void loadGraph()}>{loading ? <LoaderCircle className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />} Refresh graph</Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-black/15 px-3 py-2 text-xs"><span className="text-muted-foreground">{message}</span><span className="flex items-center gap-1 text-emerald-300"><Check className="size-3" /> credentials server-only</span></div>
            {paths.length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {paths.slice(0, 12).map((path, index) => (
                  <div key={`${path.fromId}-${path.relationship}-${path.toId}-${index}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-border/65 bg-black/15 p-3">
                    <div className="min-w-0"><p className="truncate text-xs font-medium text-slate-200">{path.fromId}</p><p className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">{path.fromType}</p></div>
                    <div className="text-center"><ChevronRight className="mx-auto size-3 text-primary" /><p className="mt-1 max-w-24 truncate font-mono text-[7px] text-primary">{path.relationship}</p></div>
                    <div className="min-w-0 text-right"><p className="truncate text-xs font-medium text-slate-200">{path.toId}</p><p className="mt-1 font-mono text-[8px] uppercase text-muted-foreground">{path.toType}</p></div>
                  </div>
                ))}
              </div>
            ) : !loading && <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-border/70 text-center text-xs leading-5 text-muted-foreground">No graph paths returned.<br />Run the checked-in Neo4j synchronization workflow.</div>}
          </CardContent>
        </Card>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">{[
          [ShieldCheck, 'Public boundary', 'Turnstile + server validation'],
          [Database, 'Text evidence', 'Pinecone + BM25'],
          [Braces, 'Relationship evidence', 'Neo4j + bounded Cypher'],
          [Activity, 'AI observability', 'OTel + LangSmith'],
        ].map(([Icon, title, detail]) => <div key={title as string} className="flex items-center gap-3 rounded-xl border border-border/70 bg-black/15 p-3"><Icon className="size-4 shrink-0 text-primary" /><span><span className="block text-xs">{title as string}</span><span className="font-mono text-[8px] text-muted-foreground">{detail as string}</span></span></div>)}</div>
      </div>
    </section>
  );
}
