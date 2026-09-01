export interface TurnstileConfig {
  secretKey: string;
  siteKey: string;
  enforced: boolean;
  expectedHostname?: string;
}

interface TurnstileResponse {
  success?: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

export class TurnstileError extends Error {
  readonly code: string;

  constructor(message: string, code = 'turnstile_failed') {
    super(message);
    this.name = 'TurnstileError';
    this.code = code;
  }
}

export function getTurnstileConfig(
  environment: Record<string, string | undefined> = process.env,
): TurnstileConfig | undefined {
  const secretKey = environment.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const enforced = environment.TURNSTILE_ENFORCED?.trim().toLowerCase() === 'true';
  if (!secretKey || !siteKey) {
    if (enforced) throw new TurnstileError('Turnstile is enforced but its keys are incomplete.', 'turnstile_not_configured');
    return undefined;
  }
  return {
    secretKey,
    siteKey,
    enforced,
    expectedHostname: environment.TURNSTILE_EXPECTED_HOSTNAME?.trim() || undefined,
  };
}

export async function verifyTurnstile(
  token: string | undefined,
  action: string,
  request: Request,
  config = getTurnstileConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<'disabled' | 'verified'> {
  if (!config?.enforced) return 'disabled';
  if (!token?.trim()) throw new TurnstileError('Complete the security check before continuing.', 'turnstile_token_required');
  if (token.length > 2048) throw new TurnstileError('Security token is malformed.', 'turnstile_token_invalid');

  const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: config.secretKey,
      response: token,
      remoteip: request.headers.get('CF-Connecting-IP') ?? undefined,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new TurnstileError('Security verification is temporarily unavailable.', 'turnstile_unavailable');
  const result = (await response.json()) as TurnstileResponse;
  if (!result.success) {
    const duplicate = result['error-codes']?.includes('timeout-or-duplicate');
    throw new TurnstileError(
      duplicate ? 'The security check expired. Please try again.' : 'Security verification failed.',
      duplicate ? 'turnstile_expired' : 'turnstile_rejected',
    );
  }
  if (result.action && result.action !== action) {
    throw new TurnstileError('Security action did not match this request.', 'turnstile_action_mismatch');
  }
  const expectedHostname = config.expectedHostname ?? new URL(request.url).hostname;
  if (result.hostname && expectedHostname && !['localhost', '127.0.0.1'].includes(expectedHostname) && result.hostname !== expectedHostname) {
    throw new TurnstileError('Security hostname did not match this deployment.', 'turnstile_hostname_mismatch');
  }
  return 'verified';
}
