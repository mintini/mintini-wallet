// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {createContext, useEffect, useState, useContext} from 'react';
import * as mintlayer from "../lib/mintlayer/wasm_wrappers";
import {
  getNetwork,
  loadWallets,
  getState,
  getTransactionsByWallet,
  removeOneTransaction
} from "../lib/storage/database.ts";
import {useDatabase} from "../context/Database.tsx";
import {useEncryptionKey} from "../context/EncryptionKey.tsx";

const WALLET_API = 'https://api.mintini.app';

export const MintlayerContext = createContext<TelegramContextType>({});

export const useMintlayer = () => {
  const context = useContext(MintlayerContext);
  if (context === undefined) {
    throw new Error('useMintlayer must be used within a MintlayerProvider');
  }
  return context;
}

export const MintlayerProvider  = ({ children }) => {
  const [ml, setMl] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const { db } = useDatabase();
  const { encryptionKey: password } = useEncryptionKey();

  const [addresses, setAddresses] = useState([]);
  const [privateKeys, setPrivateKeys] = useState({});
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet ] = useState(0);

  const [tokens, setTokens] = useState([]);
  const [tokensLoading, setTokensLoading] = useState(false);

  const [utxos, setUtxos] = useState([]);

  const [network, setNetwork] = useState(null);

  const wallet = wallets[selectedWallet];

  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [activity, setActivity] = useState([]);

  const changeNetwork = (newNetwork) => {
    setNetwork(newNetwork === 'testnet' ? ml.Network.Testnet : ml.Network.Mainnet);
  }

  const getWallets = async () => {
    const loadedWallets = await loadWallets(db, password);
    setWallets(loadedWallets);

    const getLastOpenedWallet = await getState(db, 'lastOpenedWallet');
    if(getLastOpenedWallet) {
      const index = loadedWallets.findIndex(wallet => wallet.id === getLastOpenedWallet);
      if(index !== -1) {
        setSelectedWallet(index);
      } else {
        setSelectedWallet(0);
      }
    } else {
      setSelectedWallet(0);
    }
  }

  const getPendingTransactions = async () => {
    const data = await getTransactionsByWallet(db, wallet.id);
    setPendingTransactions(data);
  }

  useEffect(() => {
    if(!wallets.length) return;
    if(!db) return;
    getNetwork(db).then((value)=>{
      setNetwork(value === 'testnet' ? ml.Network.Testnet : ml.Network.Mainnet);
    });
  }, [ml, db, wallets]);

  const getAccount = async () => {
    if(!addresses.length) return;
    setTokensLoading(true);
    const response = await fetch(WALLET_API + '/account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ addresses, network })
    });
    const data = await response.json();
    setTokens(data.tokens);
    setTokensLoading(false);
    setUtxos(data.utxos);
  }

  const getActivity = async () => {
    if(!addresses.length) return;
    setTokensLoading(true);
    const response = await fetch(WALLET_API + '/activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ addresses, network })
    });
    const data = await response.json();
    setActivity(data);
  }

  const getAddresses = () => {
    const seed = wallets[selectedWallet].seedPhrase;
    const walletAddresses = [];
    const walletAddressesPrivKeys = {};
    if(!seed) {
      return [];
    }

    const priv_key = ml.make_default_account_privkey(seed, network);

    if(!seed || !priv_key) {
      return [];
    }

    for (let i = 0; i < 20; i++) {
      const index_key = i;
      const receiving_address_private_key = ml.make_receiving_address(
        priv_key, index_key
      );
      const change_address_private_key = ml.make_change_address(
        priv_key, index_key
      );
      const receiving_address =
        ml.pubkey_to_pubkeyhash_address(
          ml.public_key_from_private_key(receiving_address_private_key), network
        );
      const change_address =
        ml.pubkey_to_pubkeyhash_address(
          ml.public_key_from_private_key(change_address_private_key), network
        );
      walletAddresses.push(receiving_address);
      walletAddresses.push(change_address);
      walletAddressesPrivKeys[receiving_address] = receiving_address_private_key;
      walletAddressesPrivKeys[change_address] = change_address_private_key;
    }

    setPrivateKeys(walletAddressesPrivKeys);
    setAddresses(walletAddresses);
  }

  useEffect(() => {
    if(!activity) return;
    // find tx from activity and remove from database
    setPendingTransactions(pendingTransactions.filter(tx => !activity.find(a => a.txid === tx.id)));
    // clean from database
    activity.forEach(async (tx) => {
      await removeOneTransaction(db, tx.txid);
    });
  }, [activity]);

  useEffect(() => {
    if(!ml) return;
    if(!password) return;
    getWallets();
  }, [ml, password]);

  useEffect(() => {
    if(!wallet) return;
    getAddresses();
    getActivity();
    getPendingTransactions();
  }, [selectedWallet, network]);

  const refreshAccount = () => {
    getAddresses();
    getActivity();
    getPendingTransactions();
  }

  useEffect(() => {
    getAccount();
    //getTokens();
    //getUtxos();
  }, [addresses]);

  useEffect(() => {
    if(initialized) return;
    const loadWasm = async () => {
      const file = await fetch('/wasm_wrappers_bg.wasm');
      const arrayBuffer = await file.arrayBuffer();
      mintlayer.initSync(arrayBuffer);
      setInitialized(true);
      setMl(mintlayer);
    }
    loadWasm();
  }, []);

  const pendingUtxos = [];

  pendingTransactions.forEach(tx => {
    tx.outputs.forEach((output, index) => {
      if(addresses.includes(output.destination)) {
        pendingUtxos.push({
          outpoint: {
            source_id: tx.id,
            index: index,
          },
          utxo: output,
        });
      }
    });
  })

  const usedUtxos = pendingTransactions.map(tx => tx.inputs).flat();

  const cutUsedUtxos = (utxo) => {
    for (let i = 0; i < usedUtxos.length; i++) {
      if(
        usedUtxos[i].outpoint.source_id === utxo.outpoint.source_id &&
        usedUtxos[i].outpoint.index === utxo.outpoint.index
      ) {
        return false;
      }
    }
    return true;
  };

  const value = {
    ml,
    addresses,
    wallet,
    wallets,
    getWallets,
    selectWallet: setSelectedWallet,
    // todo match to wallet
    tokens,
    tokensLoading,
    utxos: [
      ...utxos.filter(cutUsedUtxos),
      ...pendingUtxos.filter(cutUsedUtxos),
    ],
    network,
    changeNetwork,
    isTestnet: network === 1,

    addressesPrivateKeys: privateKeys,
    refreshAccount,
  }

  return (
    <MintlayerContext.Provider value={value}>
      {children}
    </MintlayerContext.Provider>
  );
};
