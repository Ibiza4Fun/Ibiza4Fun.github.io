#!/bin/sh
# check-secrets.sh - refuse to commit anything that looks like a credential.
#
# WHY THIS EXISTS
# ---------------
# 2026-07-31: four files sat in the workspace root in plaintext - google.txt,
# influxdb.txt, reolink.txt, samba.txt - one of them an 88-character InfluxDB token
# with no label. Nothing had committed them, which was luck rather than a control:
# earlier the same day a `git add -A` swept 62 lines of another agent's in-progress
# work into a commit nobody intended.
#
# OWASP puts detection before the commit, not after it: "consider enabling secrets
# detection at the developer level to avoid checking secrets into code before
# commit/PR". This is that hook.
#
# TWO CHECKS
#   1. gitleaks over the staged changes
#   2. .gitignore actually covers .env - the gap that lets the next one through
#
# IT REFUSES WHEN IT CANNOT RUN. Every other guard here fails open and says so,
# because a broken checker must not brick a session. This one is different: a
# missing scanner means an unscanned commit, and an unscanned commit is permanent.
# Installing the scanner is one command; recalling a pushed secret is not.
#
#   winget install --id Gitleaks.Gitleaks
#
# Exit 0 = clean. Exit 1 = refused, with the reason on stderr.

set -u

# --- find the scanner ------------------------------------------------------
# PATH first. winget's shim directory is not always on PATH in a git hook's
# environment, so the package directory is checked too - a real path that
# resolves beats a name that might.
GITLEAKS=""
if command -v gitleaks >/dev/null 2>&1; then
  GITLEAKS=$(command -v gitleaks)
else
  for c in \
    "$LOCALAPPDATA/Microsoft/WinGet/Links/gitleaks.exe" \
    "$LOCALAPPDATA/Microsoft/WinGet/Packages/Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe/gitleaks.exe" \
    "/usr/local/bin/gitleaks" "/opt/homebrew/bin/gitleaks"
  do
    if [ -x "$c" ]; then GITLEAKS="$c"; break; fi
  done
fi

if [ -z "$GITLEAKS" ]; then
  echo "check-secrets: the secret scanner is NOT INSTALLED, so nothing was scanned." >&2
  echo "  This hook refuses rather than passing an unscanned commit. A guard that" >&2
  echo "  cannot run must not look like one that ran." >&2
  echo "  Install it:  winget install --id Gitleaks.Gitleaks" >&2
  exit 1
fi

# --- prove it can fail before trusting it ----------------------------------
# A check that cannot fail proves nothing. Error 74, 2026-07-30: a control reported
# PASS because it had never returned anything else. Both directions, every run.
#
# The probe is a syntactically valid but fictional key pair. AWS's own documentation
# example is deliberately NOT used - it sits on the scanner's allowlist and would
# make this selftest pass while measuring nothing, which is the failure it exists
# to catch.
#
# 🔴 THE PROBE IS ASSEMBLED AT RUN TIME, AND IN THIS REPOSITORY THAT IS NOT OPTIONAL.
# 2026-08-11: this file was refused twice on the way in - first by itself, which is the
# expected shape (a file that CONTAINS the detector cannot be measured by it), and then by
# GITHUB'S OWN PUSH PROTECTION, which knows nothing about a local .gitleaks.toml and cannot
# be allowlisted from here. Two independent guards agreed, and the outer one has the last
# word on a public repository.
#
# An allowlist was therefore the wrong answer: it would have satisfied the guard we control
# and left the one we do not. Splitting the literal is the right one - no complete key
# pattern exists anywhere in this file, so neither scanner has anything to match, while the
# selftest still hands gitleaks a real-shaped key and still fails if it stops detecting one.
# The private repositories keep the allowlist because nothing scans their pushes; here the
# probe simply must not exist as text.
TMPD=$(mktemp -d)
trap 'rm -rf "$TMPD"' EXIT

# Assembled from halves. Neither half matches on its own; the file is clean, the probe is not.
_ID_A='AKIA'; _ID_B='4T7RQZ2XKPLMNV3D'
_SK_A='hK3mQ9zRt7WpXv2LcYb8'; _SK_B='NfJd4SgU6AeH1oPiZrTx'
printf 'aws_key = "%s%s"\naws_secret = "%s%s"\n' "$_ID_A" "$_ID_B" "$_SK_A" "$_SK_B" \
  > "$TMPD/dirty.txt"
printf 'host = "localhost"\nport = 8086\nbucket = "haos-oyna-raw"\n' > "$TMPD/clean.txt"

"$GITLEAKS" detect --no-git --source "$TMPD/dirty.txt" --no-banner --redact >/dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "check-secrets: SELFTEST FAILED - the scanner did not flag a planted credential." >&2
  echo "  Refusing to judge anything. A broken guard is worse than none: it reports green." >&2
  exit 1
fi

"$GITLEAKS" detect --no-git --source "$TMPD/clean.txt" --no-banner --redact >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "check-secrets: SELFTEST FAILED - the scanner flagged ordinary configuration." >&2
  echo "  A guard with false positives gets switched off, and then it protects nothing." >&2
  exit 1
fi

# --- 1. the staged changes -------------------------------------------------
if ! "$GITLEAKS" git --staged --no-banner --redact 2>&1; then
  echo "" >&2
  echo "check-secrets: the staged changes carry something that looks like a credential." >&2
  echo "  Values are redacted above on purpose - printing a secret to explain it is" >&2
  echo "  how it reaches the transcript, and the transcript is forever." >&2
  echo "" >&2
  echo "  If it is real:      revoke it, rotate it, THEN remove it from the change." >&2
  echo "                      That order is OWASP's, and it is the order that matters:" >&2
  echo "                      deleting the line does not un-share the value." >&2
  echo "  If it is a sample:  give it an obviously fictional shape, or add a narrow" >&2
  echo "                      allowlist entry to .gitleaks.toml naming this one path." >&2
  echo "" >&2
  echo "  Secrets belong in C:\\Users\\bardb\\.secrets\\ - outside every repository," >&2
  echo "  where no commit can reach them." >&2
  exit 1
fi

# --- 2. .gitignore covers .env ---------------------------------------------
# Measured 2026-07-31: oyna-haos ignored secrets.yaml but not .env - the repository
# with the most sensitive configuration in the set. No .env existed there, so it was
# latent rather than leaking. This makes sure it stays that way in every repository.
if [ -f .gitignore ]; then
  if ! grep -qE '^\s*\*?\.env' .gitignore; then
    echo "check-secrets: .gitignore does not cover .env in this repository." >&2
    echo "  Nothing is leaking yet. That is exactly when to close it - the gap is" >&2
    echo "  invisible until the day someone puts a file there." >&2
    echo "  Add a line:  .env" >&2
    exit 1
  fi
else
  echo "check-secrets: this repository has no .gitignore, so .env is not covered." >&2
  exit 1
fi

echo "- check-secrets: staged changes scanned, .env covered."
exit 0
