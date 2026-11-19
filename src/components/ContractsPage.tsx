import React, { useState } from 'react';
import {
  ExternalLink, Copy, Check, Cpu, Search, Key,
  CheckCircle2, ArrowUpRight
} from 'lucide-react';
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
  description: string;
}

const QORECHAIN_SUITE_CONTRACTS: QoreContractMeta[] = [
  {
    name: 'IdentityRegistryStorage',
    role: 'On-Chain Investor Identity & Claim Storage Vault',
    standard: 'ERC-3643 / ONCHAINID',
    address: QORECHAIN_CONTRACTS.IdentityRegistryStorage,
    bech32Address: QORECHAIN_CONTRACT_BECH32.IdentityRegistryStorage,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.IdentityRegistryStorage,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.IdentityRegistryStorage,
    description: 'Stores bound investor ONCHAINID addresses, country verification codes (ISO 3166), and KYC status across QoreChain Diana.'
  },
  {
    name: 'TrustedIssuersRegistry',
    role: 'Authorized KYC/AML Attestation Authorities',
    standard: 'ERC-3643 / ONCHAINID',
    address: QORECHAIN_CONTRACTS.TrustedIssuersRegistry,
    bech32Address: QORECHAIN_CONTRACT_BECH32.TrustedIssuersRegistry,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.TrustedIssuersRegistry,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.TrustedIssuersRegistry,
    description: 'Whitelists authorized attestation issuers and maps verified claim topics [100, 101, 103, 105]. Active Authority: Master Sovereign Node (0x35912ee...).'
  },
  {
    name: 'ModularCompliance',
    role: 'Automated Regulatory Transfer Restrictions Engine',
    standard: 'ERC-3643 Modular Engine',
    address: QORECHAIN_CONTRACTS.ModularCompliance,
    bech32Address: QORECHAIN_CONTRACT_BECH32.ModularCompliance,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.ModularCompliance,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.ModularCompliance,
    description: 'Evaluates compliance modules, investor quotas, jurisdictional restrictions, and daily volume limits before every transfer.'
  },
  {
    name: 'TREXFactory',
    role: 'T-REX Suite Deployer & Proxy Factory',
    standard: 'ERC-3643 Factory',
    address: QORECHAIN_CONTRACTS.TREXFactory,
    bech32Address: QORECHAIN_CONTRACT_BECH32.TREXFactory,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.TREXFactory,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.TREXFactory,
    description: 'Deterministic deployer factory producing permissioned security tokens, registries, and compliance bindings under sovereign ownership.'
  },
  {
    name: 'SwissQuantumBondToken',
    symbol: 'CH-QOR-01',
    role: 'NIST FIPS 203/204 Post-Quantum Security Token (6 Decimals)',
    standard: 'ERC-3643 / Swiss DLT Act',
    address: QORECHAIN_CONTRACTS.SwissQuantumBondToken,
    bech32Address: QORECHAIN_CONTRACT_BECH32.SwissQuantumBondToken,
    blockNumber: QORECHAIN_DEPLOYMENT_BLOCKS.SwissQuantumBondToken,
    txHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.SwissQuantumBondToken,
    additionalTxHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.MintTx,
    description: 'Tokenized Swiss sovereign bond with 6-decimal precision. Minted initial supply of 10,000 CH-QOR-01 ($10,000,000) under Qualified Agent supervision.'
  }
];

