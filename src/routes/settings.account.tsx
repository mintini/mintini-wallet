// @ts-nocheck
import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useDatabase} from "../context/Database.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {changeAccountName} from "../lib/storage/database.ts";

export const SettingsAccount = () => {
  const { telegram } = useTelegram();
  const { db } = useDatabase();
  const navigate = useNavigate();
  const [ revealConfirm, setRevealConfirm ] = useState(false);
  const [ seedPhrase, setSeedPhrase ] = useState('');
  const { wallet } = useMintlayer();

  const [ formChangeName, setFormChangeName ] = useState(false);
  const [ newName, setNewName ] = useState(wallet.name);

  const [ formChangeAvatar, setFormChangeAvatar ] = useState(false);

  const handleRevealSeedPhrase = () => {
    if(revealConfirm) {
      setSeedPhrase(wallet.seedPhrase);
    } else {
      setRevealConfirm(true);
    }
  }

  const handleSaveName = () => {
    setFormChangeName(false);
    if(!newName) {
      return;
    };
    changeAccountName(db, wallet.id, newName);
  };


  useEffect(() => {
    if (telegram) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(() => {
        navigate('/wallet');
      });
    }
  }, []);

  return (
    <div className="bg-mint-light w-full h-full">
      <div className="bg-mint h-16 flex flex-row items-center justify-between px-4">
        <Link to="/settings" className="w-12 h-10 flex items-center justify-center rounded-2xl font-thin text-3xl">
          ←
        </Link>
        <div className="flex flex-row w-full text-center gap-2 justify-center text-2xl font-thin">
          <div>
            Settings - Account
          </div>
        </div>
      </div>

      <div className="py-4 flex items-center justify-center relative">
        <div className="p-1 flex items-center justify-center relative">
          {
            wallet.avatar ? (
              <div className="bg-white h-20 w-20 rounded-full flex items-center justify-center text-3xl">
                A
              </div>
            ) : (
              <div className="bg-white uppercase h-20 w-20 rounded-full flex items-center justify-center text-3xl">
                {wallet.name[0]}
              </div>
            )
          }
          <div className="absolute bg-white border-mint-light border-2 rounded-full w-8 h-8 right-0 bottom-0 flex items-center justify-center">
            ✎
          </div>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          <div onClick={() => setFormChangeName(true)} className="w-full border-mint border-2 py-3 rounded-2xl text-left px-4 justify-between flex">
            <div>Account name</div>
            <div>{wallet.name}</div>
          </div>
        </div>

        {
          !seedPhrase && (
            <div>
              <div onClick={handleRevealSeedPhrase} className="border-mint border-2 px-4 py-3 rounded-2xl">
                {
                  revealConfirm ? 'I understand that nobody should see this except me. Reveal seed phrase.' : 'Reveal seed phrase'
                }
              </div>
            </div>
          )
        }
        {seedPhrase && revealConfirm && (
          <ul className="grid grid-cols-3 gap-2">
            {seedPhrase.split(' ').map((word: string, index: number) => (
              <li key={index}
                  className="border-mint border-2 px-4 py-2 rounded-2xl list-decimal list-inside">{word}</li>
            ))}
          </ul>
        )}

        <div>
          <button className="w-full border-red-500 text-red-500 border-2 py-3 rounded-2xl text-left px-4">
            Delete account
          </button>
        </div>


        {formChangeName && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg">
              <h2 className="text-xl mb-4">Change Account Name</h2>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="border p-2 mb-4 w-full"
                placeholder="Enter new name"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setFormChangeName(false)}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveName}
                  className="bg-mint px-4 py-2 rounded"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
