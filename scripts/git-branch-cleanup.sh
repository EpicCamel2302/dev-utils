#!/usr/bin/env bash
# @name Git Branch Cleanup
# @description Remove local branches that have been merged
# @param dryRun:boolean:optional Show what would be deleted without actually deleting
# @context terminal
# @category git

DRY_RUN=$1

echo "Fetching latest changes..."
git fetch --prune

echo ""
echo "Merged branches (excluding main/master/develop):"
echo "---"

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Get merged branches
MERGED_BRANCHES=$(git branch --merged | grep -v '^\*' | grep -v 'main' | grep -v 'master' | grep -v 'develop')

if [ -z "$MERGED_BRANCHES" ]; then
  echo "No merged branches to delete"
  exit 0
fi

echo "$MERGED_BRANCHES"
echo "---"

if [ "$DRY_RUN" = "true" ]; then
  echo ""
  echo "DRY RUN: Would delete the above branches"
  echo "Run without dry run to actually delete them"
  exit 0
fi

echo ""
read -p "Delete these branches? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "$MERGED_BRANCHES" | xargs git branch -d
  echo "Branches deleted successfully"
else
  echo "Cancelled"
fi
