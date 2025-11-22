#!/usr/bin/env bash
# @name Fresh Install
# @description Clean reinstall of node_modules and dependencies
# @param manager:select:optional:npm,yarn,pnpm,bun Package manager to use (auto-detect if not specified)
# @param path:string:optional Path to project directory (current directory if not specified)
# @context terminal
# @category development

MANAGER=$1
PROJECT_PATH=${2:-.}

cd "$PROJECT_PATH" || exit 1

echo "Working directory: $(pwd)"

# Auto-detect package manager if not specified
if [ -z "$MANAGER" ]; then
  if [ -f "bun.lockb" ]; then
    MANAGER="bun"
  elif [ -f "pnpm-lock.yaml" ]; then
    MANAGER="pnpm"
  elif [ -f "yarn.lock" ]; then
    MANAGER="yarn"
  else
    MANAGER="npm"
  fi
  echo "Auto-detected package manager: $MANAGER"
fi

echo "Removing node_modules..."
rm -rf node_modules

echo "Removing lock files..."
rm -f package-lock.json yarn.lock pnpm-lock.yaml bun.lockb

echo "Clearing $MANAGER cache..."
case $MANAGER in
  npm)
    npm cache clean --force
    ;;
  yarn)
    yarn cache clean
    ;;
  pnpm)
    pnpm store prune
    ;;
  bun)
    rm -rf ~/.bun/install/cache
    ;;
esac

echo "Installing dependencies with $MANAGER..."
case $MANAGER in
  npm)
    npm install
    ;;
  yarn)
    yarn install
    ;;
  pnpm)
    pnpm install
    ;;
  bun)
    bun install
    ;;
esac

echo "Fresh install complete!"
