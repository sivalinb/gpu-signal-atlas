# Week 2 Submission Checklist

## Public assets

- Website: https://gpu-signal-atlas.siva-babu.chatgpt.site
- GitHub: https://github.com/sivalinb/gpu-signal-atlas
- Google Doc: https://docs.google.com/document/d/1bksyAMQVZFTTbXAq5TY1KnvXqq1rBO-trVjV1gjTezI/edit

Verify every link in a private/incognito window before submitting.

## Video recording

- Target duration: 4:55; hard limit: 5:00.
- Demonstrate Xid 79, the ten-component telemetry flow, the nine-stage RAG lifecycle, and Xid 999 refusal.
- Show the evaluation and ablation results.
- State that Pinecone stores reviewed documentation vectors and that the API key is server-side.
- Explain that Fluent Bit collects/enriches, the OpenTelemetry Collector normalizes/fans out, the token-gated gateway sanitizes, SSE delivers the short-lived inbox, and Pinecone stores reviewed documentation vectors rather than logs.
- Show **Telemetry → Live telemetry**, the SSE connection badge, a safe synthetic replay, its redaction count, and the explicit **Analyze selected** boundary.
- Show the AI-observability map: You.com discovers review candidates, Pinecone serves approved vectors, and LangSmith receives redacted RAG traces.
- Show **Graph & voice**: Mistral provides bounded optional generation, Neo4j returns relationship evidence, and Deepgram provides opt-in voice input/output.
- Show `/api/integrations` or the website status badges and state that Pinecone, You.com, LangSmith, Mistral, Neo4j, and Deepgram are configured. Clarify that permanent credentials remain server-only.
- Explain how OpenAI Codex was used and how tests/evaluation controlled acceptance.
- Finish on the submission section with the GitHub and Google Doc links.

## Before submitting

- Run `npm test`, `npm run evaluate`, `npm run ablate`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Confirm the live `/api/analyze` response reports `retrievalBackend: pinecone` without a browser challenge.
- Confirm the live `/api/integrations` response reports every intended provider configured and `secretsExposedToBrowser: false`.
- Confirm `/api/graph/paths` returns bounded Neo4j relationships and the analysis/voice controls do not render a challenge widget.
- Confirm `/api/telemetry/replay` returns HTTP 202 with `sanitized: true`, `/api/telemetry/recent` returns no unapproved attributes, and the SSE stream emits a `ready` event.
- Confirm the video link is viewable without requesting access.
- Keep the video at five minutes or less; the video is the only remaining Week 2 deliverable.
- Submit the Google Doc, video, and GitHub links through the Week 2 form.
