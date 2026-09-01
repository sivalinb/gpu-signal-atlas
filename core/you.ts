import { fnv1a } from './vector.ts';

export const YOU_ALLOWED_DOMAINS = [
  'docs.nvidia.com',
  'docs.fluentbit.io',
  'opentelemetry.io',
  'github.com',
] as const;

export interface YouConfig {
  apiKey: string;
  endpoint: string;
}

export interface YouSourceCandidate {
  title: string;
  url: string;
  description: string;
  content: string;
  provider: 'you-search';
  reviewStatus: 'pending-review';
  discoveredAt: string;
  contentHash: string;
}

interface YouSearchResult {
  title?: string;
  url?: string;
  description?: string;
  snippets?: string[];
  page_age?: string;
  contents?: {
    markdown?: string;
    html?: string;
    highlights?: string[];
  };
}

interface YouSearchResponse {
  results?: { web?: YouSearchResult[] };
}

export function getOptionalYouConfig(
  environment: Record<string, string | undefined> = process.env,
): YouConfig | undefined {
  const apiKey = environment.YOU_API_KEY?.trim();
  if (!apiKey) return undefined;
  return {
    apiKey,
    endpoint: (environment.YOU_SEARCH_ENDPOINT?.trim() || 'https://api.you.com/v1/search').replace(/\/+$/, ''),
  };
}

export function isAllowedDiscoveryUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (!YOU_ALLOWED_DOMAINS.includes(url.hostname as (typeof YOU_ALLOWED_DOMAINS)[number])) return false;
    if (url.hostname === 'github.com' && !url.pathname.startsWith('/sivalinb/gpu-signal-atlas/')) return false;
    return true;
  } catch {
    return false;
  }
}

export async function discoverYouSources(
  query: string,
  config: YouConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<YouSourceCandidate[]> {
  const response = await fetchImpl(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.apiKey,
    },
    body: JSON.stringify({
      query,
      count: 10,
      include_domains: [...YOU_ALLOWED_DOMAINS],
      extraction: {
        extraction_mode: 'full_page',
        full_page: { extraction_formats: ['markdown'] },
      },
      crawl_timeout: 10,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`You.com discovery failed with status ${response.status}`);

  const payload = (await response.json()) as YouSearchResponse;
  const discoveredAt = new Date().toISOString();
  return (payload.results?.web ?? [])
    .filter((item): item is YouSearchResult & { url: string } => Boolean(item.url && isAllowedDiscoveryUrl(item.url)))
    .map((item) => {
      const content =
        item.contents?.markdown ??
        item.contents?.highlights?.join('\n') ??
        item.snippets?.join('\n') ??
        item.description ??
        '';
      return {
        title: item.title?.trim() || new URL(item.url).hostname,
        url: new URL(item.url).toString(),
        description: item.description?.trim() || '',
        content,
        provider: 'you-search' as const,
        reviewStatus: 'pending-review' as const,
        discoveredAt,
        contentHash: fnv1a(content).toString(16).padStart(8, '0'),
      };
    });
}
