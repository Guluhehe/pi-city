# Real read fixture (structure-scrubbed)

- **Capture source:** real Pi Session JSONL from a local mini-harness workspace run (inspect/read-heavy).
- **Public sanitization:** allowlist-based `npm run redact:fixture` keeps replay-essential lifecycle fields only (`type`, ids/`parentId`, timestamps, roles, tool names/ids, status, provider/`modelId`, `thinkingLevel`) and replaces nested `message.content` prose (`text`, `thinking`, `thinkingSignature`, tool argument strings, tool-result text, `cwd`) with opaque `[REDACTED_CONTENT]` / `[REDACTED_PATH]` / `[REDACTED_SECRET]` placeholders (no hash or length fingerprints).
- **Scenario shape:** Session reconstruction with many `read` calls and some `bash` checks; not compatible with the bundled guided auth/multi lessons.
- **Regression coverage:** import + analysis of a real inspect/read Session tree without inventing guided narration.
- **Privacy:** committed file must contain no raw user/assistant prose, hidden reasoning, tool-result bodies, raw commands, secrets, emails, or absolute home paths.
