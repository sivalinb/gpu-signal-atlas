export interface IntegrationStatus {
  pineconeConfigured: boolean;
  youConfigured: boolean;
  langsmithConfigured: boolean;
  turnstileConfigured: boolean;
  turnstileEnforced: boolean;
  turnstileSiteKey?: string;
  mistralConfigured: boolean;
  neo4jConfigured: boolean;
  deepgramConfigured: boolean;
  secretsExposedToBrowser: false;
}

export function getIntegrationStatus(
  environment: Record<string, string | undefined> = process.env,
): IntegrationStatus {
  return {
    pineconeConfigured: Boolean(
      environment.PINECONE_API_KEY?.trim() &&
        environment.PINECONE_INDEX_HOST?.trim() &&
        environment.PINECONE_INDEX_NAME?.trim() &&
        environment.PINECONE_NAMESPACE?.trim(),
    ),
    youConfigured: Boolean(environment.YOU_API_KEY?.trim()),
    langsmithConfigured: Boolean(environment.LANGSMITH_API_KEY?.trim()),
    turnstileConfigured: Boolean(
      environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() && environment.TURNSTILE_SECRET_KEY?.trim(),
    ),
    turnstileEnforced: environment.TURNSTILE_ENFORCED?.trim().toLowerCase() === 'true',
    turnstileSiteKey: environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || undefined,
    mistralConfigured: Boolean(environment.MISTRAL_API_KEY?.trim()),
    neo4jConfigured: Boolean(
      environment.NEO4J_URI?.trim() &&
        environment.NEO4J_USERNAME?.trim() &&
        environment.NEO4J_PASSWORD?.trim() &&
        environment.NEO4J_DATABASE?.trim(),
    ),
    deepgramConfigured: Boolean(environment.DEEPGRAM_API_KEY?.trim()),
    secretsExposedToBrowser: false,
  };
}
