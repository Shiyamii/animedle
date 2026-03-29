import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { db } from '@/lib/db';

function generateAvatarSeed(): string {
  return Math.random().toString(36).substring(2, 10);
}

export const auth = betterAuth({
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ['http://localhost:5173'],
  user: {
    additionalFields: {
      avatarSeed: {
        type: 'string',
        required: false,
        returned: true,
        input: true,
      },
      role: {
        type: 'string',
        required: false,
        returned: true,
        input: false,
        defaultValue: 'user',
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: (user) => {
          if (!user.avatarSeed) {
            return Promise.resolve({
              data: {
                ...user,
                avatarSeed: generateAvatarSeed(),
              },
            });
          }
          return Promise.resolve();
        },
        // biome-ignore lint/correctness/noUnreachable: weird error
      },
    },
  },
});

export type AuthType = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};
