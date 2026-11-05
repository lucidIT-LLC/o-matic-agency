# Public readiness

This file is a checklist. It is not shipped as a skill. CI checks the boxes it can. A person checks the rest before a public release.

- [ ] Public gate clean (`check-public-package.py --profile skills-pack` exits 0)
- [ ] No retired role names (hashed retired-role category = 0)
- [ ] No SSH, nginx or server-host commands in any instruction
- [ ] No `../` or dead links (`check-skills.mjs`)
- [ ] Privacy and terms: every manifest points at `https://www.o-matic.ai/privacy-policy/` and `https://www.o-matic.ai/terms-of-service/` (both HTTP 200 on 2026-11-03). **PLACEHOLDER: pending legal review** (P4).
- [ ] LICENSE identical in all three repos (BUSL-1.1, Licensor LucidIT, LLC, Change Date 2030-09-05, Change License Apache-2.0).
- [ ] README roster matches the shipped skills. Firm is listed as Smith, Jake, Jerry.
- [ ] Author fields are "LucidIT, LLC" with a company contact (P1).
- [ ] Clean install verified on Cursor, Claude Code, Codex, Grok Bot and M365 (human step, not run in this PR)
- [ ] M365: icons are in the package. SSO id is still a placeholder; no value was supplied. Privacy and terms use the public pages and are pending legal review.

Agency 1.12.1 runs the skill-shape gate and the public gate in enforcing mode. The scripts are the Studio copies from `carver/universal-tooling` (PR #12, head 3a0277ce).
