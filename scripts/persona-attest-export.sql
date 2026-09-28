-- persona-attest-export.sql — the query behind persona-attestation.json (schema 2).
-- CANONICAL SOURCE: o-matic-studio/scripts/. Synced copies in firm and agency.
--
-- Run it through the o-MATIC Server `factory_query`, against the granted
-- connection whose database is `o-matic` (read the name off the wire), with
-- :tenant replaced by the tenant_id the startup card reports. It returns one
-- row per CURRENT persona. The pack-side file maps each shipped skill directory
-- to its agent_name and copies these columns onto it; a lane skill that carries
-- no identity header is written with "declares_identity": false, so absence is
-- recorded rather than assumed.
--
-- identity_signature is the RECOMPUTED signature (fn_persona_identity_signature
-- via v_persona_version_gate), never the stored column alone, so a stamp that
-- has drifted from its record cannot be exported as if it were current.
SELECT g.agent_name,
       g.version,
       g.review_status,
       g.recomputed_signature                    AS identity_signature,
       g.signature_stable,
       g.verdict,
       g.source_skill_version,
       (SELECT count(*) FROM factory.persona_character_bible b WHERE b.version_id = g.version_id)     AS character_bible,
       (SELECT count(*) FROM factory.persona_character_dimension d WHERE d.version_id = g.version_id) AS dimensions,
       (SELECT count(*) FROM factory.persona_build pb WHERE pb.persona_version_id = g.version_id)     AS builds
FROM public.v_persona_version_gate g
WHERE g.is_current AND g.tenant_id = :tenant
ORDER BY g.agent_name;
