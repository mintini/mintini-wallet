import { useState} from 'react';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { loadWallets } from '../lib/storage/database';
import { useEncryptionKey } from "../context/EncryptionKey.tsx";

const Login = () => {
  const { db, firstRun } = useLoaderData();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { setEncryptionKey } = useEncryptionKey();
  const [confirm, setConfirm] = useState('');
  const [confirmMode, setConfirmMode] = useState(false);

  const isFirstRun = firstRun;

  const handleLogin = async () => {
    if (isFirstRun && confirm === '') {
      setConfirmMode(true);
      return;
    }

    if(isFirstRun && confirm !== password) {
      setError('PIN codes do not match');
      return;
    }

    if (password.length < 4) {
      setError('The password must be at least 4 characters long');
      return;
    }

    try {
      if (!db) {
        setError('The database is unavailable');
        return;
      }

      setEncryptionKey(password);
      const wallets = await loadWallets(db, password);

      if (wallets.length === 0) {
        navigate('/start');
      } else {
        navigate('/wallet');
      }
    } catch (error) {
      setError('Error loading wallets or invalid key');
    }
  };

  const handleKeyPress = (key: number) => {
    setError('');
    if (confirmMode) {
      if (confirm.length < 9) {
        setConfirm((prev) => prev + key);
      }
    } else {
      if (password.length < 9) {
        setPassword((prev) => prev + key);
      }
    }
  };

  const handleBackspace = () => {
    if (confirmMode) {
      setConfirm((prev) => prev.slice(0, -1));
    } else {
      setPassword((prev) => prev.slice(0, -1));
    }
  };

  const canEnter = confirmMode ? confirm.length >= 4 : password.length >= 4;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-mint-light">

      {
        isFirstRun && (
          <div>
            <div className="px-4 text-normal bg-white rounded-2xl mx-10 py-2 mb-10 text-black">
              <p className="text-center">First you need to create a <b>PIN code</b>.
                This code will be used to encrypt your data.</p>
              <p className="mt-1 text-center">Please remember it!</p>
            </div>
          </div>
        )
      }

      {error && <div className="relative w-full text-center"><p className="w-full absolute -mt-5 text-center text-red-500 mb-4">{error}</p></div>}
      <div className="mb-6">
        {
          isFirstRun && confirmMode ? (
            <input
              type="password"
              value={confirm}
              readOnly
              placeholder="Confirm PIN"
              className="w-48 text-center text-mint text-3xl p-2 border-2 border-transparent rounded-3xl bg-transparent placeholder:text-mint"
            />
          ) : <></>
        }
        {
          !isFirstRun || !confirmMode ? (
            <input
              type="password"
              value={password}
              readOnly
              placeholder="Enter PIN"
              className="w-48 text-center text-mint text-3xl p-2 border-2 border-transparent rounded-3xl bg-transparent placeholder:text-mint"
            />
          ) : <></>
        }
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            className={`w-20 h-20 bg-mint text-white text-2xl font-bold rounded-full hover:bg-mint-dark ${key === 0 ? 'col-start-2' : ''}`}
          >
            {key}
          </button>
        ))}
        <button
          onClick={handleBackspace}
          className={`px-4 py-2 bg-red-500 text-white text-lg font-bold rounded-full hover:bg-red-600`}
        >
          ⌫
        </button>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={handleLogin}
          disabled={!canEnter}
          className={`px-10 py-5 text-lg font-bold rounded-full ${
            canEnter
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-200 text-gray-700 cursor-not-allowed'
          }`}
        >
          Enter
        </button>
      </div>
    </div>
  );
};

export default Login;
