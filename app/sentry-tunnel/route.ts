// Serves `tunnelRoute` (`/monitoring`) in-process. The external rewrite Next uses
// otherwise attaches an 11th `close` listener and logs MaxListenersExceededWarning.
export { POST } from "@sentry/nextjs/tunnel";
