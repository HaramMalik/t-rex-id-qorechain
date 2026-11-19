import React, { useState } from 'react';
import { 
  Package, Cpu, ShieldCheck, Terminal, ExternalLink, Copy, Check, 
  Layers, ArrowUpRight, Zap, Code, Shield, Network, FileCode, CheckCircle2
} from 'lucide-react';

interface KitItem {
  id: string;
  name: string;
  badge: string;
  category: string;
  description: string;
  officialPackage: string;
  cliCommand?: string;
  features: string[];
  docUrl: string;
  repoUrl: string;
  status: 'ACTIVE' | 'INTEGRATED' | 'VERIFIED';
}

const QORECHAIN_KITS: KitItem[] = [
  {
    id: 'sdk',
    name: 'QoreChain Multi-Language SDK',
    badge: '@qorechain/sdk',
    category: 'Core Development Kit',
    description: 'Official SDK for building dApps on QoreChain across TypeScript, Python, Go, Rust, and Java. Provides native adapters for EVM, SVM, and React hooks.',
    officialPackage: '@qorechain/sdk @qorechain/evm @qorechain/svm @qorechain/react',
    cliCommand: 'npm create qorechain-dapp@latest',
    features: [
      'Multi-language bindings (TS, Python, Go, Rust, Java)',
      'Triple-VM Account abstraction (Cosmos Bech32, EVM Hex, SVM Base58)',
      'React hooks & provider wrappers (@qorechain/react)',
      'CLI scaffolding via create-qorechain-dapp'
    ],
    docUrl: 'https://docs.qorechain.io',
    repoUrl: 'https://build.qorechain.io/kits',
    status: 'INTEGRATED'
  },
  {
    id: 'pqc',
    name: 'Post-Quantum Cryptography (PQC) Kit',
    badge: 'qorechain-pqc',
    category: 'Quantum Security Toolkit',
    description: 'NIST FIPS 203 & 204 standardized post-quantum cryptographic primitives. Provides hybrid ECDSA + ML-DSA-87 signatures and ML-KEM-1024 key encapsulation.',
    officialPackage: '@qorechain/pqc',
    cliCommand: 'npm i @qorechain/pqc',
    features: [
      'NIST FIPS 204 (ML-DSA-87 / Dilithium) digital signatures',
      'NIST FIPS 203 (ML-KEM-1024 / Kyber) key encapsulation',
      'SHAKE-256 state hashing & hybrid signature envelopment',
      'Quantum-safe T-REX identity attestation'
    ],
    docUrl: 'https://docs.qorechain.io',
    repoUrl: 'https://build.qorechain.io/kits',
    status: 'VERIFIED'
  },
  {
    id: 'asset-kit',
    name: 'Asset & Identity Kit (ERC-3643)',
    badge: 'qorechain-asset-kit',
    category: 'Institutional Compliance',
    description: 'Institutional-grade regulated asset issuance and identity registry suite. Standardized under ERC-3643 / ONCHAINID for Swiss DLT & FINMA compliance.',
    officialPackage: '@qorechain/asset-kit',
    cliCommand: 'npm run verify:compliance',
    features: [
      '5 canonical contracts live on Diana Testnet (Chain ID: 9800)',
      'Swiss Quantum Bond (CH-QOR-01, 6 decimals) live in issuance',
      'Claim Topics 100, 101, 103, 105 active on TrustedIssuersRegistry',
      'Sovereign Owner & Master Node cryptographic governance'
    ],
    docUrl: 'https://docs.qorechain.io',
    repoUrl: 'https://build.qorechain.io/kits',
    status: 'ACTIVE'
  },
  {
    id: 'rdk',
    name: 'Rollup Development Kit (RDK)',
    badge: '@qorechain/rdk',
    category: 'App-Chain & Subnet Kit',
    description: 'Protocol-native operator toolkit and framework for launching, configuring, and operating application-specific institutional rollups on QoreChain.',
    officialPackage: '@qorechain/rdk @qorechain/rdk-cli',
    cliCommand: 'npm create qorechain-rollup@latest',
    features: [
      'Institutional private subnets with quantum settlement',
      'Operator CLI tooling (qorollup / @qorechain/rdk-cli)',
      'Custom gas tokens & compliance rule injection',
      'Settles directly to Diana Testnet / Mainnet'
    ],
    docUrl: 'https://docs.qorechain.io',
    repoUrl: 'https://build.qorechain.io/kits',
    status: 'INTEGRATED'
  },
  {
    id: 'interchain',
    name: 'Interchain & Wallet Adapter Kit',
    badge: '@qorechain/wallet-adapter',
    category: 'Wallet & IBC Infrastructure',
    description: 'Unified wallet adapter supporting non-custodial QoreX wallet, MetaMask, Keplr, and Phantom with automatic cross-VM address resolution.',
    officialPackage: '@qorechain/wallet-adapter @qorechain/qoresign',
    cliCommand: 'npm i @qorechain/wallet-adapter',
    features: [
      'Triple-VM non-custodial wallet connectivity (QoreX, Keplr, MetaMask)',
      'Cross-VM balance parity (lamports = uqor * 1000)',
      'Native Cosmos IBC relaying & EVM smart contract cross-calls',
      'Zero-gas relayer gas sponsorship integration'
    ],
    docUrl: 'https://docs.qorechain.io',
    repoUrl: 'https://build.qorechain.io/kits',
    status: 'INTEGRATED'
  }
];

