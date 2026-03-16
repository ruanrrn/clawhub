import os
import re
import sys

# Usage:
#   python3 scripts/secret_scan.py <repo-root>
#
# Policy:
# - Avoid printing secret values; report file + line only.
# - Exclude .git/ and dist/ to reduce noise.

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."

PATTERNS = [
    ("private_key_block", re.compile(r"-----BEGIN( [A-Z]+)? PRIVATE KEY-----")),
    ("aws_access_key", re.compile(r"AKIA[0-9A-Z]{16}")),
    # GitHub fine-grained PATs are long; avoid flagging mere documentation strings.
    ("github_pat", re.compile(r"\bgithub_pat_[A-Za-z0-9_]{30,}\b")),
    ("github_token", re.compile(r"\bghp_[A-Za-z0-9]{36}\b")),
    ("slack_token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b")),
    # assignment-style hints
    ("password_assign", re.compile(r"(?i)\bpassword\b\s*[:=]")),
    ("token_assign", re.compile(r"(?i)\btoken\b\s*[:=]")),
    ("secret_assign", re.compile(r"(?i)\bsecret\b\s*[:=]")),
    ("api_key_assign", re.compile(r"(?i)\bapi[_-]?key\b\s*[:=]")),
]

SKIP_DIRS = {".git", "dist"}
MAX_BYTES = 200_000

findings = []

for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

    for fn in filenames:
        path = os.path.join(dirpath, fn)
        lower = fn.lower()

        # filename-based red flags
        if lower in {".env", ".env.local", ".env.production", "id_rsa", "id_ed25519"}:
            findings.append(("secret_file_name", path, 0))
            continue
        if lower.endswith((".pem", ".key", ".p12", ".pfx")):
            findings.append(("secret_file_ext", path, 0))
            continue

        try:
            st = os.stat(path)
        except OSError:
            continue

        if st.st_size > MAX_BYTES:
            continue

        try:
            with open(path, "rb") as f:
                data = f.read()
        except OSError:
            continue

        # skip binary-ish files
        if b"\x00" in data:
            continue

        text = data.decode("utf-8", errors="replace")

        for name, rx in PATTERNS:
            m = rx.search(text)
            if not m:
                continue

            line = text[: m.start()].count("\n") + 1
            findings.append((name, path, line))

if not findings:
    print("OK: no obvious secrets detected")
    raise SystemExit(0)

print("POTENTIAL SECRET FINDINGS:")
for name, path, line in findings:
    if line:
        print(f"- {name}: {path}:{line}")
    else:
        print(f"- {name}: {path}")

raise SystemExit(2)
