# Week 2 Submission Checklist

## Public assets

- Website: https://gpu-signal-atlas.siva-babu.chatgpt.site
- GitHub: https://github.com/sivalinb/gpu-signal-atlas
- Google Doc: https://docs.google.com/document/d/1bksyAMQVZFTTbXAq5TY1KnvXqq1rBO-trVjV1gjTezI/edit

Verify every link in a private/incognito window before submitting.

## Before submitting

- Run `npm test`, `npm run evaluate`, `npm run ablate`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Confirm the live `/api/analyze` response reports `retrievalBackend: pinecone` without a browser challenge.
- Confirm the live `/api/integrations` response reports every intended provider configured and `secretsExposedToBrowser: false`.
- Confirm `/api/graph/paths` returns bounded Neo4j relationships and the analysis/voice controls do not render a challenge widget.
- Confirm `/api/telemetry/replay` returns HTTP 202 with `sanitized: true`, `/api/telemetry/recent` returns no unapproved attributes, and the SSE stream emits a `ready` event.
- Confirm the video link is viewable without requesting access.
- Confirm the public homepage image returns successfully and remains legible.
- Keep the video at five minutes or less; the video is the only remaining Week 2 deliverable.
- Submit the Google Doc, video, and GitHub links through the Week 2 form.
