# Development Guide

## Preview Development Commands

**Use these three command types to manage preview versions for BRAT compatibility:**

```bash
# 1. Start Preview (choose based on your changes)
npm run version:preview:patch    # Bug fixes: 0.9.1 → 0.9.2-preview.1
npm run version:preview:minor    # New features: 0.9.1 → 0.10.0-preview.1  
npm run version:preview:major    # Breaking changes: 0.9.1 → 1.0.0-preview.1

# 2. Iterate Preview (use repeatedly while developing)
npm run version:preview          # Increment: X.Y.Z-preview.1 → X.Y.Z-preview.2

# 3. Finalize Release (match your original level)
npm run version:patch            # Ship: 0.9.2-preview.N → 0.9.2
npm run version:minor            # Ship: 0.10.0-preview.N → 0.10.0
npm run version:major            # Ship: 1.0.0-preview.N → 1.0.0
```

**Workflow**: Start with appropriate preview level → iterate with `version:preview` as needed → finalize with matching release command. Preview commands keep `manifest.json` stable for BRAT while creating Git tags for GitHub Actions pre-releases. Final commands update both files for stable release.
