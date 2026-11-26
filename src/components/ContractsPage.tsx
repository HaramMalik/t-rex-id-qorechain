import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, ExternalLink, 
  Copy, Check, Globe, Cpu, Search, Key, 
  CheckCircle2, Zap, ArrowUpRight
} from 'lucide-react';
import { PROTOCOL_CONTRACTS } from '../config/contracts';
import { 
  QORECHAIN_CONTRACTS, 
  QORECHAIN_CONTRACT_BECH32,
  QORECHAIN_SOVEREIGN_ROLES,
  QORECHAIN_DEPLOYMENT_TRANSACTIONS,
  QORECHAIN_DEPLOYMENT_BLOCKS,
  QORECHAIN_DASHBOARD_URL
} from '../services/qorechainPqcService';
import { QoreChainKitsSection } from './QoreChainKitsSection';

interface QoreContractMeta {
  name: string;
  symbol?: string;
  role: string;
  standard: string;
  address: string;
  bech32Address: string;
  blockNumber: number;
  txHash: string;
  additionalTxHash?: string;
  bytecodeBytes: number;
  description: string;
}

const QORECHAIN_SUITE_CONTRACTS: QoreContractMeta[] = [
  {
    name: "IdentityRegistryStorage",
    role: "On-Chain Investor Identity & Claim Storage Vault",
    standard: "ERC-3643 / ONCHAINID",
    address: QORECHAIN_CONTRACTS.IdentityRegistryStorage,
    bech32Address: QORECHAIN_CONTRACT_BECH32.IdentityRegistryStorage,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.IdentityRegistryStorage,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.IdentityRegistryStorage,
    bytecodeBytes: 1270,
    description: "Stores bound investor ONCHAINID addresses, country verification codes (ISO 3166), and KYC status across QoreChain Diana."
  },
  {
    name: "TrustedIssuersRegistry",
    role: "Authorized KYC/AML Attestation Authorities",
    standard: "ERC-3643 / ONCHAINID",
    address: QORECHAIN_CONTRACTS.TrustedIssuersRegistry,
    bech32Address: QORECHAIN_CONTRACT_BECH32.TrustedIssuersRegistry,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.TrustedIssuersRegistry,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.TrustedIssuersRegistry,
    bytecodeBytes: 1790,
    description: "Whitelists authorized attestation issuers and maps verified claim topics [100, 101, 103, 105]. Active Authority: Master Sovereign Node (0x35912ee...)."
  },
  {
    name: "ModularCompliance",
    role: "Automated Regulatory Transfer Restrictions Engine",
    standard: "ERC-3643 Modular Engine",
    address: QORECHAIN_CONTRACTS.ModularCompliance,
    bech32Address: QORECHAIN_CONTRACT_BECH32.ModularCompliance,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.ModularCompliance,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.ModularCompliance,
    bytecodeBytes: 1053,
    description: "Evaluates compliance modules, investor quotas, jurisdictional restrictions, and daily volume limits before every transfer."
  },
  {
    name: "TREXFactory",
    role: "T-REX Suite Deployer & Proxy Factory",
    standard: "ERC-3643 Factory",
    address: QORECHAIN_CONTRACTS.TREXFactory,
    bech32Address: QORECHAIN_CONTRACT_BECH32.TREXFactory,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.TREXFactory,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.TREXFactory,
    bytecodeBytes: 9370,
    description: "Deterministic deployer factory producing permissioned security tokens, registries, and compliance bindings under sovereign ownership."
  },
  {
    name: "SwissQuantumBondToken",
    symbol: "CH-QOR-01",
    role: "NIST FIPS 203/204 Post-Quantum Security Token (6 Decimals)",
    standard: "ERC-3643 / Swiss DLT Act",
    address: QORECHAIN_CONTRACTS.SwissQuantumBondToken,
    bech32Address: QORECHAIN_CONTRACT_BECH32.SwissQuantumBondToken,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.SwissQuantumBondToken,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.SwissQuantumBondToken,
    additionalTxHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.MintTx,
    bytecodeBytes: 4969,
    description: "Tokenized Swiss sovereign bond with 6-decimal precision. Minted initial supply of 10,000 CH-QOR-01 ($10,000,000) under Qualified Agent supervision."
  }
];

