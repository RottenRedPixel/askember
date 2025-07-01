# Version Tracking System

This project implements a comprehensive version tracking system following industry best practices.

## Version History

### v1.0.43 (Latest)
**Release Date**: 2024-01-XX
**Features**:
- ✨ **NEW**: AI-Powered Deep Image Analysis
  - Automatic OpenAI image analysis when embers are created
  - Comprehensive analysis of people, emotions, environment, objects, activities, and more
  - ImageAnalysisModal with "Save Analysis Data" button
  - Analysis results stored in new `image_analysis` database table
  - Background processing to avoid blocking ember creation
  - Integration with EmberDetail carousel and completion tracking
- 🔧 **Database**: New `image_analysis` table with RLS policies
- 🔧 **API**: New `/api/analyze-image` endpoint using OpenAI GPT-4o Vision
- 🔧 **Dependencies**: Added OpenAI SDK v4.78.0

**Technical Details**:
- OpenAI Vision API integration for detailed image analysis
- Analysis includes: people count, demographics, emotions, environment, objects, activities, text/signage, artistic elements, and cultural context
- Database functions: `save_image_analysis()`, `get_image_analysis()`
- Modal component follows existing pattern (LocationModal, TimeDateModal)
- Automatic analysis triggering in ember creation workflow
- Completion status tracking in EmberDetail carousel

## Semantic Versioning

We follow [Semantic Versioning (SemVer)](https://semver.org/) with the format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes that require user intervention
- **MINOR**: New features that are backward compatible
- **PATCH**: Bug fixes and small improvements

## Version Management Commands

### Automatic Versioning (Recommended)
```bash
# Push to main - automatically increments patch version
git push

# Or use the npm script
npm run push
```

**How it works:**
- Every push to `main` branch automatically increments the patch version
- Creates a git tag (e.g., `v1.0.1`, `v1.0.2`, etc.)
- Commits the version change with message: `chore: bump version to X.Y.Z [auto-versioning]`
- Only runs on main branch (feature branches are unaffected)

### Manual Version Bumping
```bash
# Patch version (1.0.0 → 1.0.1) - for bug fixes
npm run version:patch

# Minor version (1.0.0 → 1.1.0) - for new features  
npm run version:minor

# Major version (1.0.0 → 2.0.0) - for breaking changes
npm run version:major

# Check current version
npm run version:info

# View recent version history
npm run version:status
```

### Manual Release Commands (with Git tags)
```bash
# Create patch release and push to origin
npm run release:patch

# Create minor release and push to origin
npm run release:minor

# Create major release and push to origin
npm run release:major

# Force push with tags (use carefully)
npm run push:force
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

### Option 1: Auto-Versioning Workflow (Recommended)

#### 1. Daily Development
- Work on features/fixes normally on feature branches
- Version automatically shows as `v1.0.0-dev` in development
- Push feature branches normally (no auto-versioning on non-main branches)

#### 2. Ready to Release
```bash
# Merge your feature to main
git checkout main
git merge feature/your-feature

# Push to main - version automatically increments!
git push
```

#### 3. For Major/Minor Releases
```bash
# When you need minor/major version bumps
npm run release:minor  # For new features
npm run release:major  # For breaking changes
```

### Option 2: Manual Versioning Workflow

#### 1. Daily Development
- Work on features/fixes normally
- Version automatically shows as `v1.0.0-dev` in development

#### 2. Ready to Release
```bash
# For bug fixes
npm run release:patch

# For new features
npm run release:minor

# For breaking changes
npm run release:major
```

### Git Tags (Both Workflows)
- Each push to main creates a git tag automatically
- Tags follow the format: `v1.0.0`, `v1.0.1`, `v1.1.0`, etc.
- Tags are pushed to origin repository with `--follow-tags`

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