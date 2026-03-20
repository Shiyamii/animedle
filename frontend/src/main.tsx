import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n/i18n'
import RootLayout from '@/layouts/RootLayout.tsx'
import HomePage from '@/pages/home/HomePage.tsx'
import { AuthPage } from '@/pages/auth/AuthPage.tsx'
import AccountPage from '@/pages/account/AccountPage.tsx'
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute.tsx'
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
                element: <GuestRoute />,
                children: [
                    {
                        path: "/login",
                        element: <AuthPage />,
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
        ],
    },
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router}/>
    </StrictMode>,
)