export const QoreChainKitsSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('asset-kit');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(text);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const activeKit = QORECHAIN_KITS.find(k => k.id === activeTab) || QORECHAIN_KITS[0];

  return (
    <div className="bg-[#050811] border border-cyan-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_0_40px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.08)] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-emerald-500/5 to-transparent blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FFC2] shadow-[0_0_10px_#00FFC2] animate-pulse" />
            <span className="text-[11px] font-mono font-bold text-cyan-400 tracking-[0.2em] uppercase">
              BUILD BEFORE Q-DAY // OFFICIAL DEVELOPER KITS
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-tight uppercase">
            QoreChain Developer Kitset Hub
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-sans max-w-2xl leading-relaxed">
            Verified integration with the official QoreChain developer toolkit from{' '}
            <a 
              href="https://build.qorechain.io/kits" 
              target="_blank" 
              rel="noreferrer" 
              className="text-emerald-400 hover:text-emerald-300 underline font-mono font-semibold"
            >
              build.qorechain.io/kits
            </a>
            . Powering post-quantum security, ERC-3643 institutional identity, and triple-VM execution on Diana Testnet.
          </p>
        </div>

        {/* Action Hub Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="https://build.qorechain.io/kits"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          >
            <Package className="w-3.5 h-3.5" />
            <span>Official Kits Hub</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
          <a
            href="https://docs.qorechain.io"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://dashboard.qorechain.io/explorer"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Explorer</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Kit Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 relative z-10">
        {QORECHAIN_KITS.map((kit) => {
          const isSelected = activeTab === kit.id;
          return (
            <button
              key={kit.id}
              type="button"
              onClick={() => setActiveTab(kit.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1.5 ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,255,194,0.15)]'
                  : 'bg-black/40 border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  kit.status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                  kit.status === 'ACTIVE' ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30' :
                  'bg-purple-950 text-purple-300 border border-purple-500/30'
                }`}>
                  {kit.status}
                </span>
                <span className="text-slate-500">{kit.id.toUpperCase()}</span>
              </div>
              <div className="font-mono font-bold text-xs truncate text-slate-100">
                {kit.name}
              </div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {kit.badge}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Kit Deep Dive Detail Panel */}
      <div className="p-6 rounded-2xl bg-black/60 border border-white/10 space-y-5 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                {activeKit.category}
              </span>
              <span className="text-slate-600">•</span>
              <code className="text-xs font-mono text-cyan-300 font-bold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                {activeKit.badge}
              </code>
            </div>
            <h3 className="text-lg font-bold text-white font-mono">{activeKit.name}</h3>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://build.qorechain.io/kits"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <span>View on build.qorechain.io</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
          {activeKit.description}
        </p>

        {/* CLI / Quickstart Terminal */}
        {activeKit.cliCommand && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/20 font-mono text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[10px]">
              <span className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase">
                <Terminal className="w-3.5 h-3.5" />
                Quickstart CLI Scaffolding
              </span>
              <button
                type="button"
                onClick={() => handleCopy(activeKit.cliCommand!)}
                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedSnippet === activeKit.cliCommand ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedSnippet === activeKit.cliCommand ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-emerald-300 font-bold bg-black/60 p-2.5 rounded border border-white/5 select-all flex items-center justify-between">
              <code>$ {activeKit.cliCommand}</code>
            </div>
          </div>
        )}

        {/* Key Architectural Capabilities */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">
            Key Architectural Capabilities & Specs:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeKit.features.map((feature, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-2.5 text-xs text-slate-200"
              >
                <CheckCircle2 className="w-4 h-4 text-[#00FFC2] shrink-0 mt-0.5" />
                <span className="leading-snug">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
