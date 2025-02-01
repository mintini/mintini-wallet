import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TelegramProvider } from "./context/Telegram.tsx";
import './index.css'
import {
  createBrowserRouter, redirect,
  RouterProvider,
} from "react-router-dom";
import {AccountCreate} from "./routes/account.create.tsx";
import {AccountImport} from "./routes/account.import.tsx";
import {Start} from "./routes/start.tsx";
import {Onboarding} from "./routes/onboarding.tsx";
import {WalletMain} from "./routes/wallet.main.tsx";
import {WalletPools} from "./routes/wallet.pools.tsx";
import {WalletPoolDetails} from "./routes/wallet.pool.details.tsx";
import {WalletSend} from "./routes/wallet.send.tsx";
import {WalletDex} from "./routes/wallet.dex.tsx";
import {WalletActivity} from "./routes/wallet.activity.tsx";
import {WalletLayout} from "./routes/wallet._layout.tsx";
import {Settings} from "./routes/settings.tsx";
import {SettingsSecurity} from "./routes/settings.security.tsx";
import {SettingsDeveloper} from "./routes/settings.developer.tsx";
import {SettingsAccount} from "./routes/settings.account.tsx";
import {Notifications} from "./routes/notifications.tsx";
import {MintlayerProvider} from "./context/Mintlayer.tsx";
import {EncryptionKeyProvider} from "./context/EncryptionKey.tsx";
import {
  getAllAccounts,
  // getAllAccounts,
  getState,
  setupDatabase
} from "./lib/storage/database.ts";
import {DatabaseProvider} from "./context/Database.tsx";
import Login from "./routes/login.tsx";
import ProtectedRoute from "./routes/protected.tsx";
// import {NetworkProvider} from "./context/Network.tsx";

const mainLoader = async () => {
  const db = await setupDatabase();
  const onboardingComplete = await getState(db, 'onboardingComplete');
  const accounts = await getAllAccounts(db);
  const firstRun = accounts.length === 0;

  if (!onboardingComplete) {
    throw redirect('/onboarding');
  }

  return { db, firstRun }; // Передаем базу данных в компонент
};

const onboardingLoader = async () => {
  const db = await setupDatabase();
  const onboardingComplete = await getState(db, 'onboardingComplete');

  if (onboardingComplete) {
    throw redirect('/');
  }

  return db;
};

const startLoader = async () => {
  const db = await setupDatabase();
  // const accounts = await getAllAccounts(db);

  // if (accounts.length > 0) {
  //   throw redirect('/');
  // }

  return db;
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
    loader: mainLoader,
  },
  {
    path: '/onboarding',
    element: <Onboarding />,
    loader: onboardingLoader,
  },
  {
    path: '/start',
    element: <Start />,
    loader: startLoader,
  },
  {
    path: "/account",
    children: [
      {
        path: 'create',
        element: <AccountCreate />,
      },
      {
        path: 'import',
        element: <AccountImport />,
      }
    ],
  },
  {
    path: "/wallet",
    element: <ProtectedRoute />,
    children: [
      {
        path: '/wallet',
        element: <WalletLayout />,
        children: [
          {
            index: true,
            element: <WalletMain />,
          },
          {
            path: 'pools',
            element: <WalletPools />,
            children: [
              {
                path: ':poolId',
                element: <WalletPoolDetails />,
              }
            ],
          },
          {
            path: 'send',
            element: <WalletSend />,
          },
          {
            path: 'dex',
            element: <WalletDex />,
          },
          {
            path: 'activity',
            element: <WalletActivity />,
          }
        ],
      },
    ]
  },
  {
    path: "/settings",
    element: <ProtectedRoute />,
    children: [
      {
        path: '/settings',
        // element: <Settings />,
        children: [
          {
            index: true,
            element: <Settings />,
          },
          {
            path: 'security',
            element: <SettingsSecurity />,
          },
          {
            path: 'developer',
            element: <SettingsDeveloper />,
          },
          {
            path: 'account',
            element: <SettingsAccount />,
          }
        ],
      }
    ]
  },
  {
    path: "/notifications",
    element: <ProtectedRoute />,
    children: [
      {
        path: '/notifications',
        element: <Notifications />,
      }
    ]
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EncryptionKeyProvider>
      <DatabaseProvider>
        <MintlayerProvider>
          {/*<NetworkProvider>*/}
            <TelegramProvider>
              <RouterProvider router={router} />
            </TelegramProvider>
          {/*</NetworkProvider>*/}
        </MintlayerProvider>
      </DatabaseProvider>
    </EncryptionKeyProvider>
  </StrictMode>,
)
