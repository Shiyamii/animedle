import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/i18n'
import RootLayout from '@/layouts/RootLayout.tsx'
import HomePage from '@/pages/home/HomePage.tsx'
import DailyGuessingPage from '@/pages/daily/DailyGuessingPage.tsx'
import { AuthPage } from '@/pages/auth/AuthPage.tsx'
import AccountPage from '@/pages/account/AccountPage.tsx'
import { ProtectedRoute, GuestRoute, AdminRoute } from '@/components/ProtectedRoute.tsx'
import { AdminPage } from '@/pages/admin/AdminPage.tsx'
import EndlessPage from '@/pages/endless/EndlessModePage.tsx'
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                path: "/",
                element: <HomePage />,
            },
            {
                path: "/daily",
                element: <DailyGuessingPage />,
            },
            {
                element: <GuestRoute />,
                children: [
                    {
                        path: "/login",
                        element: <AuthPage />,
                    },
                ],
            },
            {
                element: <GuestRoute />,
                children: [
                    {
                        path: "/endless",
                        element: <EndlessPage />,
                    },
                ],
            },
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: "/account",
                        element: <AccountPage />,
                    },
                ],
            },
            {
                element: <AdminRoute />,
                children: [
                    {
                        path: "/admin",
                        element: <AdminPage />,
                    },
                ],
            },
        ],
    },
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router}/>
    </StrictMode>,
)
