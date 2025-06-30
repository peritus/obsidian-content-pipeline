# Development Guide

## BRAT-Compatible Release Workflow

**This project uses a two-step release process optimized for Obsidian plugin development with BRAT beta testing:**

### Step 1: Preview Development

**Start a new preview version** (choose based on your changes):
```bash
npm run version:preview:patch    # Bug fixes: 0.9.1 → 0.9.2-preview.1
npm run version:preview:minor    # New features: 0.9.1 → 0.10.0-preview.1
npm run version:preview:major    # Breaking changes: 0.9.1 → 1.0.0-preview.1
```

**Iterate during development** (use repeatedly while testing):
```bash
npm run version:preview          # Increment: X.Y.Z-preview.1 → X.Y.Z-preview.2
```

### Step 2: Release to Users

**Promote preview to stable release** (releases the base version):
```bash
npm run version:release          # Example: 0.9.2-preview.5 → 0.9.2
```

**Continue with next development cycle** (after users have the release):
```bash
npm run version:patch            # Next patch: 0.9.2 → 0.9.3
npm run version:minor            # Next minor: 0.9.2 → 0.10.0
npm run version:major            # Next major: 0.9.2 → 1.0.0
```

## Why This Workflow?

**BRAT Compatibility**: Preview commands keep `manifest.json` at the last stable version while creating GitHub releases for beta testing. The `version:release` command updates `manifest.json` to match, making the version available through Obsidian's official update mechanism.

**No Version Skipping**: Using `version:release` ensures you don't skip versions (e.g., `0.9.2-preview.1` → `0.9.2`, not `0.9.3`).

**Clean Git History**: Each command creates appropriate Git tags for GitHub Actions to build releases and pre-releases.

## Example Complete Cycle

```bash
# 1. Start working on bug fixes
npm run version:preview:patch    # 0.9.1 → 0.9.2-preview.1

# 2. Test and iterate
npm run version:preview          # 0.9.2-preview.1 → 0.9.2-preview.2
npm run version:preview          # 0.9.2-preview.2 → 0.9.2-preview.3

# 3. Ready to release to users
npm run version:release          # 0.9.2-preview.3 → 0.9.2

# 4. Start next development cycle
npm run version:preview:minor    # 0.9.2 → 0.10.0-preview.1
```
