-- Canonical runtime declarations for portable O-Matic roles.
-- Apply through the normal database-owner migration path. Routine role access
-- uses the O-Matic Server MCP surface; a direct owner session is an explicit,
-- named emergency/deployment exception and must be read back after application.

CREATE TABLE IF NOT EXISTS factory.agent_runtime_contracts (
  tenant_id text NOT NULL DEFAULT 'omatic',
  agent_name varchar(255) NOT NULL REFERENCES factory.agent_state(agent_name) ON UPDATE CASCADE,
  canonical_contract_version text NOT NULL,
  execution_modes text[] NOT NULL,
  l1_deployment_state text NOT NULL,
  l2_deployment_state text NOT NULL,
  platform_adapters jsonb NOT NULL,
  contract_digest text NOT NULL,
  evidence_status text NOT NULL DEFAULT 'design_verified',
  last_evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_runtime_contracts_pkey PRIMARY KEY (tenant_id, agent_name),
  CONSTRAINT agent_runtime_contracts_execution_modes_check
    CHECK (execution_modes <@ ARRAY['l1', 'l2']::text[]
           AND cardinality(execution_modes) > 0),
  CONSTRAINT agent_runtime_contracts_l1_state_check
    CHECK (l1_deployment_state IN ('ready', 'blocked', 'not_supported')),
  CONSTRAINT agent_runtime_contracts_l2_state_check
    CHECK (l2_deployment_state IN ('eligible', 'not_deployed', 'deployed', 'blocked')),
  CONSTRAINT agent_runtime_contracts_adapters_check
    CHECK (jsonb_typeof(platform_adapters) = 'object'),
  CONSTRAINT agent_runtime_contracts_evidence_check
    CHECK (evidence_status IN ('design_verified', 'adapter_verified', 'production_verified', 'blocked'))
);

COMMENT ON TABLE factory.agent_runtime_contracts IS
  'Database-owned declaration of each core role contract, L1/L2 eligibility, and platform adapter evidence.';

INSERT INTO factory.agent_runtime_contracts (
  tenant_id, agent_name, canonical_contract_version, execution_modes,
  l1_deployment_state, l2_deployment_state, platform_adapters,
  contract_digest, evidence_status
)
VALUES
  ('omatic', 'probot', 'core-role-runtime/1.0.0', ARRAY['l1','l2'],
   'ready', 'not_deployed',
   '{"openai":{"artifact":"manager-agent","status":"design_verified"},"codex":{"artifact":"skill-l1-agent-harness-l2","status":"design_verified"},"claude":{"artifact":"skill-l1-subagent-or-sdk-l2","status":"design_verified"},"copilot":{"artifact":"custom-agent-plus-skills","status":"design_verified"},"gemini":{"artifact":"managed-custom-agent-plus-skills","status":"design_verified"}}'::jsonb,
   'sha256:f2d14620e65c2d72eda4b85151621fb8bf0212590bb359271113c6288a0ef21f', 'design_verified'),
  ('omatic', 'fred', 'core-role-runtime/1.0.0', ARRAY['l1','l2'],
   'ready', 'not_deployed',
   '{"openai":{"artifact":"specialist-agent-tool","status":"design_verified"},"codex":{"artifact":"skill-l1-agent-harness-l2","status":"design_verified"},"claude":{"artifact":"skill-l1-subagent-or-sdk-l2","status":"design_verified"},"copilot":{"artifact":"custom-agent-plus-skills","status":"design_verified"},"gemini":{"artifact":"managed-custom-agent-plus-skills","status":"design_verified"}}'::jsonb,
   'sha256:f2d14620e65c2d72eda4b85151621fb8bf0212590bb359271113c6288a0ef21f', 'design_verified'),
  ('omatic', 'data', 'core-role-runtime/1.0.0', ARRAY['l1','l2'],
   'ready', 'not_deployed',
   '{"openai":{"artifact":"specialist-agent-tool","status":"design_verified"},"codex":{"artifact":"skill-l1-agent-harness-l2","status":"design_verified"},"claude":{"artifact":"skill-l1-subagent-or-sdk-l2","status":"design_verified"},"copilot":{"artifact":"custom-agent-plus-skills","status":"design_verified"},"gemini":{"artifact":"managed-custom-agent-plus-skills","status":"design_verified"}}'::jsonb,
   'sha256:f2d14620e65c2d72eda4b85151621fb8bf0212590bb359271113c6288a0ef21f', 'design_verified')
