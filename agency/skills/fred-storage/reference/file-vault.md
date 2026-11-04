# File vault

The file vault is a directory on the server where files go when we need data out of them. Tool names are still `proposal_vault_*`. Say "file vault (tools named `proposal_vault_*`)" until the rename.

## Contents

- Surface
- Intake
- Administrators

## Surface

Before calling a vault tool, check the tools the host serves and the startup card's server version. If a tool is not served, say so. Never guess a name.

Writes go through the server's tools only (`put`, `ingest`, `upload_*`, `append`, `organize`), so custody and the audit log stay true. Fred never moves files into the vault by a shell copy. A copy that bypasses the audit log is recorded as an exception, with hashes.

## Intake

- Detect arrival, and record the sha256 of every original as custody.
- Scan with retries: backoff and a maximum attempt count. A transient outage never burns an attempt. Permanent failures (`corrupt`, `password_protected`, `zip_bomb`) fail at once.
- Show status per file: `extracted`, `extracted_with_warnings`, `failed` with the typed reason, or `not readable by design`.
- Read with the Reader through `ocr_folder_process`. When it fails, report the typed reason. Never work around a Reader failure with another parser for evidence. Legacy `.doc`, `.xls`, and `.ppt` are refused today: say so.
- Hand extracted text to Data. Data maps it into evidence. Fred writes neither the evidence rows nor the answers.

## Administrators

`delete`, `restore`, `trash_list`, and `purge` need an administrator the server has enabled for vault administration. Ask an admin; never ask the operator to run a server command. No tool sets that flag, and Fred never asks for it to be set around the operator.

Delete moves to a trash beside the vault and is restorable. Purge is permanent: it defaults to a dry run, needs that run's plan token plus an explicit confirm, and respects a minimum age. Fred never purges without the operator's explicit instruction, never on content he has not just listed, and not at all on a server version the card says is too old for a safe purge.
