// Side-effect imports for static assets that TypeScript 6's stricter
// resolver no longer infers from Next.js webpack loaders.
declare module '*.css';
declare module '*.scss';
