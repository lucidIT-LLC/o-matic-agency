-- Bring factory.agent_runtime_contracts up to core-role-runtime/1.2.0.
--
-- NOT DDL. This is a row update against an existing table, and it is the
-- consumer side of the version-authority rule in
-- contracts/ROLE-RUNTIME-CONTRACT.md: the shipped contract document owns the
-- version string; the database row follows it.
--
-- OWNER: Data. Per operator ruling decision #415 (2026-09-06), Data owns
-- factory database claims and database mutations and executes them through the
-- governed o-MATIC Server path. This file is the repository artifact; applying
-- it is Data's, not Carver's and not Probot's.
--
-- WHAT 1.2.0 CHANGES, and why the digest moves with it:
--   * Data's authority paragraph is reversed. It read "Data never performs
--     INSERT, UPDATE, DELETE, DDL, or direct database access", which
--     contradicted CORE-KERNEL-CONTRACT.md line 41. Settled by #415 in favor of
--     CORE-KERNEL-CONTRACT.
--   * Shared non-negotiable 6 is new: a contract contradiction is stop-and-route,
--     never a permissive reading.
--   * A version-authority section is added, because the string was split three
--     ways at 1.3.3 with no rule saying which surface won.
--
-- BEFORE APPLYING: confirm the digest below still matches the shipped file.
--   shasum -a 256 agency/contracts/ROLE-RUNTIME-CONTRACT.md
-- A mismatch means the contract moved after this file was written. Stop.

UPDATE factory.agent_runtime_contracts
   SET canonical_contract_version = 'core-role-runtime/1.2.0',
       contract_digest = 'sha256:bb050c8b05a518b281b5a2f11e8659fa00fb5736f75e8f7f3d9fdeb4ecd328cd',
       evidence_status = 'design_verified',
       last_evaluated_at = NULL,
       updated_at = now()
 WHERE tenant_id = 'omatic'
   AND agent_name IN ('probot', 'fred', 'data');

-- evidence_status is deliberately NOT raised and last_evaluated_at is cleared.
-- The conformance suite was rebuilt in the same release; a version it has not
-- been run against carries no adapter evidence, and stamping one would be the
-- unfalsifiable-success defect decision #226 names. Raise it after a live run
-- of evals/core-role-conformance.yaml on the target host, recorded in
-- factory.roster_audit_log.

SELECT agent_name, canonical_contract_version, contract_digest, evidence_status
  FROM factory.agent_runtime_contracts
 WHERE tenant_id = 'omatic'
 ORDER BY agent_name;
