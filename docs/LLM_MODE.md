# Optional Schema-Constrained LLM Mode

The evaluated and hosted application continues to use deterministic structured generation. An optional server-side OpenAI-compatible mode demonstrates how a model can compose the same signal-card contract without weakening citation or refusal safety.

## Configuration

Keep credentials local:

```bash
export LLM_BASE_URL="https://YOUR_PROVIDER/v1"
export LLM_API_KEY="YOUR_LOCAL_SECRET"
export LLM_MODEL="YOUR_MODEL"

npm run analyze:llm -- "NVRM Xid 79 on H100 R565"
```

The browser never receives the API key. Unknown identifiers are refused before any model call.

## Contract

The adapter requests strict JSON-schema output containing only the headline, documented meaning, possible interpretations, evidence to collect, limitations, and cited document IDs.

Post-validation then enforces a stronger condition than schema validity:

1. Every citation must belong to the current top-three evidence set.
2. The headline must equal a cited record title.
3. Meaning, evidence steps, interpretations, and limitations must be reproduced from cited structured fields.
4. Unexpected fields and paraphrased unsupported claims are rejected.
5. The model cannot change status, extracted telemetry, compatibility warnings, or retrieval diagnostics.

Telemetry and retrieved text are explicitly marked as untrusted data rather than instructions. The adapter never requests or permits a production action.

Tests use a controlled transport and no external credential. A real model result must never be claimed unless the command is run with a genuine configured provider.
