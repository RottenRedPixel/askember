# Version Tracking System

This project implements a comprehensive version tracking system following industry best practices.

## Semantic Versioning

We follow [Semantic Versioning (SemVer)](https://semver.org/) with the format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes that require user intervention
- **MINOR**: New features that are backward compatible
- **PATCH**: Bug fixes and small improvements

## Version Management Commands

### Manual Version Bumping
```bash
# Patch version (1.0.0 → 1.0.1)
npm run version:patch

# Minor version (1.0.0 → 1.1.0)
npm run version:minor

# Major version (1.0.0 → 2.0.0)
npm run version:major

# Check current version
npm run version:info
```

### Release Commands (with Git tags)
```bash
# Create patch release and push to origin
npm run release:patch

# Create minor release and push to origin
npm run release:minor

# Create major release and push to origin
npm run release:major
```

## Build Information

The build system automatically injects additional metadata:

- **Build Date**: When the build was created
- **Git Commit**: Current commit hash (short version)
- **Environment**: development, staging, or production
- **Full Version String**: Combines version + environment + commit

## Version Display

### Mobile Menu
- Discrete version display at the bottom of the hamburger menu
- Click to expand detailed build information
- Shows: version, environment, commit hash, build date

### Console Logging
- Automatic version logging in development mode
- Available globally via `window.__getVersionInfo()`

## File Structure

```
src/
├── lib/
│   └── version.js          # Version utilities and constants
├── components/
│   └── VersionDisplay.jsx  # Version display component
└── ...

VERSION_TRACKING.md         # This documentation
package.json               # Version source of truth
vite.config.js            # Build-time version injection
```

## Development Workflow

### 1. Daily Development
- Work on features/fixes normally
- Version automatically shows as `v1.0.0-dev` in development

### 2. Ready to Release
```bash
# For bug fixes
npm run release:patch

# For new features
npm run release:minor

# For breaking changes
npm run release:major
```

### 3. Git Tags
- Each release automatically creates a git tag
- Tags follow the format: `v1.0.0`, `v1.1.0`, etc.
- Tags are pushed to origin repository

## Production Builds

Production builds will show:
- Clean version number (e.g., `v1.0.0`)
- Actual git commit hash
- Production build date
- No development indicators

## Best Practices

### When to Bump Versions

#### Patch (1.0.0 → 1.0.1)
- Bug fixes
- Security patches
- Performance improvements
- Documentation updates
- Internal refactoring

#### Minor (1.0.0 → 1.1.0)
- New features
- New API endpoints
- New UI components
- Enhanced functionality
- Backward-compatible changes

#### Major (1.0.0 → 2.0.0)
- Breaking API changes
- Removing features
- Major UI overhauls
- Database schema changes
- Configuration format changes

### Git Workflow
1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and commit: `git commit -m "Add new feature"`
3. Merge to main: `git checkout main && git merge feature/new-feature`
4. Release: `npm run release:minor`

### Commit Messages
Follow conventional commits for better automation:
```
feat: add user authentication
fix: resolve image loading issue
docs: update API documentation
refactor: simplify database queries
```

## Environment Variables

For production builds, you can set:
```bash
GIT_COMMIT=abc1234  # Override git commit detection
NODE_ENV=production # Set environment explicitly
```

## Debugging

### Console Commands
```javascript
// Get version info
window.__getVersionInfo()

// Check if development
window.__getVersionInfo().isDevelopment

// Get full version string
window.__getVersionInfo().fullVersionString
```

### Version Comparison
```javascript
import { compareVersions } from '@/lib/version';

// Returns: -1, 0, or 1
compareVersions('1.0.0', '1.1.0'); // -1 (first is older)
compareVersions('2.0.0', '1.9.9'); // 1 (first is newer)
compareVersions('1.0.0', '1.0.0'); // 0 (same version)
```

## Integration with CI/CD

For automated deployments, the version system integrates well with:

- **GitHub Actions**: Automatic releases on tag push
- **Vercel**: Build-time environment variable injection
- **Docker**: Multi-stage builds with version labeling

Example GitHub Action:
```yaml
name: Release
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy
        env:
          GIT_COMMIT: ${{ github.sha }}
        run: npm run build
```

This system provides comprehensive version tracking while remaining simple to use and maintain. 