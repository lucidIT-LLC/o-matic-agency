# Read intelligence

Search before you guess a path. The size gate in the skill is the limit. This file is how to choose the read.

## Contents

- Known paths
- Unknown paths

## Known paths

Paths the factory storage configuration already grants:

- Skip the size probe for a file you have already measured this session.
- Read several known files together when the host can do that in one call.

## Unknown paths

Any path outside the factory root, or the first access to a folder that is not in the storage index:

1. Stop for consent (the skill's Consent section).
2. Read file info first, then apply the size gate.
3. Text under the middle band: head and tail, 100 lines each, then search inside.
4. Binary or CSV in that band: metadata plus a sample. Say that full analysis needs chunking.
5. Above the top band: flag it. Do not read it.

Report the path you actually read, not the path you hoped was there.