export const ContractsPage: React.FC = () => {
  const [activeNetwork, setActiveNetwork] = useState<'QORECHAIN' | 'SEPOLIA'>('QORECHAIN');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedContract, setSelectedContract] = useState<any | null>(null);

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filteredSepoliaContracts = PROTOCOL_CONTRACTS.filter(contract => {
    return (
      contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.standard.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredQoreContracts = QORECHAIN_SUITE_CONTRACTS.filter(contract => {
    return (
      contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contract.symbol && contract.symbol.toLowerCase().includes(searchQuery.toLowerCase())) ||
      contract.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.bech32Address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.standard.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#03060d] text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Cybernetic Grid & Glow */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00FFC205_1px,transparent_1px),linear-gradient(to_bottom,#00FFC205_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        
        {/* QoreChain Ecosystem & Developer Kits Alert Banner */}
        <div className="p-4 rounded-xl bg-[#070D1E] border border-cyan-500/30 shadow-[0_0_20px_rgba(0,255,194,0.06)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00FFC2] shadow-[0_0_10px_#00FFC2] animate-pulse" />
            <div className="font-mono text-xs flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">Target Network:</span>
              <span className="text-cyan-300 font-bold bg-black/60 px-2.5 py-0.5 rounded border border-cyan-500/30">
                QoreChain Diana Testnet (Chain ID: 9800)
              </span>
              <span className="text-slate-500">???</span>
              <span className="text-slate-400 font-semibold uppercase tracking-wider">Developer Tooling:</span>
              <a
                href="https://build.qorechain.io/kits"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:text-white font-bold bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 px-2.5 py-0.5 rounded inline-flex items-center gap-1 transition-colors"
                title="Official QoreChain Developer Kits (SDK, PQC, RDK, Asset Kit)"
              >
                <span>build.qorechain.io/kits</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
              <a
                href="https://docs.qorechain.io"
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2 py-0.5 rounded inline-flex items-center gap-1 transition-colors text-[11px]"
              >
                <span>Docs</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase">Live Explorers:</span>
            <a 
              href="https://dashboard.qorechain.io/explorer" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-mono text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
            >
              dashboard.qorechain.io <ArrowUpRight className="w-3 h-3" />
            </a>
            <a 
              href="https://explore.qore.network" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-mono text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
            >
              explore.qore.network <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Header & Terminal Banner */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#070B16] border border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.1)] relative overflow-hidden">
          
          {/* Cybernetic Corner Accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-400" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-400" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#00FFC2] shadow-[0_0_12px_#00FFC2] animate-pulse" />
                <span className="text-xs font-mono font-black text-cyan-400 tracking-[0.25em] uppercase">
                  CANONICAL SMART CONTRACTS // ON-CHAIN AUDIT VAULT
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-black tracking-tight text-white uppercase italic">
                {activeNetwork === 'QORECHAIN' ? 'QoreChain Diana ERC-3643 Suite (5)' : 'Ethereum Sepolia Canonical Suite (9)'}
              </h1>
              <p className="text-xs sm:text-sm font-sans text-slate-300 max-w-2xl leading-relaxed">
                {activeNetwork === 'QORECHAIN' 
                  ? 'All 5 ERC-3643 contracts verified live on QoreChain Diana Testnet (Chain ID: 9800) with NIST FIPS 203/204 Post-Quantum protection, Master Node attestation, and sovereign ownership.'
                  : 'Canonical Ethereum Sepolia (Chain ID: 11155111) contracts with Zama fhEVM integration and LayerZero V2 omnichain endpoints.'}
              </p>
            </div>

            {/* Network Selector Tabs */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="p-1 rounded-xl bg-black/60 border border-white/10 flex items-center gap-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveNetwork('QORECHAIN')}
                  className={`px-4 py-2 rounded-lg font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    activeNetwork === 'QORECHAIN'
                      ? 'bg-gradient-to-r from-cyan-500 to-[#00FFC2] text-black shadow-[0_0_20px_rgba(0,255,194,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>QORECHAIN DIANA (9800)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNetwork('SEPOLIA')}
                  className={`px-4 py-2 rounded-lg font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                    activeNetwork === 'SEPOLIA'
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>ETHEREUM SEPOLIA (11155111)</span>
                </button>
              </div>

              <div className="px-3.5 py-2 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>{activeNetwork === 'QORECHAIN' ? '5 / 5 LIVE ON-CHAIN' : '9 / 9 VERIFIED'}</span>
              </div>
            </div>
          </div>

          {/* Search filter inside banner */}
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="text"
                placeholder="Search contract name, symbol, or 0x address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-cyan-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-rex-primary" />
              <span>Target: {activeNetwork === 'QORECHAIN' ? 'QoreChain Diana (Chain ID: 9800)' : 'Ethereum Sepolia (Chain ID: 11155111)'}</span>
            </div>
          </div>
        </div>

        {/* QoreChain Sovereign Roles Registry (When QoreChain is Active) */}
        {activeNetwork === 'QORECHAIN' && (
          <div className="p-5 rounded-2xl bg-[#050813] border border-cyan-500/30 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-black uppercase text-cyan-400 tracking-wider">
                <Key className="w-4 h-4 text-[#00FFC2]" />
                <span>Verified Sovereign Roles & Authorities (Chain ID: 9800)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Consensus Code 234 Compliant Execution
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Sovereign Owner */}
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">Sovereign Owner (Constructor)</span>
                  <button onClick={() => handleCopy(QORECHAIN_SOVEREIGN_ROLES.SovereignOwner)} className="text-slate-400 hover:text-white">
                    {copiedAddress === QORECHAIN_SOVEREIGN_ROLES.SovereignOwner ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <code className="text-xs font-mono text-slate-200 font-bold block truncate select-all">
                  {QORECHAIN_SOVEREIGN_ROLES.SovereignOwner}
                </code>
                <div className="text-[10px] font-mono text-slate-400 truncate select-all">
                  Bech32: {QORECHAIN_SOVEREIGN_ROLES.SovereignOwnerBech32}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <a 
                    href={`${QORECHAIN_DASHBOARD_URL}/address/${QORECHAIN_SOVEREIGN_ROLES.SovereignOwner}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-mono text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    Dashboard <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-slate-600">|</span>
                  <a 
                    href={`https://explore.qore.network/address/${QORECHAIN_SOVEREIGN_ROLES.SovereignOwner}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-mono text-purple-300 hover:underline flex items-center gap-1"
                  >
                    Explorer <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Master Sovereign Node */}
              <div className="p-4 rounded-xl bg-black/60 border border-cyan-500/30 space-y-2 shadow-[0_0_15px_rgba(0,255,194,0.06)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#00FFC2] font-bold uppercase tracking-wider">Master Sovereign Node (Issuer)</span>
                  <button onClick={() => handleCopy(QORECHAIN_SOVEREIGN_ROLES.MasterSovereignNode)} className="text-slate-400 hover:text-white">
                    {copiedAddress === QORECHAIN_SOVEREIGN_ROLES.MasterSovereignNode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <code className="text-xs font-mono text-cyan-300 font-bold block truncate select-all">
                  {QORECHAIN_SOVEREIGN_ROLES.MasterSovereignNode}
                </code>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  Bech32: {QORECHAIN_SOVEREIGN_ROLES.MasterSovereignBech32}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <a 
                    href={`${QORECHAIN_DASHBOARD_URL}/address/${QORECHAIN_SOVEREIGN_ROLES.MasterSovereignNode}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-mono text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    Dashboard <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-slate-600">|</span>
                  <a 
                    href={`https://explore.qore.network/address/${QORECHAIN_SOVEREIGN_ROLES.MasterSovereignNode}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-mono text-purple-300 hover:underline flex items-center gap-1"
                  >
                    Explorer <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              {/* Gas Broadcaster */}
              <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">Gas Broadcaster (Funded 100 QOR)</span>
                  <button onClick={() => handleCopy(QORECHAIN_SOVEREIGN_ROLES.DeployerBroadcaster)} className="text-slate-400 hover:text-white">
                    {copiedAddress === QORECHAIN_SOVEREIGN_ROLES.DeployerBroadcaster ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <code className="text-xs font-mono text-slate-200 font-bold block truncate select-all">
                  {QORECHAIN_SOVEREIGN_ROLES.DeployerBroadcaster}
                </code>
                <div className="text-[10px] font-mono text-slate-400 truncate select-all">
                  Bech32: {QORECHAIN_SOVEREIGN_ROLES.GasBroadcasterBech32}
                </div>
                <div className="text-[10px] font-mono text-emerald-400 font-bold">
                  Status: QOR Gas Funded (Live)
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <a 
                    href={`${QORECHAIN_DASHBOARD_URL}/address/${QORECHAIN_SOVEREIGN_ROLES.DeployerBroadcaster}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-mono text-cyan-300 hover:underline flex items-center gap-1"
                  >
                    Dashboard <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-slate-600">|</span>
                  <a 
                    href={`https://explore.qore.network/address/${QORECHAIN_SOVEREIGN_ROLES.DeployerBroadcaster}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] font-mono text-purple-300 hover:underline flex items-center gap-1"
                  >
                    Explorer <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contract Table / Grid Container */}
        <div className="bg-[#050811] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 px-6">Contract / Target</th>
                  <th className="py-4 px-4">Standard</th>
                  <th className="py-4 px-6">Canonical Address</th>
                  {activeNetwork === 'SEPOLIA' && (
                    <>
                      <th className="py-4 px-4">Bytecode Size</th>
                      <th className="py-4 px-6 text-right">Audit Status</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-sans">
                {activeNetwork === 'QORECHAIN' ? (
                  filteredQoreContracts.map((contract, index) => (
                    <tr key={index} className="hover:bg-cyan-500/[0.03] transition-colors group">
                      {/* Name & Role */}
                      <td className="py-4 px-6 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                          <span className="font-bold text-white font-mono text-sm">
                            {contract.name}
                          </span>
                          {contract.symbol && (
                            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                              {contract.symbol}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans max-w-md leading-relaxed pl-3.5">
                          {contract.description}
                        </p>
                        <div className="pl-3.5 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500">
                          <span>Block #{contract.blockNumber.toLocaleString()}</span>
                          <span>???</span>
                          <a
                            href={`${QORECHAIN_DASHBOARD_URL}/tx/${contract.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 hover:text-cyan-300 underline inline-flex items-center gap-0.5"
                            title="View deployment transaction on QoreChain Explorer"
                          >
                            <span>Deploy Tx ({contract.txHash.slice(0, 8)}...)</span>
                          </a>
                          {contract.additionalTxHash && (
                            <>
                              <span>???</span>
                              <a
                                href={`${QORECHAIN_DASHBOARD_URL}/tx/${contract.additionalTxHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-0.5"
                                title="View token mint transaction"
                              >
                                <span>Mint Tx</span>
                              </a>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Standard */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[10px] font-bold tracking-wider inline-block">
                          {contract.standard}
                        </span>
                      </td>

                      {/* Canonical Address (Clickable EVM + Bech32) */}
                      <td className="py-4 px-6 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <a
                            href={`${QORECHAIN_DASHBOARD_URL}/address/${contract.address}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-mono text-cyan-200 hover:text-cyan-300 hover:underline font-bold bg-black/60 px-2.5 py-1 rounded border border-cyan-500/25 inline-flex items-center gap-1.5"
                            title={`Inspect ${contract.address} on QoreChain Explorer`}
                          >
                            <span>{contract.address.slice(0, 10)}...{contract.address.slice(-8)}</span>
                            <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(contract.address)}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy Full EVM Address"
                          >
                            {copiedAddress === contract.address ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <code className="text-[10px] font-mono text-emerald-300/90 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20 select-all">
                            {contract.bech32Address.slice(0, 12)}...{contract.bech32Address.slice(-6)}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(contract.bech32Address)}
                            className="p-1 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                            title="Copy Bech32 qor1 Address"
                          >
                            {copiedAddress === contract.bech32Address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredSepoliaContracts.map((contract, index) => (
                    <tr key={index} className="hover:bg-cyan-500/[0.03] transition-colors group">
                      <td className="py-4 px-6 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 group-hover:scale-125 transition-transform" />
                          <span className="font-bold text-white font-mono text-sm group-hover:text-cyan-300 transition-colors">
                            {contract.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans max-w-md leading-relaxed pl-3.5">
                          {contract.role}
                        </p>
                      </td>

                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[10px] font-bold tracking-wider inline-block">
                          {contract.standard}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono text-slate-200 font-bold bg-black/60 px-2 py-1 rounded border border-white/10 select-all">
                            {contract.address.slice(0, 10)}...{contract.address.slice(-8)}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(contract.address)}
                            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy Full Address"
                          >
                            {copiedAddress === contract.address ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <a
                            href={contract.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors border border-cyan-500/20"
                            title="View Verified on Etherscan #code"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-xs text-slate-300 font-semibold">
                        {contract.bytecodeSize}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedContract(contract)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-black tracking-widest inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          PASS // VERIFIED
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sepolia Modal */}
          {selectedContract && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#070B16] border border-cyan-500/40 rounded-2xl max-w-4xl w-full p-6 space-y-6 relative shadow-[0_0_50px_rgba(0,255,194,0.15)] max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white font-mono">{selectedContract.name}</h3>
                      <p className="text-xs text-cyan-400 font-mono">Etherscan Verified Contract & Source Code #code (Sepolia Testnet)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedContract(null)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ???
                  </button>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 uppercase tracking-widest text-[10px]">Canonical Deployed Address:</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(selectedContract.address)}
                        className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {copiedAddress === selectedContract.address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAddress === selectedContract.address ? 'Copied!' : 'Copy Address'}</span>
                      </button>
                    </div>
                    <div className="text-cyan-300 break-all font-bold text-sm">{selectedContract.address}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                      <div className="text-slate-400 text-[10px] uppercase">Standard</div>
                      <div className="text-white font-bold mt-1">{selectedContract.standard}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                      <div className="text-slate-400 text-[10px] uppercase">Bytecode Size</div>
                      <div className="text-emerald-400 font-bold mt-1">{selectedContract.bytecodeSize}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10">
                      <div className="text-slate-400 text-[10px] uppercase">Audit State</div>
                      <div className="text-emerald-400 font-bold mt-1">CERTIFIED</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Post-Quantum & Cross-VM Precompile Extensions */}
        {activeNetwork === 'QORECHAIN' && (
          <div className="p-5 sm:p-6 rounded-2xl bg-[#050813] border border-emerald-500/30 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  Live Deployed QoreChain Diana Precompile Extensions (Chain ID: 9800)
                </div>
                <h2 className="text-lg font-display font-bold text-white mt-0.5">
                  TrexPqcIdentityModule ?? PqcERC7913Verifier ?? TrexCrossVmBridgeModule
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded self-start sm:self-center">
                3 / 3 LIVE ON-CHAIN ?? 0x0901 CROSS-VM SYNC CONFIRMED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-white font-bold">TrexPqcIdentityModule</span>
                  <span className="text-[10px] text-cyan-300">Block #10,680,152</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Plug-and-play <code className="text-cyan-300">ModularCompliance</code> extension enforcing fail-closed ML-DSA-87 proof-of-possession (<code className="text-emerald-300">0x0A02</code>), ERC-735 claim checks (<code className="text-emerald-300">0x0A01</code>), and ERC-7930 envelope anchoring.
                </p>
                <div className="pt-1 border-t border-white/10 font-mono text-[11px] space-y-1">
                  <div className="text-cyan-300 truncate select-all">0x62600c1C206C089a68D53c65eE19A3f4A98e26a2</div>
                  <a
                    href={`${QORECHAIN_DASHBOARD_URL}/tx/0xc9e9e475ad65ef40c2cff03fc10e562ebd663eda63bc40522e99f01c7488fbfa`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[10px]"
                  >
                    <span>Deploy Tx (0xc9e9e475...)</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/50 border border-cyan-500/25 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-white font-bold">PqcERC7913Verifier</span>
                  <span className="text-[10px] text-emerald-300">Block #10,680,154</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Stateless <code className="text-cyan-300">IERC7913SignatureVerifier</code> returning <code className="text-emerald-300">0x024ad318</code> / <code className="text-slate-300">0xffffffff</code> via <code className="text-cyan-300">0x0A01</code> so OpenZeppelin <code className="text-cyan-300">AccountERC7579</code> smart accounts natively authenticate ML-DSA-87.
                </p>
                <div className="pt-1 border-t border-white/10 font-mono text-[11px] space-y-1">
                  <div className="text-cyan-300 truncate select-all">0xFcd34140F26AF7bCb8935DdeF90F1936b36A1FAe</div>
                  <a
                    href={`${QORECHAIN_DASHBOARD_URL}/tx/0xee4c20364dc6978faee1e0f4dc75292e9cd81deb1bf08312eb73d8c125f59041`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline inline-flex items-center gap-1 text-[10px]"
                  >
                    <span>Deploy Tx (0xee4c2036...)</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-black/50 border border-emerald-500/25 space-y-2">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-white font-bold">TrexCrossVmBridgeModule</span>
                  <span className="text-[10px] text-emerald-300">Block #10,680,156</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Atomic EVM-to-Native Cosmos bridge invoking <code className="text-cyan-300">0x0901 executeCrossVMCall</code> to record sanitized ERC-7930 compliance receipts on <code className="text-emerald-300">qday-receipts-w3</code> (<code className="text-slate-300">qor1xjayq5...gltw8</code>).
                </p>
                <div className="pt-1 border-t border-white/10 font-mono text-[11px] space-y-1">
                  <div className="text-cyan-300 truncate select-all">0x72E4B9507cBd76b9177d61c8a14bd127201EAE0C</div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <a
                      href={`${QORECHAIN_DASHBOARD_URL}/tx/0x6a59732ede95facde99d0b858a5d32063e6ffd2c9b8f36a956742304875e452c`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Deploy Tx</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </a>
                    <a
                      href={`${QORECHAIN_DASHBOARD_URL}/tx/0x369d3276f63d0114433078146402cc936e4f8ef0300d12c5b2668824fb6c8b87`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>0x0901 Sync Tx (#10,680,158)</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">0x0A01 ?? pqcVerify</div>
                <div className="text-cyan-300 truncate">0x0000...00000A01</div>
                <div className="text-[11px] text-emerald-400">ERC-7913 & Claim Proofs</div>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">0x0A02 ?? pqcKeyStatus</div>
                <div className="text-cyan-300 truncate">0x0000...00000A02</div>
                <div className="text-[11px] text-emerald-400">ML-DSA-87 + PoP Gate</div>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/20 space-y-1">
                <div className="text-[10px] text-slate-400">0x0901 ?? executeCrossVMCall</div>
                <div className="text-emerald-300 truncate">0x0000...00000901</div>
                <div className="text-[11px] text-emerald-400">Atomic EVM ??? Native Sync</div>
              </div>
              <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
                <div className="text-[10px] text-slate-400">0x0C01 ?? rlConsensusParams</div>
                <div className="text-cyan-300 truncate">0x0000...00000C01</div>
                <div className="text-[11px] text-slate-300">5,000ms Block ?? 4 Validators</div>
              </div>
            </div>
          </div>
        )}

        {/* QoreChain Official Developer Kitset Hub */}
        {activeNetwork === 'QORECHAIN' && (
          <QoreChainKitsSection />
        )}
      </div>
    </div>
  );
};
