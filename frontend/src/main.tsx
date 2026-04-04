import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n/i18n';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AdminRoute, GuestRoute, ProtectedRoute } from '@/components/ProtectedRoute.tsx';
import RootLayout from '@/layouts/RootLayout.tsx';
import AccountPage from '@/pages/account/AccountPage.tsx';
import { AdminPage } from '@/pages/admin/AdminPage.tsx';
import { AuthPage } from '@/pages/auth/AuthPage.tsx';
import CharacterEndlessPage from '@/pages/character/CharacterEndlessPage.tsx';
import CharacterGuessingPage from '@/pages/character/CharacterGuessingPage.tsx';
import DailyGuessingPage from '@/pages/daily/DailyGuessingPage.tsx';
import EndlessPage from '@/pages/endless/EndlessModePage.tsx';
import HomePage from '@/pages/home/HomePage.tsx';
import ChallengePage from './pages/challenge/ChallengePage';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/daily',
        element: <DailyGuessingPage />,
      },
      {
        path: '/character',
        element: <CharacterGuessingPage />,
      },

      {
        path: '/endless',
        element: <EndlessPage />,
      },
      {
        path: '/character-endless',
        element: <CharacterEndlessPage />,
      },
      {
        element: <GuestRoute />,
        children: [
          {
            path: '/login',
            element: <AuthPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/account',
            element: <AccountPage />,
          },
          {
            path: '/challenge',
            element: <ChallengePage />,
          },
        ],
      },
      {
        element: <AdminRoute />,
        children: [
          {
            path: '/admin',
            element: <AdminPage />,
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
