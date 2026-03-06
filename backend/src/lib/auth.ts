import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const client = new MongoClient(process.env.MONGODB_URL ?? "mongodb://localhost:27017/auth-database");
const db = client.db();

function generateAvatarSeed(): string {
    return Math.random().toString(36).substring(2, 10);
}

export const auth = betterAuth({
    database: mongodbAdapter(db),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ["http://localhost:5173"],
    user: {
        additionalFields: {
            avatarSeed: {
                type: "string",
                required: false,
                returned: true,
                input: true,
            },
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    if (!user.avatarSeed) {
                        return {
                            data: {
                                ...user,
                                avatarSeed: generateAvatarSeed(),
                            },
                        };
                    }
                },
            },
        },
    },
});

export type AuthType = {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
}