ON CONFLICT (tenant_id, agent_name) DO UPDATE SET
  canonical_contract_version = EXCLUDED.canonical_contract_version,
  execution_modes = EXCLUDED.execution_modes,
  l1_deployment_state = EXCLUDED.l1_deployment_state,
  l2_deployment_state = EXCLUDED.l2_deployment_state,
  platform_adapters = EXCLUDED.platform_adapters,
  contract_digest = EXCLUDED.contract_digest,
  evidence_status = EXCLUDED.evidence_status,
  updated_at = now();

CREATE TABLE IF NOT EXISTS factory.roster_audit_log (
  audit_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id text NOT NULL DEFAULT 'omatic',
  audit_scope text[] NOT NULL,
  audit_kind text NOT NULL,
  standards_checked jsonb NOT NULL,
  findings jsonb NOT NULL,
  overall_status text NOT NULL,
  contract_digest text NOT NULL,
  audited_by text NOT NULL,
  audited_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roster_audit_log_scope_check
    CHECK (cardinality(audit_scope) > 0),
  CONSTRAINT roster_audit_log_standards_check
    CHECK (jsonb_typeof(standards_checked) = 'array'),
  CONSTRAINT roster_audit_log_findings_check
    CHECK (jsonb_typeof(findings) = 'array'),
  CONSTRAINT roster_audit_log_status_check
    CHECK (overall_status IN ('pass', 'partial', 'blocked')),
  CONSTRAINT roster_audit_log_unique_snapshot
    UNIQUE (tenant_id, audit_kind, contract_digest)
);

COMMENT ON TABLE factory.roster_audit_log IS
  'Evidence ledger for roster audits: standards checked, measured findings, and release status.';

INSERT INTO factory.roster_audit_log (
  tenant_id, audit_scope, audit_kind, standards_checked, findings,
  overall_status, contract_digest, audited_by
)
VALUES (
  'omatic', ARRAY['probot','fred','data'], 'core-role-production-readiness',
  '[
    {"source":"public.v_agent_agreement","checked_at":"2026-09-04","purpose":"required Policy agreement coverage"},
    {"source":"Commons KB-0432 v6.7.1","checked_at":"2026-09-04","purpose":"portable role and host-adapter doctrine"},
    {"source":"OpenAI, Google, Microsoft, Anthropic, and Codex official documentation","checked_at":"2026-09-04","purpose":"platform adapter design"},
    {"source":"Agency installed and workspace artifacts","checked_at":"2026-09-04","purpose":"release alignment and conflicting legacy instructions"}
  ]'::jsonb,
  '[
    {"area":"agent agreements","status":"pass","result":"Probot, Fred, and Data each READY with halt_on_missing and no missing rule types."},
    {"area":"runtime registration","status":"pass","result":"All three registered L1 and L2; L1 ready, L2 not deployed, canonical digest attached."},
    {"area":"release alignment","status":"blocked","result":"Installed and workspace Agency artifacts differ; publish/install readback gate required."},
    {"area":"Fred authority","status":"blocked","result":"Legacy definition contains contradictory connection CRUD statements and retired procedure."},
    {"area":"retired runtime","status":"blocked","result":"Fred and Data retain present-tense Conductor instructions that conflict with O-Matic Server doctrine."},
    {"area":"platform adapters","status":"partial","result":"OpenAI, Codex, Claude, Copilot, and Gemini designs verified; no adapter is deployed or host-evaluated."},
    {"area":"Probot skill consolidation","status":"partial","result":"Tool discovery, staleness audit, and startup optimization are Probot-owned source artifacts; host deployment pending."}
  ]'::jsonb,
  'blocked',
  'sha256:f2d14620e65c2d72eda4b85151621fb8bf0212590bb359271113c6288a0ef21f',
  'probot'
)
ON CONFLICT (tenant_id, audit_kind, contract_digest) DO UPDATE SET
  audit_scope = EXCLUDED.audit_scope,
  standards_checked = EXCLUDED.standards_checked,
  findings = EXCLUDED.findings,
  overall_status = EXCLUDED.overall_status,
  audited_by = EXCLUDED.audited_by,
  audited_at = now();
