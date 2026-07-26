import type { AuthConfig } from 'convex/server';

const clerkDomain = process.env.CLERK_FRONTEND_API_URL;

if (!clerkDomain) {
  throw new Error('CLERK_FRONTEND_API_URL is not configured.');
}

export default {
  providers: [
    {
      domain: clerkDomain,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig;
