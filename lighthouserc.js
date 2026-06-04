module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/members',
        'http://localhost:3000/attendance',
        'http://localhost:3000/payments',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.6 }],
        'categories:accessibility': ['error', { minScore: 0.8 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.8 }],
        'resource-summary:script:size': ['warn', { maxNumericValue: 500_000 }],
        'unused-javascript': ['warn', { maxNumericValue: 200_000 }],
        'uses-http2': ['error'],
        'uses-responsive-images': ['warn'],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-report',
    },
    server: {
      storage: {
        baseDir: './lighthouse-storage',
      },
    },
  },
}
