// This file is kept for future SSR/hybrid mode support
// For static builds, language detection is handled client-side
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  return next();
});
