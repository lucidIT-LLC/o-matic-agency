#!/usr/bin/env python3
"""Public-readiness lint for a skills pack.

The Track A source this file was specified to be copied from
(/workspace/research/sso-rework/carver/track-a/lint/check-public-package.py)
was not in the tree. This script implements the contract in the change spec:
exit 0 clean, 1 hits, 2 error; --profile skills-pack; hashed terms report
file:line and category and never the term.

--warn prints hits and exits 0 (report-only, for the tooling PR).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys

TEXT_EXT = {".md", ".txt", ".json", ".yml", ".yaml", ".toml", ".mjs", ".js"}
TOKEN_RE = re.compile(r"[a-z0-9]+")
HOST_COMMANDS = [
    (re.compile(r"\bssh\b", re.I), "host-command"),
    (re.compile(r"\bscp\b", re.I), "host-command"),
    (re.compile(r"\bnginx\b", re.I), "host-command"),
    (re.compile(r"\bsudo\b", re.I), "host-command"),
    (re.compile(r"\bsystemctl\b", re.I), "host-command"),
    (re.compile(r"/etc/"), "host-command"),
    (re.compile(r"/opt/"), "host-command"),
    (re.compile(r"/var/www"), "host-command"),
]
RECORD_ID = [
    re.compile(r"\bSOP-\d+\b"),
    re.compile(r"\bKB-\d+\b"),
    re.compile(r"\bdecision\s+#\d+\b", re.I),
    re.compile(r"\baudit_id\b", re.I),
    re.compile(r"(?<![\w#])#\d{3,}\b"),
]
HOST_URL = [
    re.compile(r"\b[\w.-]+\.ts\.net\b", re.I),
    re.compile(r"\b(?:127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)\b"),
]
SERVER_BINDING = [
    re.compile(r"\blocalhost\b", re.I),
    re.compile(r"\b0\.0\.0\.0\b"),
]
PACKAGING = [
    re.compile(r"TODO\.example\.invalid", re.I),
    re.compile(r"\bICON-PENDING\b"),
]
PERSON_EMAIL = [re.compile(r"@icloud\.com\b", re.I)]
# Off in skills-pack when the session ritual names the public tool surface.
SERVER_TOOL = [re.compile(r"\bfactory_query\b"), re.compile(r"\bkernel_plan_update\b")]
SCHEMA_NAME = [re.compile(r"\bfactory_[a-z0-9_]{3,}\b")]
LINK_RE = re.compile(r"\]\(([^)#\s]+)(?:#[^)]*)?\)")
HISTORY_NAMES = {"CHANGELOG.md", "changelog.md"}


def die(msg: str) -> None:
    print(f"error: {msg}", file=sys.stderr)
    raise SystemExit(2)


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_tsv(path: str) -> list[tuple[str, str]]:
    rows = []
    if not path:
        return rows
    try:
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
    except OSError as exc:
        die(f"cannot read {path}: {exc}")
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        parts = stripped.split("\t")
        if len(parts) < 2:
            die(f"{path}: expected category<TAB>term")
        rows.append((parts[0].strip(), parts[1].strip()))
    return rows


def load_allow(path: str) -> list[str]:
    if not path:
        return []
    try:
        with open(path, encoding="utf-8") as handle:
            lines = handle.read().splitlines()
    except OSError as exc:
        die(f"cannot read {path}: {exc}")
    return [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]


def load_hashed(path: str) -> list[dict]:
    if not path:
        return []
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        die(f"cannot read {path}: {exc}")
    terms = data.get("terms", data if isinstance(data, list) else None)
    if not isinstance(terms, list):
        die(f"{path}: expected a list or an object with terms")
    out = []
    for item in terms:
        if isinstance(item, str):
            out.append({"sha256": item, "category": "hashed"})
        elif isinstance(item, dict) and "sha256" in item:
            out.append({"sha256": item["sha256"], "category": item.get("category", "hashed")})
        else:
            die(f"{path}: bad hashed term")
    return out


def pack_dir(root: str) -> str | None:
    for name in sorted(os.listdir(root)):
        plugin = os.path.join(root, name, ".cursor-plugin", "plugin.json")
        if os.path.isfile(plugin):
            return name
    return None


def roster_names(root: str) -> set[str]:
    names = set()
    path = os.path.join(root, "agent-pack.json")
    if os.path.isfile(path):
        try:
            with open(path, encoding="utf-8") as handle:
                pack = json.load(handle)
        except json.JSONDecodeError:
            pack = {}
        for agent in pack.get("agents", []):
            for key in ("id", "display_name"):
                value = agent.get(key)
                if isinstance(value, str):
                    names.add(value.lower())
            skill = agent.get("canonical_skill") or ""
            base = os.path.basename(os.path.dirname(skill))
            if base:
                names.add(base.lower())
    return names


def in_scope(root: str, path: str, pack: str | None) -> bool:
    rel = os.path.relpath(path, root)
    if rel.startswith(".github/public-gate" + os.sep) or rel.startswith(".github/public-gate"):
        return False
    if "scripts/public-gate/tests" in rel.replace("\\", "/"):
        return False
    parts = rel.split(os.sep)
    if parts[0] in {".git", "node_modules", "dist", ".build"}:
        return False
    top = parts[0]
    if top in {"skills", ".claude-plugin", ".cursor-plugin", ".codex-plugin", ".agents"}:
        return True
    if pack and top == pack:
        return True
    if rel in {"README.md", "LICENSE", "LICENSE.md", "gemini-extension.json"}:
        return True
    return False


def iter_files(root: str, pack: str | None):
    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        dirnames[:] = [d for d in dirnames if d not in {".git", "node_modules", "dist", ".build"} and not os.path.islink(os.path.join(dirpath, d))]
        for name in filenames:
            path = os.path.join(dirpath, name)
            if os.path.islink(path):
                continue
            if os.path.splitext(name)[1].lower() not in TEXT_EXT:
                continue
            if in_scope(root, path, pack):
                yield path


def allow_covers(line: str, start: int, end: int, allow: list[str]) -> bool:
    lowered = line.lower()
    for phrase in allow:
        needle = phrase.lower()
        begin = 0
        while True:
            at = lowered.find(needle, begin)
            if at < 0:
                break
            if at <= start and end <= at + len(needle):
                return True
            begin = at + 1
    return False


def term_pattern(term: str) -> re.Pattern[str]:
    body = re.escape(term).replace(r"\ ", r"\s+")
    return re.compile(rf"(?<!\w){body}(?!\w)", re.I)


def history_file(path: str) -> bool:
    return os.path.basename(path) in HISTORY_NAMES


def scan_file(path: str, root: str, args, denylist, allow, hashed, roster) -> list[str]:
    rel = os.path.relpath(path, root)
    try:
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
    except UnicodeDecodeError:
        return []
    hits = []
    hashed_by = {item["sha256"]: item["category"] for item in hashed}
    seen = set()

    def add(line_no: int, category: str, detail: str = "") -> None:
        key = (line_no, category, detail)
        if key in seen:
            return
        seen.add(key)
        extra = f" {detail}" if detail else ""
        hits.append(f"{rel}:{line_no}: {category}{extra}")

    for index, line in enumerate(text.splitlines(), start=1):
        lowered = line.lower()
        tokens = [tok for tok in TOKEN_RE.findall(lowered) if len(tok) >= 3]
        for token in tokens:
            category = hashed_by.get(sha256(token))
            if category and not allow_covers(line, lowered.find(token), lowered.find(token) + len(token), allow):
                add(index, category)
        for left, right in zip(tokens, tokens[1:]):
            bigram = f"{left} {right}"
            category = hashed_by.get(sha256(bigram))
            if category:
                add(index, category)
        for category, term in denylist:
            if category in {"record-id", "factory-name"} and history_file(path):
                continue
            match = term_pattern(term).search(line)
            if not match:
                continue
            if category == "roster" and term.lower() in roster:
                continue
            if allow_covers(line, match.start(), match.end(), allow):
                continue
            add(index, category)
        for pattern, category in HOST_COMMANDS:
            if pattern.search(line):
                add(index, category)
        # Record ids are gated on SKILL.md. The Track A baseline was canonical
        # skills, and hooks, contracts, and marketplace notes keep task numbers
        # the spec does not rewrite.
        if args.profile == "skills-pack" and path.endswith("SKILL.md") and not history_file(path):
            for pattern in RECORD_ID:
                if pattern.search(line):
                    add(index, "record-id")
                    break
        for pattern in HOST_URL:
            if pattern.search(line):
                add(index, "host-url")
        for pattern in SERVER_BINDING:
            if pattern.search(line):
                add(index, "server-binding")
        for pattern in PACKAGING:
            if pattern.search(line):
                add(index, "packaging")
        for pattern in PERSON_EMAIL:
            if pattern.search(line):
                add(index, "person")
        # Same rule as check-skills.mjs: a markdown link that climbs with "../".
        # Prose that names the Copilot payload's own relative path is not a link.
        for match in LINK_RE.finditer(line):
            if "../" in match.group(1):
                add(index, "parent-link", match.group(1))
        if args.profile != "skills-pack":
            for pattern in SERVER_TOOL:
                if pattern.search(line):
                    add(index, "server-tool")
            for pattern in SCHEMA_NAME:
                if pattern.search(line):
                    add(index, "schema-name")
        for match in LINK_RE.finditer(line):
            href = match.group(1)
            if re.match(r"^[a-z]+:", href, re.I):
                continue
            if href.startswith("#"):
                continue
            target = os.path.normpath(os.path.join(os.path.dirname(path), href))
            if not os.path.exists(target):
                add(index, "dead-link", href)
    return hits


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Public-readiness lint for a skills pack")
    parser.add_argument("root", nargs="?", default=".")
    parser.add_argument("--profile", default="skills-pack")
    parser.add_argument("--denylist")
    parser.add_argument("--allowlist")
    parser.add_argument("--hashed")
    parser.add_argument("--warn", action="store_true")
    args = parser.parse_args(argv)
    if args.profile not in {"skills-pack", "default"}:
        die(f"unknown profile {args.profile}")
    root = os.path.abspath(args.root)
    if not os.path.isdir(root):
        die(f"not a directory: {root}")
    denylist = load_tsv(args.denylist) if args.denylist else []
    allow = load_allow(args.allowlist) if args.allowlist else []
    hashed = load_hashed(args.hashed) if args.hashed else []
    pack = pack_dir(root)
    roster = roster_names(root)
    hits = []
    for path in iter_files(root, pack):
        hits.extend(scan_file(path, root, args, denylist, allow, hashed, roster))
    label = "warn" if args.warn else "FAIL"
    for hit in hits:
        print(f"{label} {hit}")
    if hits and not args.warn:
        print(f"FAIL: {len(hits)} public-readiness hit(s)")
        return 1
    if hits:
        print(f"warn: {len(hits)} public-readiness hit(s) (report-only)")
        return 0
    print("PASS: public-readiness")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except BrokenPipeError:
        raise SystemExit(0)
