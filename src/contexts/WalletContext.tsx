import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  QORECHAIN_CHAIN_ID,
  ensureQoreChainNetwork,
  evmAddressToQorBech32
} from '../services/qorechainPqcService';

export interface WalletContextValue {
  address: string | null;
  chainId: number | null;
  isQoreChain: boolean;
  isSepolia: boolean;
  qorBech32Address: string | null;
  isSwitchingNetwork: boolean;
  networkError: string | null;
  setManualAddress: (addr: string | null) => void;
  syncWalletState: () => Promise<void>;
  switchToQoreChain: () => Promise<boolean>;
  ensureQoreChain: () => Promise<boolean>;
  switchToSepolia: () => Promise<boolean>;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  chainId: null,
  isQoreChain: false,
  isSepolia: false,
  qorBech32Address: null,
  isSwitchingNetwork: false,
  networkError: null,
  setManualAddress: () => {},
  syncWalletState: async () => {},
  switchToQoreChain: async () => false,
  ensureQoreChain: async () => false,
  switchToSepolia: async () => false
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const syncWalletState = useCallback(async () => {
    const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (!eth) return;
    try {
      const [accounts, hexChain] = await Promise.all([
        eth.request({ method: 'eth_accounts' }).catch(() => []),
        eth.request({ method: 'eth_chainId' }).catch(() => null)
      ]);
      if (hexChain) {
        setChainId(parseInt(hexChain, 16));
      }
      if (Array.isArray(accounts) && accounts.length > 0 && !localStorage.getItem('trex_wallet_disconnected')) {
        setAddress(accounts[0]);
      }
    } catch {
      // Ignore silent provider query issues
    }
  }, []);

  useEffect(() => {
    const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (!eth) return;

    eth.request({ method: 'eth_chainId' })
      .then((hex: string) => {
        if (hex) setChainId(parseInt(hex, 16));
      })
      .catch(() => {});

    const onAccountsChanged = (accounts: string[]) => {
      if (Array.isArray(accounts) && accounts.length > 0 && !localStorage.getItem('trex_wallet_disconnected')) {
        setAddress(accounts[0]);
      } else {
        setAddress(null);
      }
    };

    const onChainChanged = (hex: string) => {
      if (hex) setChainId(parseInt(hex, 16));
    };

    const onCustomSync = (ev: any) => {
      if (ev?.detail && 'address' in ev.detail) {
        setAddress(ev.detail.address || null);
      }
      syncWalletState();
    };

    eth.on?.('accountsChanged', onAccountsChanged);
    eth.on?.('chainChanged', onChainChanged);
    window.addEventListener('trex-wallet-changed', onCustomSync);

    return () => {
      eth.removeListener?.('accountsChanged', onAccountsChanged);
      eth.removeListener?.('chainChanged', onChainChanged);
      window.removeEventListener('trex-wallet-changed', onCustomSync);
    };
  }, [syncWalletState]);

  const switchToQoreChain = useCallback(async (): Promise<boolean> => {
    setIsSwitchingNetwork(true);
    setNetworkError(null);
    try {
      const switchedId = await ensureQoreChainNetwork();
      setChainId(switchedId);
      await syncWalletState();
      return switchedId === QORECHAIN_CHAIN_ID;
    } catch (err: any) {
      setNetworkError(err?.message || 'Failed to switch wallet to QoreChain Diana (Chain ID 9800).');
      return false;
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, [syncWalletState]);

  const switchToSepolia = useCallback(async (): Promise<boolean> => {
    const eth = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (!eth) return false;
    setIsSwitchingNetwork(true);
    setNetworkError(null);
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }]
      });
      setChainId(11155111);
      return true;
    } catch (err: any) {
      if (err?.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xaa36a7',
            chainName: 'Ethereum Sepolia',
            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }]
        });
        setChainId(11155111);
        return true;
      }
      setNetworkError(err?.message || 'Failed to switch wallet to Ethereum Sepolia.');
      return false;
    } finally {
      setIsSwitchingNetwork(false);
    }
  }, []);

  const qorBech32Address = address ? evmAddressToQorBech32(address) : null;

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isQoreChain: chainId === QORECHAIN_CHAIN_ID,
        isSepolia: chainId === 11155111,
        qorBech32Address,
        isSwitchingNetwork,
        networkError,
        setManualAddress: setAddress,
        syncWalletState,
        switchToQoreChain,
        ensureQoreChain: switchToQoreChain,
        switchToSepolia
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export function useWalletContext(): WalletContextValue {
  return useContext(WalletContext);
}
