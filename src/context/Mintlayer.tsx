// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {createContext, useEffect, useState, useContext} from 'react';
import * as mintlayer from "../lib/mintlayer/wasm_wrappers";
import {
  getNetwork,
  loadWallets,
  getState,
  getTransactionsByWallet,
  removeOneTransaction,
  cleanupOldPendingTransactions,
  updateTransactionConfirmations,
  removeConfirmedTransactions,
  getPendingTransactionsCount
} from "../lib/storage/database.ts";
import {useDatabase} from "../context/Database.tsx";
import {useEncryptionKey} from "../context/EncryptionKey.tsx";
import {txToActivity} from "../lib/mintlayer/helpers.ts";

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

  const [chainHeight, setChainHeight] = useState(0);
  const [lastBlockTime, setLastBlockTime] = useState(0);

  const [utxos, setUtxos] = useState([]);
  const [delegations, setDelegations] = useState([]);

  const [network, setNetwork] = useState(null);

  const wallet = wallets[selectedWallet];

  const [pendingTransactions, setPendingTransactions] = useState([]);

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const ws = new WebSocket('wss://api.mintini.app/ws');
    ws.onopen = () => {
      ws.send(JSON.stringify({ event: 'setNetwork', network: network === 1 ? 'testnet' : 'mainnet' }));
    }
    ws.onerror = (error) => {
      console.error(error);
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if(data.event === 'blockHeight') {
        setChainHeight(data.height);
        setLastBlockTime(new Date());
      }
    }
    setSocket(ws);
  }, []);

  useEffect(() => {
    socket?.send(JSON.stringify({ event: 'setNetwork', network: network === 1 ? 'testnet' : 'mainnet' }));
  }, [network]);

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

  const reloadWallet = async () => {
    const walletId = wallets[selectedWallet].id;
    const loadedWallets = await loadWallets(db, password);
    setWallets(loadedWallets);

    const index = loadedWallets.findIndex(wallet => wallet.id === walletId);
    if(index !== -1) {
      setSelectedWallet(index);
    } else {
      setSelectedWallet(0);
    }
  }

  const getPendingTransactions = async () => {
    const data = await getTransactionsByWallet(db, wallet.id);
    setPendingTransactions(data);
  }

  // Transaction cleanup functions
  const cleanupOldTransactions = async (maxAgeHours = 24) => {
    if (!wallet?.id || !db) return 0;
    const removedCount = await cleanupOldPendingTransactions(db, wallet.id, maxAgeHours);
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old pending transactions`);
      await getPendingTransactions(); // Refresh pending transactions
    }
    return removedCount;
  }

  const cleanupConfirmedTransactions = async () => {
    if (!wallet?.id || !db) return 0;
    const removedCount = await removeConfirmedTransactions(db, wallet.id);
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} confirmed transactions`);
      await getPendingTransactions(); // Refresh pending transactions
    }
    return removedCount;
  }

  const forceRemoveTransaction = async (txId) => {
    if (!db) return;
    await removeOneTransaction(db, txId);
    await getPendingTransactions(); // Refresh pending transactions
    console.log(`Force removed transaction: ${txId}`);
  }

  const checkTransactionStatus = async (txId) => {
    if (!addresses.length) return null;
    try {
      const response = await fetch(`https://api.mintini.app/batch_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: '/transaction/:txid',
          ids: [txId],
          network
        })
      });
      const data = await response.json();
      return data.results?.[0] || null;
    } catch (error) {
      console.error('Error checking transaction status:', error);
      return null;
    }
  }

  const updatePendingTransactionStatuses = async () => {
    if (!wallet?.id || !db || !pendingTransactions.length) return;

    let updatedCount = 0;
    for (const tx of pendingTransactions) {
      const status = await checkTransactionStatus(tx.id);
      if (status && status.confirmations) {
        await updateTransactionConfirmations(db, tx.id, status.confirmations);
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} transaction confirmations`);
      await getPendingTransactions(); // Refresh pending transactions
    }
    return updatedCount;
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

    // filter out HTLC
    data.utxos = data.utxos.filter((utxo) => {
      return utxo.utxo.type !== 'Htlc';
    });

    setUtxos(data.utxos);
    setDelegations(data.delegations);
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
    if(!ml) return;
    if(!password) return;
    getWallets();
  }, [ml, password]);

  useEffect(() => {
    if(!wallet) return;
    getAddresses();
    getPendingTransactions();

    // Auto-cleanup old transactions when wallet loads or chain height changes
    cleanupOldTransactions(24); // Remove transactions older than 24 hours
  }, [
    selectedWallet,
    network,
    chainHeight, // update if chain height changed
  ]);

  const refreshAccount = () => {
    getAddresses();
    getPendingTransactions();
  }

  useEffect(() => {
    getAccount();
    //getTokens();
    //getUtxos();
  }, [addresses]);

  // Periodic cleanup and status updates
  useEffect(() => {
    if (!wallet?.id || !db) return;

    const interval = setInterval(async () => {
      // Check for transaction status updates every 2 minutes
      await updatePendingTransactionStatuses();
      // Clean up confirmed transactions
      await cleanupConfirmedTransactions();
    }, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [wallet?.id, db, pendingTransactions.length]);

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

  const pendingUtxos = pendingTransactions.reduce((acc, tx) => {
    const matchingUtxos = tx.outputs.reduce((utxos, output, index) => {
      if (addresses.includes(output.destination)) {
        utxos.push({
          outpoint: {
            source_id: tx.id,
            index: index,
          },
          utxo: output,
        });
      }
      return utxos;
    }, []);
    return acc.concat(matchingUtxos);
  }, []);

  const usedUtxos = pendingTransactions.map(tx => tx.inputs).flat();

  const cutUsedUtxos = (utxo) => {
    if(!utxo) return false;
    for (let i = 0; i < usedUtxos.length; i++) {
      if(!usedUtxos[i].outpoint) return true;
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
    chainHeight,

    delegations,
    lastBlockTime,
    reloadWallet,

    // Transaction cleanup functions
    pendingTransactions,
    cleanupOldTransactions,
    cleanupConfirmedTransactions,
    forceRemoveTransaction,
    checkTransactionStatus,
    updatePendingTransactionStatuses,
  }

  return (
    <MintlayerContext.Provider value={value}>
      {children}
    </MintlayerContext.Provider>
  );
};
