import { authClient } from "@/lib/auth-client";
import { Navigate, Outlet } from "react-router";

type SessionUser = { role?: string };

export function ProtectedRoute() {
    const { data: session, isPending } = authClient.useSession();

    if (isPending) return null;
    if (!session) return <Navigate to="/login" replace />;

    return <Outlet />;
}

export function GuestRoute() {
    const { data: session, isPending } = authClient.useSession();

    if (isPending) return null;
    if (session) return <Navigate to="/account" replace />;

    return <Outlet />;
}

export function AdminRoute() {
    const { data: session, isPending } = authClient.useSession();

    if (isPending) return null;
    if (!session) return <Navigate to="/login" replace />;

    const role = (session.user as unknown as SessionUser).role;
    if (role !== 'admin') return <Navigate to="/" replace />;

    return <Outlet />;
}
