// This file remains as a placeholder if we switch back to SSR/hybrid.
// For the fully static build, language handling lives in client scripts / Nginx.
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_context, next) => next());
