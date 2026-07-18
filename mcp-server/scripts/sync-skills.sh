#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_SERVER_DIR="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$MCP_SERVER_DIR")"
SKILLS_DIR="$MCP_SERVER_DIR/skills"

echo "=== 同步 Skills ==="
echo "仓库根目录: $REPO_ROOT"
echo "目标目录:   $SKILLS_DIR"

rm -rf "$SKILLS_DIR"
mkdir -p "$SKILLS_DIR"

COUNT=0

for dir in "$REPO_ROOT"/*/; do
  dirname=$(basename "$dir")

  # Skip mcp-server itself, hidden directories, and github
  if [ "$dirname" = "mcp-server" ] || [ "$dirname" = ".git" ] || [ "$dirname" = ".github" ]; then
    continue
  fi

  if [ -f "${dir}SKILL.md" ]; then
    # Normalize directory name to kebab-case
    normalized=$(echo "$dirname" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g')

    cp -r "$dir" "$SKILLS_DIR/$normalized"
    echo "  [$((COUNT + 1))] $dirname -> $normalized"
    COUNT=$((COUNT + 1))
  fi
done

echo "=== 同步完成：$COUNT 个技能 ==="
