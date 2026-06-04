// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production.
    tracesSampleRate: 0.5,

    // Only send errors in production
    enabled: process.env.NODE_ENV === 'production',

    // Environment name
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,

    // Ignore 4xx errors that are not actionable
    beforeSend(event) {
      if (event.exception) {
        const exceptionValue = event.exception.values?.[0]?.value || ''
        // Ignore auth-related errors
        if (exceptionValue.includes('Unauthorized') || exceptionValue.includes('Forbidden')) {
          return null
        }
      }
      return event
    },

    // Performance monitoring
    integrations: [
      Sentry.httpIntegration(),
    ],
  })
}
