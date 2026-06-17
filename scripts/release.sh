#!/usr/bin/env bash
#
# One-command release for hoton-mcp.
#   yarn release          # 0.1.0 -> 0.1.1 (patch: small fixes)
#   yarn release:minor    # 0.1.0 -> 0.2.0 (new features)
#   yarn release:major    # 0.1.0 -> 1.0.0 (big/breaking changes)
#
# It bumps the version, publishes to npm, and pushes the update to BOTH
# repos (this monorepo + the public hotonlabs/hoton-mcp) so everything matches.
# Commit your code changes first — it refuses to release a dirty package.

set -euo pipefail

BUMP="${1:-patch}"
PUBLIC_REPO="https://github.com/hotonlabs/hoton-mcp.git"

# Always run from the package root (this script lives in mcp/scripts/).
cd "$(dirname "$0")/.."

# 1. Refuse if the mcp/ package has uncommitted changes (keeps npm == git).
if [ -n "$(git status --porcelain -- .)" ]; then
  echo "❌ Uncommitted changes in mcp/. Commit your code first, then run the release."
  git status --short -- .
  exit 1
fi

# 2. Bump the version in package.json (no git commit/tag yet).
npm version "$BUMP" --no-git-tag-version >/dev/null
VERSION="$(node -p "require('./package.json').version")"
echo "▶ Releasing hoton-mcp v$VERSION ($BUMP)"

# 3. Record the bump in the monorepo (clear message + an unambiguous tag).
git add package.json
git commit -q -m "release(mcp): v$VERSION"
git tag "hoton-mcp-v$VERSION"

# 4. Publish to npm (prepublishOnly rebuilds dist/ first).
npm publish

# 5. Push the monorepo commit + tag.
git push --follow-tags

# 6. Mirror the package into the standalone public repo so it matches npm.
TMP="$(mktemp -d)"
git clone -q "$PUBLIC_REPO" "$TMP/repo"
rsync -a --delete --exclude='.git' --exclude='node_modules' --exclude='dist' ./ "$TMP/repo/"
(
  cd "$TMP/repo"
  git add -A
  git commit -q -m "release: v$VERSION" || echo "  (public repo already in sync)"
  git push -q origin main
)
rm -rf "$TMP"

echo "✅ hoton-mcp v$VERSION is live on npm + pushed to both repos."
echo "   Anyone gets it on their next: npx -y hoton-mcp"
