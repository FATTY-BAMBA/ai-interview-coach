import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://257e05919848aed83cee1b74e4b29a31@o4510304222117888.ingest.us.sentry.io/4510304222248960",
  tracesSampleRate: 1,
  debug: false,
});
