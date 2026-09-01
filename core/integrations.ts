export interface IntegrationStatus {
  pineconeConfigured: boolean;
  youConfigured: boolean;
  langsmithConfigured: boolean;
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
    secretsExposedToBrowser: false,
  };
}
