// @ts-nocheck
import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {useTelegram} from "../context/Telegram.tsx";
import {useDatabase} from "../context/Database.tsx";
import {useMintlayer} from "../context/Mintlayer.tsx";
import {changeAccountAvatar, changeAccountName, deleteAccount} from "../lib/storage/database.ts";

const EMOJI = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😭', '😢', '😥', '😰', '😨', '😱', '😠', '😡', '🤬', '🤯',
  '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😷',
  '🤒', '🤕', '🤢', '🤮', '🤧', '😇', '🤠', '🤡', '🥳', '🥴', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮',
];

export const SettingsAccount = () => {
  const { telegram } = useTelegram();
  const { db } = useDatabase();
  const navigate = useNavigate();
  const [ revealConfirm, setRevealConfirm ] = useState(false);
  const [ seedPhrase, setSeedPhrase ] = useState('');
  const { wallet, reloadWallet, selectWallet, getWallets } = useMintlayer();

  const [ formChangeName, setFormChangeName ] = useState(false);
  const [ newName, setNewName ] = useState(wallet.name);
  const [ newAvatar, setNewAvatar ] = useState(wallet.avatar);
  const [ formChangeAvatar, setFormChangeAvatar ] = useState(false);

  const [ formConfirmDelete, setFormConfirmDelete ] = useState(false);

  const handleRevealSeedPhrase = () => {
    if(revealConfirm) {
      setSeedPhrase(wallet.seedPhrase);
    } else {
      setRevealConfirm(true);
    }
  }

  const handleSaveName = async () => {
    setFormChangeName(false);
    if(!newName) {
      return;
    };
    await changeAccountName(db, wallet.id, newName);
    reloadWallet();
  };

  const handleSaveAvatar = async () => {
    setFormChangeAvatar(false);
    if(!newAvatar) {
      return;
    };
    await changeAccountAvatar(db, wallet.id, newAvatar);
    reloadWallet();
  };


  useEffect(() => {
    if (telegram) {
      telegram.BackButton.show();
      telegram.BackButton.onClick(() => {
        navigate('/wallet');
      });
    }
  }, []);

  const handleDeleteAccount = async () => {
    setFormConfirmDelete(false);
    await deleteAccount(db, wallet.id);
    await getWallets();
    selectWallet(0);
    navigate('/wallet');
  }

  console.log('wallet', wallet);

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
                {wallet.avatar}
              </div>
            ) : (
              <div className="bg-white uppercase h-20 w-20 rounded-full flex items-center justify-center text-3xl">
                {wallet.name[0]}
              </div>
            )
          }
          <div onClick={()=>setFormChangeAvatar(true)} className="absolute bg-white border-mint-light border-2 rounded-full w-8 h-8 right-0 bottom-0 flex items-center justify-center">
            ✎
          </div>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">
        <div>
          <div onClick={() => setFormChangeName(true)} className="w-full border-mint border-2 py-3 rounded-2xl text-left px-4 justify-between flex">
            <div className="font-bold">Account name</div>
            <div className="max-w-48 overflow-hidden text-nowrap text-ellipsis">{wallet.name}</div>
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
          <button onClick={()=>setFormConfirmDelete(true)} className="w-full border-red-500 text-red-500 border-2 py-3 rounded-2xl text-left px-4">
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

        {formChangeAvatar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg">
              <h2 className="text-xl mb-4">Change Account Avatar</h2>
              <input
                type="text"
                value={newAvatar}
                onChange={(e) => setNewAvatar(e.target.value)}
                className="border p-2 mb-4 text-2xl text-center w-20 mx-auto block rounded-2xl"
                placeholder="Enter new name"
              />
              <div className="h-52 overflow-scroll my-2">
                {
                  EMOJI.map((emoji, index) => (
                    <div
                      key={index}
                      onClick={() => setNewAvatar(emoji)}
                      className="cursor-pointer inline-block p-2 w-8 h-8 text-2xl m-2"
                    >
                      {emoji}
                    </div>
                  ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setFormChangeAvatar(false)}
                  className="bg-gray-300 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAvatar}
                  className="bg-mint px-4 py-2 rounded"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {
          formConfirmDelete && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-4 rounded-lg">
                <h2 className="text-xl mb-4">Delete Account</h2>
                <div className="mb-4">
                  You can restore your account with the seed phrase. Are you sure you want to delete this account?
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setFormConfirmDelete(false)}
                    className="bg-gray-300 px-4 py-2 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="bg-red-500 px-4 py-2 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )
        }

      </div>
    </div>
  )
}