export const ContractsPage: React.FC = () => {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleCopy = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filteredQoreContracts = QORECHAIN_SUITE_CONTRACTS.filter(contract => {
    const q = searchQuery.toLowerCase();
    return (
      contract.name.toLowerCase().includes(q) ||
      (contract.symbol && contract.symbol.toLowerCase().includes(q)) ||
      contract.address.toLowerCase().includes(q) ||
      contract.bech32Address.toLowerCase().includes(q) ||
      contract.role.toLowerCase().includes(q) ||
      contract.standard.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#03060d] text-slate-100 p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        <div className="p-6 sm:p-8 rounded-2xl bg-[#070B16] border border-cyan-500/30 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#00FFC2] animate-pulse" />
                <span className="text-xs font-mono font-black text-cyan-400 tracking-[0.25em] uppercase">
                  CANONICAL SMART CONTRACTS // ON-CHAIN AUDIT VAULT
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white uppercase italic">
                QoreChain Diana ERC-3643 Suite (5)
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                All 5 ERC-3643 contracts verified live on QoreChain Diana Testnet (Chain ID: 9800) with NIST FIPS 203/204 Post-Quantum protection, Master Node attestation, and sovereign ownership.
              </p>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>5 / 5 LIVE ON-CHAIN</span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
              <input
                type="text"
                placeholder="Search contract name, symbol, 0x or qor1..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/60 border border-cyan-500/30 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-white"
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Target: QoreChain Diana (Chain ID: 9800)</span>
            </div>
          </div>
        </div>

        {/* Sovereign Roles */}
        <div className="p-5 rounded-2xl bg-[#050813] border border-cyan-500/30 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-black uppercase text-cyan-400 tracking-wider">
            <Key className="w-4 h-4 text-[#00FFC2]" />
            <span>Verified Sovereign Roles & Authorities (Chain ID: 9800)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Sovereign Owner', addr: QORECHAIN_SOVEREIGN_ROLES.SovereignOwner, bech32: QORECHAIN_SOVEREIGN_ROLES.SovereignOwnerBech32 },
              { label: 'Master Sovereign Node (Issuer)', addr: QORECHAIN_SOVEREIGN_ROLES.MasterSovereignNode, bech32: QORECHAIN_SOVEREIGN_ROLES.MasterSovereignBech32 },
              { label: 'Gas Broadcaster', addr: QORECHAIN_SOVEREIGN_ROLES.DeployerBroadcaster, bech32: QORECHAIN_SOVEREIGN_ROLES.GasBroadcasterBech32 }
            ].map((role) => (
              <div key={role.label} className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase">{role.label}</span>
                  <button type="button" onClick={() => handleCopy(role.addr)} className="text-slate-400 hover:text-white">
                    {copiedAddress === role.addr ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <code className="text-xs font-mono text-slate-200 font-bold block truncate">{role.addr}</code>
                <div className="text-[10px] font-mono text-slate-400 truncate">Bech32: {role.bech32}</div>
                <div className="flex items-center gap-2 pt-1 text-[10px] font-mono">
                  <a href={`${QORECHAIN_DASHBOARD_URL}/address/${role.addr}`} target="_blank" rel="noreferrer" className="text-cyan-300 hover:underline flex items-center gap-1">
                    Dashboard <ArrowUpRight className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-slate-600">|</span>
                  <a href={`https://explore.qore.network/address/${role.addr}`} target="_blank" rel="noreferrer" className="text-purple-300 hover:underline flex items-center gap-1">
                    Explorer <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clean 3-Column Contracts Table */}
        <div className="bg-[#050811] border border-cyan-500/30 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">
                  <th className="py-4 px-6">Contract / Target</th>
                  <th className="py-4 px-4">Standard</th>
                  <th className="py-4 px-6">Canonical Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredQoreContracts.map((contract) => (
                  <tr key={contract.address} className="hover:bg-cyan-500/[0.03] transition-colors">
                    <td className="py-4 px-6 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-sm">
                          {contract.name}
                        </span>
                        {contract.symbol && (
                          <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                            {contract.symbol}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 max-w-md leading-relaxed">{contract.description}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-500">
                        <span>Block #{contract.blockNumber.toLocaleString()}</span>
                        <span>•</span>
                        <a href={`${QORECHAIN_DASHBOARD_URL}/tx/${contract.txHash}`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-cyan-300 underline">
                          Deploy Tx ({contract.txHash.slice(0, 8)}...)
                        </a>
                        {contract.additionalTxHash && (
                          <>
                            <span>•</span>
                            <a href={`${QORECHAIN_DASHBOARD_URL}/tx/${contract.additionalTxHash}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 underline">
                              Mint Tx
                            </a>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[10px] font-bold">
                        {contract.standard}
                      </span>
                    </td>

                    <td className="py-4 px-6 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <a
                          href={`${QORECHAIN_DASHBOARD_URL}/address/${contract.address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-mono text-cyan-200 hover:text-cyan-300 hover:underline font-bold bg-black/60 px-2.5 py-1 rounded border border-cyan-500/25 inline-flex items-center gap-1.5"
                        >
                          <span>{contract.address.slice(0, 10)}...{contract.address.slice(-8)}</span>
                          <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                        </a>
                        <button type="button" onClick={() => handleCopy(contract.address)} className="p-1.5 rounded bg-white/5 text-slate-400 hover:text-white">
                          {copiedAddress === contract.address ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <code className="text-[10px] font-mono text-emerald-300 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
                          {contract.bech32Address.slice(0, 12)}...{contract.bech32Address.slice(-6)}
                        </code>
                        <button type="button" onClick={() => handleCopy(contract.bech32Address)} className="p-1 rounded bg-white/5 text-slate-400 hover:text-emerald-300">
                          {copiedAddress === contract.bech32Address ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <QoreChainKitsSection />
      </div>
    </div>
  );
};
