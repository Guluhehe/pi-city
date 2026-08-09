# Malformed / partial import fixtures

These fixtures intentionally contain damaged JSONL so the adapter can prove that:

- invalid lines are counted rather than silently ignored
- valid surrounding events still normalize into a Semantic Trace
- import reports expose completeness instead of inventing a confident narrative
