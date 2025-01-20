// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {createContext, useEffect, useState, useContext} from 'react';

type Telegram = {
  ready: () => void;
  expand: () => void;
  setHeaderColor: (color: string) => void;
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void
  },
  initDataUnsafe: {
    user: string;
    start_param: string;
  };
}

declare global {
  interface Window {
    Telegram: {
      WebApp: Telegram;
    };
  }
}

type TelegramContextType = {
  telegram: Telegram;
  user: string;
  startParams: string;
}

export const TelegramContext = createContext<TelegramContextType>({});

export const useTelegram = () => {
  const context = useContext(TelegramContext);
  if (context === undefined) {
    throw new Error('useTelegram must be used within a TelegramProvider');
  }
  return context;
}

export const TelegramProvider  = ({ children }) => {
  const [telegram, setTelegram] = useState(null);
  const [user, setUser] = useState(null);
  const [startParams, setStartParams] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window?.Telegram?.WebApp) {
      const tg = window?.Telegram?.WebApp;
      tg.ready();
      tg.expand();
      setTelegram(tg);
      tg.setHeaderColor("#DFF8E1");
      setUser(tg.initDataUnsafe?.user);
      setStartParams(tg.initDataUnsafe?.start_param);
    }
  }, []);

  return (
    <TelegramContext.Provider value={{ telegram, user, startParams }}>
      {children}
    </TelegramContext.Provider>
  );
};
