# Auth Bug Fixture

Hero scenario for the first deterministic replay.

Expected conceptual loop:

1. user request
2. session append
3. context compile
4. first model call
5. read tool call
6. tool execution
7. tool result append
8. context rebuild
9. second model call
10. final answer
11. agent settled

This directory will later contain captured Pi session/runtime JSONL fixtures.
