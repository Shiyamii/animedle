import { authClient } from "@/lib/auth-client";
import { Navigate, Outlet } from "react-router";

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
