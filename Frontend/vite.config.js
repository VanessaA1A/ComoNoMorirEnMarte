import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Commit que compiló Vercel (VERCEL_GIT_COMMIT_SHA lo pone Vercel solo). Se ve en <meta name="version">.
const COMMIT = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7);

export default defineConfig({
  plugins: [react(), { name: 'version', transformIndexHtml: (html) => html.replace('</head>', `  <meta name="version" content="${COMMIT}" />
  </head>`) }],
});
