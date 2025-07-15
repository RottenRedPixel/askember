import packageJson from '../../package.json';

/**
 * Application version information
 */
export const VERSION = packageJson.version; // Read from package.json instead of hardcoded

export const VERSION_INFO = {
  // Package version from package.json
  version: VERSION,

  // Build-time information (injected by Vite)
  buildDate: typeof __BUILD_DATE__ !== 'undefined' ? __BUILD_DATE__ : new Date().toISOString(),
  gitCommit: typeof __GIT_COMMIT__ !== 'undefined' ? __GIT_COMMIT__ : 'dev',
  buildEnv: typeof __BUILD_ENV__ !== 'undefined' ? __BUILD_ENV__ : 'development',

  // Computed properties
  get isDevelopment() {
    return this.buildEnv === 'development';
  },

  get isProduction() {
    return this.buildEnv === 'production';
  },

  get shortCommit() {
    return this.gitCommit.slice(0, 7);
  },

  get formattedBuildDate() {
    return new Date(this.buildDate).toLocaleString();
  },

  get versionString() {
    return `v${this.version}`;
  },

  get fullVersionString() {
    const env = this.isDevelopment ? '-dev' : '';
    const commit = this.gitCommit !== 'dev' ? `+${this.shortCommit}` : '';
    return `v${this.version}${env}${commit}`;
  }
};

/**
 * Get version information object
 */
export const getVersionInfo = () => ({
  version: VERSION_INFO.version,
  buildDate: VERSION_INFO.buildDate,
  gitCommit: VERSION_INFO.gitCommit,
  buildEnv: VERSION_INFO.buildEnv,
  isDevelopment: VERSION_INFO.isDevelopment,
  isProduction: VERSION_INFO.isProduction,
  shortCommit: VERSION_INFO.shortCommit,
  formattedBuildDate: VERSION_INFO.formattedBuildDate,
  versionString: VERSION_INFO.versionString,
  fullVersionString: VERSION_INFO.fullVersionString
});

/**
 * Version comparison utilities
 */
export const parseVersion = (versionString) => {
  const match = versionString.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+?))?(?:\+(.+))?$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    build: match[5] || null,
    raw: versionString
  };
};

/**
 * Compare two version strings
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export const compareVersions = (a, b) => {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);

  if (!versionA || !versionB) return 0;

  // Compare major.minor.patch
  const compareNumber = (x, y) => x < y ? -1 : x > y ? 1 : 0;

  let result = compareNumber(versionA.major, versionB.major);
  if (result !== 0) return result;

  result = compareNumber(versionA.minor, versionB.minor);
  if (result !== 0) return result;

  result = compareNumber(versionA.patch, versionB.patch);
  if (result !== 0) return result;

  // Handle prerelease versions
  if (versionA.prerelease && !versionB.prerelease) return -1;
  if (!versionA.prerelease && versionB.prerelease) return 1;
  if (versionA.prerelease && versionB.prerelease) {
    return versionA.prerelease.localeCompare(versionB.prerelease);
  }

  return 0;
};

/**
 * Format version for display
 * @param {boolean} compact - Whether to show compact version
 * @param {boolean} showEnv - Whether to show environment
 * @param {boolean} showCommit - Whether to show git commit
 * @param {boolean} showBuild - Whether to show build date
 * @returns {string} Formatted version string
 */
export const formatVersionForDisplay = (compact = false, showEnv = true, showCommit = true, showBuild = false) => {
  if (compact) {
    return VERSION_INFO.versionString;
  }

  let version = VERSION_INFO.versionString;

  if (showEnv && VERSION_INFO.isDevelopment) {
    version += '-dev';
  }

  if (showCommit && VERSION_INFO.gitCommit !== 'dev') {
    version += `+${VERSION_INFO.shortCommit}`;
  }

  if (showBuild) {
    const buildDate = new Date(VERSION_INFO.buildDate).toLocaleDateString();
    version += ` (${buildDate})`;
  }

  return version;
};

/**
 * Log version information to console
 */
export const logVersionInfo = () => {
  console.group('🔥 Ember Version Information');
  console.log('Version:', VERSION_INFO.versionString);
  console.log('Build Date:', VERSION_INFO.formattedBuildDate);
  console.log('Git Commit:', VERSION_INFO.gitCommit);
  console.log('Environment:', VERSION_INFO.buildEnv);
  console.log('Full Version:', VERSION_INFO.fullVersionString);
  console.groupEnd();
};

// Auto-log version info in development
if (VERSION_INFO.isDevelopment && typeof window !== 'undefined') {
  // Only log once per session
  if (!window.__EMBER_VERSION_LOGGED__) {
    window.__EMBER_VERSION_LOGGED__ = true;
    logVersionInfo();
  }
} 