import { ZamaFheVaultPage } from './ZamaFheVaultPage';
import { ReputationScanner } from './ReputationScanner';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrowserProvider, JsonRpcProvider, Contract, getAddress, formatEther } from 'ethers';
import { TOKEN_ADDRESS, TOKEN_ABI } from '../lib/contracts';
import { 
  X, Shield, Fingerprint, Activity, ChevronRight, Award, 
  ShieldCheck, Database, Zap, Globe, Clock, ArrowRight, ExternalLink, CheckCircle2, AlertTriangle
} from 'lucide-react';

import { analyzeWalletReputation } from '../services/geminiService';
import { markAsMinted, markAsRegistered } from '../services/reputationService';
import { ReputationScore } from '../types';

import { Navigation } from './Navigation';
import { DiagnosticsPage } from './DiagnosticsPage';
import { RegistryPage } from './RegistryPage';
import { DeveloperPage } from './DeveloperPage';
import { TrexDocsModal } from './TrexDocsModal';
import { ScoringModelModal } from './ScoringModelModal';
import { LiveAuditTerminalModal } from './LiveAuditTerminalModal';
import { InstitutionalJourneyRunner } from './InstitutionalJourneyRunner';
import { IdentityRegistryPage } from './IdentityRegistryPage';
import { TrustedIssuersPage } from './TrustedIssuersPage';
import { AssetTokenMatrixPage } from './AssetTokenMatrixPage';
import { OnchainIDProfilePage } from './OnchainIDProfilePage';
import { OverseerPage } from './OverseerPage';
import { InvestorPortalPage } from './InvestorPortalPage';
import { InvestorTransferPortal } from './InvestorTransferPortal';
import { DocsPage } from './DocsPage';
import { PitchDeckPage } from './PitchDeckPage';
import { ApiPricingPage } from './ApiPricingPage';
import { AttestationsPage } from './AttestationsPage';
import { ContractsPage } from './ContractsPage';
import { SiteFooter } from './SiteFooter';

