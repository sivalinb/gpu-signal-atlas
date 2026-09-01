import { getIntegrationStatus } from '@/core/integrations';

export async function GET(): Promise<Response> {
  return Response.json(getIntegrationStatus(), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
