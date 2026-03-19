#!/usr/bin/env bash
# Run secret scanning on the full git history before open-sourcing.
# Install one of: gitleaks (https://github.com/gitleaks/gitleaks)
#                 trufflehog (https://github.com/trufflesecurity/trufflehog)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v gitleaks >/dev/null 2>&1; then
  echo "Running gitleaks..."
  gitleaks detect --source . --verbose
  exit 0
fi

if command -v trufflehog >/dev/null 2>&1; then
  echo "Running trufflehog git..."
  trufflehog git file://"$ROOT" --only-verified
  exit 0
fi

echo "Neither gitleaks nor trufflehog is installed. Install one and re-run, or use your org's standard scanner."
echo "  brew install gitleaks"
echo "  # or: pipx install trufflehog"
exit 1