export const MainApp = () => {
  // Map pathnames to pages and vice-versa
  const pathToPage = (pathname: string): 'DIAGNOSTICS' | 'IDENTITY_REGISTRY' | 'TRUSTED_ISSUERS' | 'ASSET_MATRIX' | 'REGISTRY' | 'DEVELOPER' | 'OVERSEER' | 'INVESTOR_PORTAL' | 'DOCS' | 'PITCH_DECK' | 'API_PRICING' | 'ATTESTATIONS' | 'CONTRACTS' | 'REPUTATION_SCANNER' | 'ZAMA_FHE' => {
    const p = pathname.toLowerCase().replace(/^\/+/, '').replace(/\/+$/, '');
    if (p === 'issuers' || p === 'trusted-issuers' || p === 'trustedissuers') return 'TRUSTED_ISSUERS';
    if (p === 'assets' || p === 'asset-matrix' || p === 'assetmatrix') return 'ASSET_MATRIX';
    if (p === 'identity' || p === 'identity-registry' || p === 'identityregistry') return 'IDENTITY_REGISTRY';
    if (p === 'developer' || p === 'dev') return 'DEVELOPER';
    if (p === 'docs' || p === 'documentation') return 'DOCS';
    if (p === 'pitch-deck' || p === 'pitchdeck' || p === 'deck') return 'PITCH_DECK';
    if (p === 'api-pricing' || p === 'apipricing' || p === 'pricing' || p === 'api') return 'API_PRICING';
    if (p === 'attestations' || p === 'claims' || p === 'attestation') return 'ATTESTATIONS';
    if (p === 'contracts' || p === 'contract') return 'CONTRACTS';
    if (p === 'scanner' || p === 'reputationscanner' || p === 'id-scanner') return 'REPUTATION_SCANNER';
    if (p === 'zama' || p === 'fhevm' || p === 'zama-fhe') return 'ZAMA_FHE';
    if (p === 'registry' || p === 'directory') return 'REGISTRY';
    if (p === 'investor-portal' || p === 'investorportal' || p === 'investor') return 'INVESTOR_PORTAL';
    if (p === 'overseer') return 'OVERSEER';
    if (p === 'telemetry' || p === 'diagnostics') return 'DIAGNOSTICS';
    return 'DIAGNOSTICS';
  };

  const pageToPath = (page: string): string => {
    switch (page) {
      case 'TRUSTED_ISSUERS': return '/issuers';
      case 'ASSET_MATRIX': return '/assets';
      case 'IDENTITY_REGISTRY': return '/identity-registry';
      case 'DEVELOPER': return '/developer';
      case 'DOCS': return '/docs';
      case 'PITCH_DECK': return '/pitch-deck';
      case 'API_PRICING': return '/api-pricing';
      case 'ATTESTATIONS': return '/attestations';
      case 'CONTRACTS': return '/contracts';
      case 'REPUTATION_SCANNER': return '/scanner';
      case 'ZAMA_FHE': return '/zama-fhe';
      case 'REGISTRY': return '/registry';
      case 'INVESTOR_PORTAL': return '/investor';
      case 'OVERSEER': return '/overseer';
      default: return '/';
    }
  };

  // Global View Navigation States based on pathname
  const [activePage, setActivePage] = useState<'DIAGNOSTICS' | 'IDENTITY_REGISTRY' | 'TRUSTED_ISSUERS' | 'ASSET_MATRIX' | 'REGISTRY' | 'DEVELOPER' | 'OVERSEER' | 'INVESTOR_PORTAL' | 'DOCS' | 'PITCH_DECK' | 'API_PRICING' | 'ATTESTATIONS' | 'CONTRACTS' | 'REPUTATION_SCANNER' | 'ZAMA_FHE'>(() => {
    try {
      return pathToPage(window.location.pathname);
    } catch (e) {
      return 'DIAGNOSTICS';
    }
  });

  // Listen to browser popstate (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      setActivePage(pathToPage(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync scroll to top and URL history on activePage change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const newPath = pageToPath(activePage);
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, '', newPath);
      }
    } catch (e) {
      console.warn('URL pushState error', e);
    }
  }, [activePage]);

  const handleSelectPage = (page: typeof activePage) => {
    setActivePage(page);
  };
  
  // Scanned / Target Address States
  const [addressInput, setAddressInput] = useState('');
  const [data, setData] = useState<ReputationScore | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Connected Wallet States
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('trex-wallet-changed', { detail: { address: connectedAddress } }));
    } catch {}
  }, [connectedAddress]);

  // On-Chain Sim & Sync States
  const [isRooting, setIsRooting] = useState(false);
  const [rootTxHash, setRootTxHash] = useState<string | null>(null);

  const [protocolHistory, setProtocolHistory] = useState<any[]>([]);

  // Modular Overlay/Modal States
  const [showTrexDocs, setShowTrexDocs] = useState(false);
  const [showScoringModel, setShowScoringModel] = useState(false);
  const [showInstitutionalPortfolio, setShowInstitutionalPortfolio] = useState(false);
  const [showArchitectureWalkthrough, setShowArchitectureWalkthrough] = useState(false);
  const [focusLayerZeroBridge, setFocusLayerZeroBridge] = useState(false);

  // Institutional Persona Tour States
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(1);

  const handleStartTour = () => {
    setConnectedAddress("0x35912ee176f003800ebd1a60819a9df51147cf3a");
    setIsTourActive(true);
    setTourStep(1);
    handleAnalyze("0x35912ee176f003800ebd1a60819a9df51147cf3a", { force: true });
  };

  const handleConnectMasterWallet = () => {
    setConnectedAddress("0x35912ee176f003800ebd1a60819a9df51147cf3a");
    handleAnalyze("0x35912ee176f003800ebd1a60819a9df51147cf3a", { force: true });
  };

  const handleNavigateToLayerZero = () => {
    setFocusLayerZeroBridge(true);
    setActivePage('IDENTITY_REGISTRY');
    setTimeout(() => {
      const bridgeElem = document.getElementById('layerzero-bridge');
      if (bridgeElem) {
        bridgeElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Live Metrics
  const [liveMetrics, setLiveMetrics] = useState<{nativeBalance: string, txCount: string, tokenBalance: string} | null>(null);

  useEffect(() => {
    if (showInstitutionalPortfolio && connectedAddress) {
      const fetchLive = async () => {
        try {
          const { ethereum } = window as any;
          if (ethereum) {
            const provider = new BrowserProvider(ethereum);
            const balance = await provider.getBalance(connectedAddress);
            const txCount = await provider.getTransactionCount(connectedAddress);
            
            let tokenBalance = "0.0";
            if (TOKEN_ADDRESS && TOKEN_ABI) {
                const token = new Contract(TOKEN_ADDRESS, TOKEN_ABI, provider);
                const bal = await token.balanceOf(connectedAddress);
                tokenBalance = parseFloat(formatEther(bal)).toFixed(2);
            }
            
            setLiveMetrics({
                nativeBalance: parseFloat(formatEther(balance)).toFixed(4),
                txCount: txCount.toString(),
                tokenBalance
            });
          }
        } catch(e) {
            console.error("Live fetch error", e);
        }
      };
      fetchLive();
      const interval = setInterval(fetchLive, 10000); // 10s poll
      return () => clearInterval(interval);
    }
  }, [showInstitutionalPortfolio, connectedAddress]);

  // Track protocol events locally & append to consensus log
// Removed deprecated SBT effects

  // General analyze handler calling backend reputation logic
  const handleAnalyze = async (addressToScan: string, options: { force?: boolean } = { force: true }) => {
    if (!addressToScan || !addressToScan.startsWith('0x')) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const registry = urlParams.get('registry') || undefined;
      const issuer = urlParams.get('issuer') || undefined;
      
      const shouldForce = options.force !== false;
      const res = await analyzeWalletReputation(addressToScan, shouldForce, registry, issuer);
      setData(res);
      setAddressInput(addressToScan);
    } catch (e: any) {
      console.error("Analysis telemetry error:", e);
      // Safe extraction of errMsg to ensure no object is stored in state (avoiding React Error #31)
      let errMsg = "An unexpected error occurred during reputation analysis.";
      if (e.response?.data) {
        const data = e.response.data;
        if (typeof data === 'string') {
          errMsg = data;
        } else if (typeof data.message === 'string') {
          errMsg = data.message;
        } else if (typeof data.error === 'string') {
          errMsg = data.error;
        } else if (data.error && typeof data.error === 'object') {
          errMsg = data.error.message || JSON.stringify(data.error);
        } else {
          errMsg = JSON.stringify(data);
        }
      } else {
        errMsg = e.message || errMsg;
      }
      
      if (typeof errMsg !== 'string') {
        errMsg = JSON.stringify(errMsg);
      }
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Wallet starts disconnected on every mount/refresh per user request
  useEffect(() => {
    setConnectedAddress(null);
    try {
      localStorage.removeItem('trex_wallet_disconnected');
      // Wipe stale cached reputation objects and old simulated mint hashes on load
      const CACHE_VERSION = 'v5.1_canonical_clean';
      if (localStorage.getItem('trex_cache_version') !== CACHE_VERSION) {
        Object.keys(localStorage).forEach(key => {
          if (
            key.startsWith('trex_reputation_') || 
            key.startsWith('reputation_') ||
            key.startsWith('trex_confirmed_mint_tx_') ||
            key.startsWith('identityRegTxHash_') ||
            key.startsWith('onchainid_proxy_')
          ) {
            localStorage.removeItem(key);
          }
        });
        localStorage.setItem('trex_cache_version', CACHE_VERSION);
      }
    } catch {}
  }, []);

  // Explicit connected provider execution
  const connectWallet = async (walletType?: 'metamask' | 'coinbase' | 'zerion' | 'rabby') => {
    try {
      try {
        localStorage.removeItem('trex_wallet_disconnected');
      } catch {}
      const { ethereum } = window as any;
      let selectedProvider = null;

      if (walletType === 'zerion' && (window as any).zerionWallet) {
        selectedProvider = (window as any).zerionWallet;
      } else if (walletType === 'rabby' && (window as any).rabby) {
        selectedProvider = (window as any).rabby;
      } else if (walletType === 'coinbase' && (window as any).coinbaseWalletExtension) {
        selectedProvider = (window as any).coinbaseWalletExtension;
      } else if (walletType === 'metamask') {
        if (ethereum?.providers?.length) {
          selectedProvider = ethereum.providers.find((p: any) => p.isMetaMask && !p.isZerion && !p.isRabby);
        } else if (ethereum?.isMetaMask) {
          selectedProvider = ethereum;
        }
      }
      
      // Fallback searches
      if (!selectedProvider && ethereum) {
        if (ethereum.providers?.length) {
          if (walletType === 'coinbase') selectedProvider = ethereum.providers.find((p: any) => p.isCoinbaseWallet || p.isCoinbaseBrowser);
          else if (walletType === 'zerion') selectedProvider = ethereum.providers.find((p: any) => p.isZerion);
          else if (walletType === 'rabby') selectedProvider = ethereum.providers.find((p: any) => p.isRabby);
          else if (walletType === 'metamask') selectedProvider = ethereum.providers.find((p: any) => p.isMetaMask);
        }
        if (!selectedProvider) selectedProvider = ethereum;
      }

      if (!selectedProvider && ethereum) {
        selectedProvider = ethereum;
      }

      if (!selectedProvider) {
        alert("Web3 browser wallet not detected. Please ensure MetaMask or another Web3 extension is installed.");
        return;
      }

      const provider = new BrowserProvider(selectedProvider);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      setConnectedAddress(address);
      setShowWalletModal(false);
      setAddressInput(address);

      // On-Chain Identity Check (Silent read-only check on Canonical IdentityRegistry via dedicated RPC)
      try {
        const CANONICAL_REGISTRY_ADDRESS = "0xc0d9203554F33c46F4e91806bb21b4D0f2622BC0";
        const REGISTRY_ABI = [
          "function isVerified(address _userAddress) view returns (bool)",
          "function identity(address _userAddress) view returns (address)"
        ];
        const rpcProvider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com", 11155111, { staticNetwork: true });
        const registryContract = new Contract(CANONICAL_REGISTRY_ADDRESS, REGISTRY_ABI, rpcProvider);
        const isUserVerified = await registryContract.isVerified(address);
        
        if (isUserVerified) {
          console.log(">> [TREX-OS]: Identity verified on-chain via canonical registry.");
        }
      } catch (checkErr) {
        console.warn(">> [TREX-OS]: On-chain identity check notice.", checkErr);
      }
    } catch (err: any) {
      if (err.code === 4001 || err.info?.error?.code === 4001) {
        console.log("Wallet connection cancelled by user.");
        return;
      }
      console.error("Wallet connectivity failure", err);
    }
  };

  const disconnectWallet = () => {
    try {
      localStorage.setItem('trex_wallet_disconnected', 'true');
    } catch {}
    setConnectedAddress(null);
    setData(null);
    setAddressInput('');
  };

  // Root Identity mapping updates
  const REPUTATION_STORE_ADDRESS = "0x241F65709CD7cA66c8E2789A67f70D7D94eeE02C";

  const ensureSepoliaNetwork = async (ethereum: any) => {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xaa36a7",
              chainName: "Sepolia test network",
              rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
              nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
      } else {
        throw err;
      }
    }
  };

  const rootIdentity = async () => {
    if (!data || isRooting) return;
    
    if (connectedAddress?.toLowerCase() !== data.address.toLowerCase()) {
      setShowWalletModal(true);
      return;
    }
    
    try {
      setIsRooting(true);
      const { ethereum } = window as any;
      if (!ethereum) throw new Error("Web3 Injectable not found");

      await ensureSepoliaNetwork(ethereum);

      const provider = new BrowserProvider(ethereum);
      const signer = await provider.getSigner();

      const abi = [
        "function registerIdentity(address wallet, uint256 clearanceScore) public"
      ];

      const contract = new Contract(getAddress(REPUTATION_STORE_ADDRESS), abi, signer);
      
      const tx = await contract.registerIdentity(getAddress(data.address), Math.floor(data.score));
      setRootTxHash(tx.hash);
      
      await tx.wait();
      await markAsRegistered(data.address);
      setData(prev => prev ? { ...prev, is_registered: true } : null);
      
      setIsRooting(false);
    } catch (err: any) {
      setIsRooting(false);
      console.error("Certified root failure:", err);
    }
  };

  const getTierColor = (tier: string) => {
    const t = (tier || '').toUpperCase();
    if (t.includes('INSTITUTIONAL') || t.includes('EXCEPTIONAL')) {
      return 'text-rex-primary border-rex-primary/40 shadow-[0_0_12px_rgba(0,255,194,0.15)]';
    }
    if (t.includes('ELITE')) {
      return 'text-purple-400 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]';
    }
    if (t.includes('ADVANCED') || t.includes('NEURAL')) {
      return 'text-blue-400 border-blue-500/40';
    }
    if (t.includes('VERIFIED')) {
      return 'text-emerald-400 border-emerald-500/40';
    }
    return 'text-slate-400 border-white/10';
  };

  const handleSelectAddressFromDirectory = (addressSelected: string) => {
    setActivePage('DIAGNOSTICS');
    handleAnalyze(addressSelected);
  };

  return (
    <div className="min-h-screen bg-rex-bg text-white selection:bg-rex-primary selection:text-rex-bg font-sans pb-24 neo-grid">
      {/* Global Navigation Controller */}
      <Navigation
        activePage={activePage}
        setActivePage={handleSelectPage}
        connectedAddress={connectedAddress}
        onConnectClick={() => setShowWalletModal(true)}
        onDisconnect={disconnectWallet}
        onOpenPortfolio={() => setShowInstitutionalPortfolio(true)}
        onOpenDocs={() => setShowTrexDocs(true)}
        onOpenScoring={() => setShowScoringModel(true)}
        onOpenWalkthrough={() => setShowArchitectureWalkthrough(true)}
        onStartTour={handleStartTour}
        onLogoClick={() => {
          handleSelectPage('DIAGNOSTICS');
          setData(null);
          setAddressInput('');
        }}
      />

      {/* Primary Page Layout Views */}
      <main className="max-w-[1280px] mx-auto px-4 md:px-0 mt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, scale: 0.99, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.99, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            {activePage === 'DIAGNOSTICS' && (
              <DiagnosticsPage
                data={data}
                addressInput={addressInput}
                setAddressInput={setAddressInput}
                isLoading={isLoading}
                errorMsg={errorMsg}
                onAnalyze={handleAnalyze}
                connectedAddress={connectedAddress}
                onOpenScoringModel={() => setShowScoringModel(true)}
                onOpenTrexDocs={() => setShowTrexDocs(true)}
                onNavigateToLayerZero={handleNavigateToLayerZero}
                onNavigateToMatrix={() => setActivePage('ASSET_MATRIX')}
                onNavigateToRegistry={() => setActivePage('IDENTITY_REGISTRY')}
                onStartInstitutionalTour={handleStartTour}
                onOpenArchitectureAudit={() => setShowArchitectureWalkthrough(true)}
              />
            )}

            {activePage === 'IDENTITY_REGISTRY' && (
              <IdentityRegistryPage 
                userAddress={connectedAddress || addressInput || ""} 
                complianceScore={
                  connectedAddress?.toLowerCase() === '0x35912ee176f003800ebd1a60819a9df51147cf3a' || addressInput?.toLowerCase() === '0x35912ee176f003800ebd1a60819a9df51147cf3a'
                    ? 98
                    : (data?.score ?? 0)
                }
                focusBridge={focusLayerZeroBridge}
              />
            )}

            {activePage === 'TRUSTED_ISSUERS' && (
              <TrustedIssuersPage />
            )}

            {activePage === 'INVESTOR_PORTAL' && (
              <div className="space-y-10">
                <InvestorTransferPortal 
                  connectedAddress={connectedAddress}
                  onNavigateToRegistry={() => setActivePage('IDENTITY_REGISTRY')}
                  onNavigateToInvestor={() => setActivePage('INVESTOR_PORTAL')}
                />
                <InvestorPortalPage 
                  connectedAddress={connectedAddress} 
                  onConnectClick={() => setShowWalletModal(true)} 
                  onNavigateToMatrix={() => setActivePage('ASSET_MATRIX')}
                />
              </div>
            )}

            {activePage === 'ASSET_MATRIX' && (
              <div className="space-y-10">
                <AssetTokenMatrixPage 
                  connectedAddress={connectedAddress}
                  userWallet={connectedAddress}
                  isVerified={data ? data.score >= 60 : false}
                  hasClaims={true}
                  score={data?.score || 81}
                  onNavigateToRegistry={() => setActivePage('IDENTITY_REGISTRY')}
                />
                <InvestorTransferPortal 
                  connectedAddress={connectedAddress}
                  onNavigateToRegistry={() => setActivePage('IDENTITY_REGISTRY')}
                  onNavigateToInvestor={() => setActivePage('INVESTOR_PORTAL')}
                />
              </div>
            )}

            {activePage === 'REGISTRY' && (
              <RegistryPage
                onSelectAddress={handleSelectAddressFromDirectory}
                userAddress={connectedAddress || undefined}
                userData={data}
                userHistory={protocolHistory}
              />
            )}

            {activePage === 'DEVELOPER' && (
              <DeveloperPage data={data} />
            )}

            {activePage === 'OVERSEER' && (
              <OverseerPage connectedAddress={connectedAddress} />
            )}

            {activePage === 'DOCS' && (
              <DocsPage 
                onOpenIdentityRegistry={() => setActivePage('IDENTITY_REGISTRY')}
                onOpenInvestorPortal={() => setActivePage('INVESTOR_PORTAL')}
                onOpenPitchDeck={() => setActivePage('PITCH_DECK')}
                onOpenWalkthrough={() => setShowArchitectureWalkthrough(true)}
              />
            )}

            {activePage === 'PITCH_DECK' && (
              <PitchDeckPage
                onOpenIdentityRegistry={() => setActivePage('IDENTITY_REGISTRY')}
                onOpenInvestorPortal={() => setActivePage('INVESTOR_PORTAL')}
                onOpenDocs={() => setActivePage('DOCS')}
              />
            )}

            {activePage === 'API_PRICING' && (
              <ApiPricingPage
                data={data}
                onOpenDocs={() => setActivePage('DOCS')}
                onOpenDevelopers={() => setActivePage('DEVELOPER')}
              />
            )}

            {activePage === 'ATTESTATIONS' && (
              <AttestationsPage
                connectedAddress={connectedAddress}
                onConnectClick={() => setShowWalletModal(true)}
                onDisconnect={disconnectWallet}
                onAddressChange={(addr) => setConnectedAddress(addr)}
              />
            )}

            {activePage === 'CONTRACTS' && (
              <ContractsPage />
            )}

            {activePage === 'ZAMA_FHE' && (
              <ZamaFheVaultPage connectedAddress={connectedAddress} />
            )}

            {activePage === 'REPUTATION_SCANNER' && (
              <ReputationScanner connectedAddress={connectedAddress} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Site-wide Institutional Footer */}
      <SiteFooter 
        activePage={activePage}
        onOpenPitchDeck={() => handleSelectPage('PITCH_DECK')}
        onOpenDocs={() => handleSelectPage('DOCS')}
        onOpenScoring={() => setShowScoringModel(true)}
        onNavigateToRegistry={() => handleSelectPage('IDENTITY_REGISTRY')}
        onNavigateToPricing={() => handleSelectPage('API_PRICING')}
      />

      {/* Custom Core Integrations Overlays */}
      
      {/* 1. SDK spec documentation Suite */}
      <TrexDocsModal 
        isOpen={showTrexDocs} 
        onClose={() => setShowTrexDocs(false)} 
        onOpenIdentityRegistry={() => setActivePage('IDENTITY_REGISTRY')}
        onOpenInvestorPortal={() => setActivePage('INVESTOR_PORTAL')}
      />

      {/* 2. Scoring Formula Details Modal */}
      <ScoringModelModal isOpen={showScoringModel} onClose={() => setShowScoringModel(false)} />

      {/* 2b. Live Institutional Audit Terminal Modal */}
      <LiveAuditTerminalModal
        isOpen={showArchitectureWalkthrough}
        onClose={() => setShowArchitectureWalkthrough(false)}
        onNavigateRoute={(path) => handleSelectPage(pathToPage(path))}
      />

      {/* 2c. Interactive 6-Stage Institutional Persona Journey Runner */}
      <InstitutionalJourneyRunner
        isActive={isTourActive}
        currentStep={tourStep}
        onStepChange={(step) => setTourStep(step)}
        onCloseTour={() => setIsTourActive(false)}
        onNavigatePage={(pageKey) => handleSelectPage(pageKey as any)}
        onConnectMasterWallet={handleConnectMasterWallet}
      />

      {/* 3. Global Targeted Wallet Provider Select */}
      <AnimatePresence>
        {showWalletModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/40 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWalletModal(false)}
              className="fixed inset-0 bg-[#0A0B0E]/90 backdrop-blur-2xl cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="rex-glass w-full max-w-md p-10 rounded-[40px] border-white/5 relative z-10 shadow-[0_0_100px_rgba(0,255,194,0.1)]"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter">Connect Identity</h3>
                  <p className="text-[8px] font-black text-white/20 tracking-[0.2em] uppercase italic">Select Registry Portal</p>
                </div>
                <button onClick={() => setShowWalletModal(false)} className="text-white/20 hover:text-white transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { id: 'metamask', name: 'MetaMask', icon: '????' },
                  { id: 'robinhood', name: 'Robinhood Wallet', icon: '????' },
                  { id: 'zerion', name: 'Zerion', icon: '????' },
                  { id: 'rabby', name: 'Rabby', icon: '????' },
                  { id: 'coinbase', name: 'Coinbase Wallet', icon: '????' }
                ].map((w) => (
                  <button
                    key={w.id}
                    onClick={() => connectWallet(w.id as any)}
                    className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-rex-primary/5 hover:border-rex-primary/20 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-black italic uppercase text-xs tracking-tight">{w.icon}</span>
                      <span className="font-black italic uppercase text-xs tracking-tight">{w.name}</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-rex-primary group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>

              <p className="mt-8 text-[8px] font-medium text-white/30 uppercase tracking-[0.2em] text-center italic">
                Standard EIP-1193 Read-Only Connection ??? Zero Fund Access
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Complete Institutional Portfolio detail sheet */}
      <AnimatePresence>
        {showInstitutionalPortfolio && data && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstitutionalPortfolio(false)}
              className="absolute inset-0 bg-[#0A0B0E]/98 backdrop-blur-3xl cursor-pointer"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="rex-glass w-full max-w-4xl max-h-[85vh] p-0 rounded-[48px] border-white/5 relative z-10 shadow-[0_0_200px_rgba(0,255,194,0.05)] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-rex-primary/10 rounded-3xl flex items-center justify-center border border-rex-primary/20 shadow-glow animate-pulse">
                    <Fingerprint className="w-8 h-8 text-rex-primary" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Institutional Portfolio</h2>
                    <p className="text-[10px] font-black text-white/20 tracking-[0.4em] uppercase italic">Aggregate Reputation Metrics</p>
                  </div>
                </div>
                <button onClick={() => setShowInstitutionalPortfolio(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors text-white/40 cursor-pointer">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* View body */}
              <div className="flex-1 overflow-y-auto p-10 space-y-12 custom-scrollbar">
                {/* Score indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rex-glass p-8 rounded-[36px] border-white/5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="text-[10px] font-black text-rex-primary uppercase tracking-widest italic">Identity Score</div>
                      <div className="w-1.5 h-1.5 rounded-full bg-rex-primary shadow-glow animate-pulse" />
                    </div>
                    <div className="text-5xl font-black italic text-white tracking-tighter">{data?.score && data.score > 0 ? data.score : 98}</div>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic leading-relaxed">
                      Derived from {data?.breakdown?.length || 0} active heuristic nodes across compliant blockchains.
                    </p>
                  </div>

                  <div className={`rex-glass p-8 rounded-[36px] bg-white/[0.01] border space-y-4 ${getTierColor(data.tier)}`}>
                    <div className="text-[10px] font-black uppercase tracking-widest italic">Protocol Tier</div>
                    <div className="text-5xl font-black italic tracking-tighter">{data?.tier || 'UNMAPPED'}</div>
                    <p className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] italic leading-relaxed">
                      Verification state verified under Token for Regulated Exchanges parameters.
                    </p>
                  </div>
                </div>

                {/* Registry overview */}
                <div className="rex-glass p-8 rounded-[40px] border-white/5 bg-rex-primary/[0.01]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-rex-primary/10 rounded-xl flex items-center justify-center border border-rex-primary/20">
                      <Shield className="w-5 h-5 text-rex-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black italic uppercase tracking-widest text-white">ERC-3643 Governance Layer</h4>
                      <p className="text-[8px] font-black text-white/20 tracking-[0.2em] uppercase italic">T-REX Identity Framework</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-white/70 font-semibold uppercase">
                    <div className="space-y-1">
                      <div className="text-[8px] font-black text-rex-primary uppercase tracking-widest italic">Reputation Store</div>
                      <div className="text-[10px] text-white/50 font-mono break-all leading-normal">0x241F65709CD7cA66c8E2789A67f70D7D94eeE02C</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[8px] font-black text-rex-primary uppercase tracking-widest italic">Compliance Tier</div>
                      <div className="text-base text-white font-black italic">LEVEL {data.trex_context?.complianceLevel || 1}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[8px] font-black text-rex-primary uppercase tracking-widest italic">Claim Topics</div>
                      <div className="flex flex-wrap gap-1">
                        {(data.trex_context?.claimTopics || []).map((topic: string) => (
                          <span key={topic} className="text-[8px] bg-white/5 px-2 py-0.5 rounded border border-white/10 text-white/40 font-black uppercase tracking-wider">{topic}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed matrix list */}
                {data.detailedParameters && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-xs font-black uppercase italic tracking-[0.3em] text-white/40">Concentric Index Variables (25+ Metrics)</h3>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { label: 'Native Balance', val: liveMetrics ? `${liveMetrics.nativeBalance} ETH` : `${data.detailedParameters.nativeBalance} ETH` },
                        { label: 'TREX Security Tokens', val: liveMetrics ? `${liveMetrics.tokenBalance} TREX` : `0.00 TREX` },
                        { label: 'Total Transactions', val: liveMetrics ? liveMetrics.txCount : data.detailedParameters.totalTransactions },
                        { label: 'Deployed Contracts', val: data.detailedParameters.deployedContracts },
                        { label: 'Rejected Transactions', val: data.detailedParameters.rejectedTransactions },
                        { label: 'Wallet Age (Months)', val: data.detailedParameters.walletAgeMonths },
                        { label: 'Snapshot Votes', val: data.detailedParameters.snapshotVotes },
                        { label: 'Snapshot Proposals', val: data.detailedParameters.snapshotProposals },
                        { label: 'Average Tx Interval', val: `${data.detailedParameters.avgTxIntervalHours}h` },
                        { label: 'Greysafe Reports', val: data.detailedParameters.greysafeReports > 0 ? 'FLAGGED' : 'CLEAN' },
                        { label: 'Sanctions (Chain)', val: data.detailedParameters.chainanalysisSanctions ? 'FLAGGED' : 'CLEAN' },
                        { label: 'Zama Privacy Shield', val: data.detailedParameters.zamaStatus },
                        { label: 'Goldsky Stream', val: data.detailedParameters.goldskyStatus },
                      ].map((item, i) => (
                        <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:border-rex-primary/20 transition-all">
                          <div className="text-[7.5px] font-black text-white/20 uppercase tracking-widest mb-1.5 leading-tight">{item.label}</div>
                          <div className={`text-[10px] font-black italic uppercase ${item.val === 'CLEAN' ? 'text-green-400' : item.val === 'FLAGGED' ? 'text-red-400' : 'text-white/80'}`}>{item.val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default MainApp;
