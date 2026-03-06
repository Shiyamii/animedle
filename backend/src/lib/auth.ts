import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const client = new MongoClient(process.env.MONGODB_URL ?? "mongodb://localhost:27017/auth-database");
const db = client.db();

export const auth = betterAuth({
    database: mongodbAdapter(db),
    emailAndPassword: {
        enabled: true,
    },
    trustedOrigins: ["http://localhost:5173"],
});

export type AuthType = {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
}