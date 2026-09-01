# Week 2 Submission Checklist

## Public assets

- Website: https://gpu-signal-atlas.siva-babu.chatgpt.site
- GitHub: https://github.com/sivalinb/gpu-signal-atlas
- Google Doc: https://docs.google.com/document/d/1bksyAMQVZFTTbXAq5TY1KnvXqq1rBO-trVjV1gjTezI/edit

Verify every link in a private/incognito window before submitting.

## Video recording

- Target duration: 4:55; hard limit: 5:00.
- Demonstrate Xid 79, the nine-stage visual pipeline, and Xid 999 refusal.
- Show the evaluation and ablation results.
- State that Pinecone stores reviewed documentation vectors and that the API key is server-side.
- Explain that Fluent Bit and OpenTelemetry collect and normalize telemetry; they are not the vector database.
- Show the AI-observability map: You.com discovers review candidates, Pinecone serves approved vectors, and LangSmith receives redacted RAG traces.
- Show `/api/integrations` or the website status badges and state that You.com and LangSmith are configured in the current public deployment. Clarify that both remain optional, server-side adapters for other deployments and that no key reaches browser JavaScript.
- Explain how OpenAI Codex was used and how tests/evaluation controlled acceptance.
- Finish on the submission section with the GitHub and Google Doc links.

## Before submitting

- Run `npm test`, `npm run evaluate`, `npm run ablate`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- Confirm the live `/api/analyze` response reports `retrievalBackend: pinecone`.
- Confirm the live `/api/integrations` response reports all three providers configured and `secretsExposedToBrowser: false`.
- Confirm the video link is viewable without requesting access.
- Submit the Google Doc, video, and GitHub links through the Week 2 form.
