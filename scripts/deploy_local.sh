#!/usr/bin/env bash
set -euo pipefail

# Small helper: commit local changes, push to main, and print Pages URL
MSG=${1:-"Add mini top-down car game + GH Pages workflow"}

git add -A
if git diff --staged --quiet; then
  echo "No changes to commit."
else
  git commit -m "$MSG"
fi

git push origin main

echo "Pushed. The GitHub Actions workflow will publish the site to GitHub Pages shortly."
echo "Expected URL: https://paul-minin.github.io/Relli-/"

echo "If you want to enable Pages via CLI:"
echo "  gh api -X PUT repos/paul-minin/Relli-/pages -f source.branch=gh-pages -f source.directory='/'"

exit 0
