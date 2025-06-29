# BRAT Preview Version Guide

This guide explains how to create preview versions of your Obsidian plugin that work with BRAT (Beta Reviewer's Auto-update Tool) using a clean dual-configuration approach with cross-referenced version synchronization.

## How BRAT Works

BRAT examines your repository's GitHub releases and uses semantic versioning. It supports preview versions like `1.0.7-preview.1` and will automatically pick up GitHub releases marked as "Pre-release".

**Important**: If users install a pre-release like `1.0.1-preview.1`, Obsidian will NOT automatically update to `1.0.1` when released. The final version must be at least a minor version higher (e.g., `1.0.2` or `1.1.0`) for Obsidian's update mechanism to work.

## Dual Configuration System with Cross-Sync

Your project uses **two specialized bump-my-version configurations** that automatically keep each other in sync:

### 1. `.bumpversion.toml` (Default - Release Logic)
- **Purpose**: Finalizing previews to releases
- **Files updated**: Both `package.json` AND `manifest.json` + syncs preview config
- **Serialization**: Always removes preview suffix
- **Cross-sync**: Updates `current_version` in `.bumpversion-preview.toml`
- **Used for**: Final releases that BRAT users see

### 2. `.bumpversion-preview.toml` (Preview Logic)
- **Purpose**: Creating and incrementing preview versions
- **Files updated**: Only `package.json` + syncs release config (keeps manifest.json stable)
- **Serialization**: Always includes preview suffix
- **Cross-sync**: Updates `current_version` in `.bumpversion.toml`
- **Used for**: Preview development and testing

### Cross-Reference Synchronization Magic ✨

Each configuration automatically updates the other's `current_version` field:

**When using release config (`.bumpversion.toml`):**
- Updates `package.json`
- Updates `manifest.json` 
- **Syncs**: Updates `current_version` in `.bumpversion-preview.toml` ✨

**When using preview config (`.bumpversion-preview.toml`):**
- Updates `package.json`
- **Syncs**: Updates `current_version` in `.bumpversion.toml` ✨

This ensures both configs always know the latest version!

## Complete Workflow Commands

### 1. Create Preview Versions

Choose the appropriate level for your changes:

```bash
# Patch-level preview (0.9.1 → 0.9.2-preview.1)
npm run version:preview:patch

# Minor-level preview (0.9.1 → 0.10.0-preview.1)  
npm run version:preview:minor

# Major-level preview (0.9.1 → 1.0.0-preview.1)
npm run version:preview:major
```

All preview creation commands:
- Use preview config
- Only update `package.json` 
- **Cross-sync**: Update release config's `current_version`
- Create Git tag for GitHub Actions

### 2. Increment Preview (Any Level)

```bash
# Increment any preview version
npm run version:preview

# Examples:
# 0.9.2-preview.1 → 0.9.2-preview.2
# 0.10.0-preview.3 → 0.10.0-preview.4  
# 1.0.0-preview.1 → 1.0.0-preview.2
```

### 3. Finalize to Release

Choose finalization that matches your preview level:

```bash
# Finalize patch preview (0.9.2-preview.N → 0.9.2)
npm run version:patch

# Finalize minor preview (0.10.0-preview.N → 0.10.0)
npm run version:minor

# Finalize major preview (1.0.0-preview.N → 1.0.0)
npm run version:major
```

All finalization commands:
- Use release config
- Update BOTH `package.json` AND `manifest.json`
- **Cross-sync**: Update preview config's `current_version`
- Create Git tag for GitHub Actions

## Example Workflows

### Patch Release Workflow
Starting from `0.9.1`:

```bash
# 1. Create patch preview
npm run version:preview:patch  # → 0.9.2-preview.1
# ✅ package.json: "0.9.2-preview.1", manifest.json: stays "0.9.1"
# ✅ .bumpversion.toml current_version: "0.9.2-preview.1"
# ✅ .bumpversion-preview.toml current_version: "0.9.2-preview.1"

# 2. Test, iterate if needed
npm run version:preview  # → 0.9.2-preview.2
# ✅ package.json: "0.9.2-preview.2", manifest.json: still "0.9.1"
# ✅ Both configs now have current_version: "0.9.2-preview.2"

# 3. Finalize patch release
npm run version:patch  # → 0.9.2
# ✅ package.json: "0.9.2", manifest.json: "0.9.2" ✨
# ✅ Both configs now have current_version: "0.9.2"
```

### Minor Release Workflow
Starting from `0.9.1`:

```bash
# 1. Create minor preview
npm run version:preview:minor  # → 0.10.0-preview.1
# ✅ Cross-sync: Both configs updated to "0.10.0-preview.1"

# 2. Test, iterate if needed
npm run version:preview  # → 0.10.0-preview.2
# ✅ Cross-sync: Both configs updated to "0.10.0-preview.2"

# 3. Finalize minor release
npm run version:minor  # → 0.10.0
# ✅ Cross-sync: Both configs updated to "0.10.0"
```

### Major Release Workflow
Starting from `0.9.1`:

```bash
# 1. Create major preview
npm run version:preview:major  # → 1.0.0-preview.1
# ✅ Cross-sync: Both configs updated to "1.0.0-preview.1"

# 2. Test, iterate if needed
npm run version:preview  # → 1.0.0-preview.2
# ✅ Cross-sync: Both configs updated to "1.0.0-preview.2"

# 3. Finalize major release
npm run version:major  # → 1.0.0
# ✅ Cross-sync: Both configs updated to "1.0.0"
```

## File Update Behavior

| Command | Config | package.json | manifest.json | Cross-Sync |
|---------|--------|--------------|---------------|-----------|
| `version:preview:patch` | Preview | ✅ Updated | ❌ Unchanged | ✅ Syncs release config |
| `version:preview:minor` | Preview | ✅ Updated | ❌ Unchanged | ✅ Syncs release config |
| `version:preview:major` | Preview | ✅ Updated | ❌ Unchanged | ✅ Syncs release config |
| `version:preview` | Preview | ✅ Updated | ❌ Unchanged | ✅ Syncs release config |
| `version:patch` | Release | ✅ Updated | ✅ Updated | ✅ Syncs preview config |
| `version:minor` | Release | ✅ Updated | ✅ Updated | ✅ Syncs preview config |
| `version:major` | Release | ✅ Updated | ✅ Updated | ✅ Syncs preview config |

## Smart Configuration Logic

### Cross-Reference File Updates

**Release config (`.bumpversion.toml`) updates:**
```toml
[[tool.bumpversion.files]]
filename = "package.json"          # ✅ Update package version

[[tool.bumpversion.files]]
filename = "manifest.json"         # ✅ Update manifest (release only)

[[tool.bumpversion.files]]
filename = ".bumpversion-preview.toml"  # ✅ Keep preview config in sync
search = 'current_version = "{current_version}"'
replace = 'current_version = "{new_version}"'
```

**Preview config (`.bumpversion-preview.toml`) updates:**
```toml
[[tool.bumpversion.files]]
filename = "package.json"          # ✅ Update package version

[[tool.bumpversion.files]]
filename = ".bumpversion.toml"     # ✅ Keep release config in sync
search = 'current_version = "{current_version}"'
replace = 'current_version = "{new_version}"'
```

### Serialization Patterns

**Preview Config:**
```toml
serialize = [
    "{major}.{minor}.{patch}-{stage}.{preview}"  # Always includes -preview.N
]
```

**Release Config:**
```toml
serialize = [
    "{major}.{minor}.{patch}"  # Never includes preview parts
]
```

## BRAT Compatibility

### Smart manifest.json Management
- **Preview versions**: `manifest.json` stays at last stable release
- **Final releases**: `manifest.json` gets updated to new stable version
- **BRAT behavior**: Only sees stable versions, exactly as intended

### Example State Progression (Minor Release):
```bash
# Initial state (after 0.9.1 release)
package.json: "0.9.1"
manifest.json: "0.9.1"
Both configs current_version: "0.9.1"

# After npm run version:preview:minor
package.json: "0.10.0-preview.1" 
manifest.json: "0.9.1" ← BRAT still sees 0.9.1
Both configs current_version: "0.10.0-preview.1" ✨

# After npm run version:preview  
package.json: "0.10.0-preview.2"
manifest.json: "0.9.1" ← Still unchanged
Both configs current_version: "0.10.0-preview.2" ✨

# After npm run version:minor
package.json: "0.10.0"
manifest.json: "0.10.0" ← BRAT now sees 0.10.0!
Both configs current_version: "0.10.0" ✨
```

## GitHub Actions Integration

All commands create Git tags that trigger your existing GitHub Actions:
- `v0.9.2-preview.1` → Creates GitHub pre-release
- `v0.10.0-preview.1` → Creates GitHub pre-release
- `v1.0.0-preview.1` → Creates GitHub pre-release  
- `v0.9.2`, `v0.10.0`, `v1.0.0` → Create regular GitHub releases

## Decision Guide: Which Preview Level?

### Patch Preview (`version:preview:patch`)
- **Use for**: Bug fixes, small improvements, documentation updates
- **Example**: `0.9.1 → 0.9.2-preview.1`
- **Semantic meaning**: Backward compatible fixes

### Minor Preview (`version:preview:minor`)  
- **Use for**: New features, significant improvements
- **Example**: `0.9.1 → 0.10.0-preview.1`
- **Semantic meaning**: Backward compatible new functionality

### Major Preview (`version:preview:major`)
- **Use for**: Breaking changes, major rewrites, API changes
- **Example**: `0.9.1 → 1.0.0-preview.1`
- **Semantic meaning**: Breaking changes that may require user action

## Checking Status

```bash
# See current version and available bumps
npm run version:show

# Check current version (should be same for both configs)
bump-my-version show current_version
bump-my-version --config-file .bumpversion-preview.toml show current_version

# See what any operation would do (dry run examples)
bump-my-version --config-file .bumpversion-preview.toml bump minor --dry-run
bump-my-version bump major --dry-run
```

## Advanced: Direct Commands

If you prefer using bump-my-version directly:

```bash
# Preview development (preview config - includes cross-sync)
bump-my-version --config-file .bumpversion-preview.toml bump patch    # Patch preview
bump-my-version --config-file .bumpversion-preview.toml bump minor    # Minor preview
bump-my-version --config-file .bumpversion-preview.toml bump major    # Major preview
bump-my-version --config-file .bumpversion-preview.toml bump preview  # Increment preview

# Final releases (default config - includes cross-sync)
bump-my-version bump patch  # Finalize to patch
bump-my-version bump minor  # Finalize to minor
bump-my-version bump major  # Finalize to major
```

## Troubleshooting

**manifest.json not updating for final release**:
- Ensure you used the correct finalization command (`version:patch/minor/major`)
- Don't use preview commands for finalization

**Wrong version progression**:
- Remember: `0.10.0-preview.1` comes BEFORE `0.10.0`
- Match your finalization level to your preview level

**Configs out of sync**:
- Should never happen due to cross-referencing
- If it occurs, manually fix one config and run any version command to re-sync

**Need to skip preview and go directly to final**:
- Use release commands directly: `npm run version:patch/minor/major` from a regular version

## Quick Reference

```bash
# Preview Creation (choose one based on change type)
npm run version:preview:patch   # Bug fixes: 0.9.1 → 0.9.2-preview.1 ✨
npm run version:preview:minor   # New features: 0.9.1 → 0.10.0-preview.1 ✨  
npm run version:preview:major   # Breaking changes: 0.9.1 → 1.0.0-preview.1 ✨

# Preview Iteration (same for all levels)
npm run version:preview         # Increment: X.Y.Z-preview.1 → X.Y.Z-preview.2

# Release Finalization (match your preview level)
npm run version:patch           # Finalize patch: 0.9.2-preview.N → 0.9.2 ✨
npm run version:minor           # Finalize minor: 0.10.0-preview.N → 0.10.0 ✨
npm run version:major           # Finalize major: 1.0.0-preview.N → 1.0.0 ✨

# Information
npm run version:show            # Show available bumps
```

## The Beauty of This Approach

- **📝 No helper scripts**: Pure bump-my-version configurations
- **🧠 No thinking required**: Commands clearly indicate their purpose
- **🎯 BRAT compatible**: Smart manifest.json handling
- **🔄 GitHub Actions ready**: Tags trigger automatic releases
- **⚡ Native tooling**: Uses bump-my-version as designed
- **🎨 Semantic versioning**: Full major/minor/patch support
- **🏗️ Hierarchical naming**: Clean `version:preview:*` structure
- **🔄 Cross-synchronization**: Configs automatically keep each other in sync

**Clean, intuitive, fully automated with bulletproof synchronization** - the perfect solution! 🚀

The dual-config approach with cross-referencing ensures your configs never get out of sync while maintaining perfect BRAT compatibility.
