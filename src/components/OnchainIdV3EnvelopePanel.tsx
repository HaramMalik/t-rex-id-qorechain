import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Key,
  ShieldCheck,
  Globe,
  Copy,
  Check,
  Layers,
  Fingerprint,
  RefreshCw,
  Cpu,
  ArrowRightLeft,
  ExternalLink,
  Send,
  AlertTriangle
} from 'lucide-react';
import {
  ONCHAINID_V3_KEY_PURPOSES,
  ONCHAINID_V3_IDENTITY_TYPES,
  type OnchainIdV3IdentityType
} from '../constants/claimSchemas';
import {
  buildErc7930InteroperableEnvelope,
  buildQoreSealStatus,
  buildCrossVmReceiptPreview,
  dispatchCrossVmIdentitySyncOnChain,
  queryQorePqcKeyStatus,
  QORECHAIN_PRECOMPILES,
  QORECHAIN_CHAIN_ID,
  QORECHAIN_NATIVE_RECEIPTS_CONTRACT,
  QORECHAIN_EXTENSIONS_DEFAULTS,
  ERC7913_MAGIC_VALUE,
  type LivePqcPrecompileKeyStatus,
  type CrossVmDispatchResult
} from '../services/qorechainPqcService';
import {
  checkDianaPqcReadiness,
  type DianaPreflightReport
} from '../services/qorechainDianaHelper';

interface OnchainIdV3EnvelopePanelProps {
  targetAddress: string;
  chainId?: number;
}

const CROSS_VM_BRIDGE_STORAGE_KEY = 'trex_crossvm_bridge_address';

export const OnchainIdV3EnvelopePanel: React.FC<OnchainIdV3EnvelopePanelProps> = ({
  targetAddress,
  chainId = QORECHAIN_CHAIN_ID
}) => {
  const [selectedIdentityType, setSelectedIdentityType] = useState<OnchainIdV3IdentityType>('INSTITUTION');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pqcKeyStatus, setPqcKeyStatus] = useState<LivePqcPrecompileKeyStatus | null>(null);
  const [isLoadingPqc, setIsLoadingPqc] = useState<boolean>(false);
  const [preflightReport, setPreflightReport] = useState<DianaPreflightReport | null>(null);
  const [isLoadingPreflight, setIsLoadingPreflight] = useState<boolean>(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);

  const [bridgeAddress, setBridgeAddress] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(CROSS_VM_BRIDGE_STORAGE_KEY);
      if (saved) return saved;
    }
    return QORECHAIN_EXTENSIONS_DEFAULTS.trexCrossVmBridgeModule;
  });
  const [isDispatchingBridge, setIsDispatchingBridge] = useState<boolean>(false);
  const [bridgeResult, setBridgeResult] = useState<CrossVmDispatchResult | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);

  const normalizedAddress = useMemo(() => {
    return ethers.isAddress(targetAddress)
      ? ethers.getAddress(targetAddress)
      : '0x35912ee176F003800eBd1A60819A9Df51147cF3A';
  }, [targetAddress]);

  const envelope = useMemo(() => {
    return buildErc7930InteroperableEnvelope(normalizedAddress, chainId, selectedIdentityType);
  }, [normalizedAddress, chainId, selectedIdentityType]);

  const qoreSeal = useMemo(() => {
    return buildQoreSealStatus(normalizedAddress, [100, 101, 103, 105]);
  }, [normalizedAddress]);

  const refreshPrecompileStatus = useCallback(async () => {
    setIsLoadingPqc(true);
    try {
      const status = await queryQorePqcKeyStatus(normalizedAddress);
      setPqcKeyStatus(status);
    } finally {
      setIsLoadingPqc(false);
    }
  }, [normalizedAddress]);

  const refreshDianaPreflight = useCallback(async () => {
    setIsLoadingPreflight(true);
    setPreflightError(null);
    try {
      const report = await checkDianaPqcReadiness(envelope.qorBech32Address);
      setPreflightReport(report);
    } catch (err: any) {
      setPreflightError(err?.message || 'Unable to reach Diana REST pre-flight endpoint.');
    } finally {
      setIsLoadingPreflight(false);
    }
  }, [envelope.qorBech32Address]);

  useEffect(() => {
    refreshPrecompileStatus();
  }, [refreshPrecompileStatus]);

  useEffect(() => {
    refreshDianaPreflight();
  }, [refreshDianaPreflight]);

  const activeTypeSpec = useMemo(() => {
    return (
      ONCHAINID_V3_IDENTITY_TYPES.find((t) => t.type === selectedIdentityType) ||
      ONCHAINID_V3_IDENTITY_TYPES[1]
    );
  }, [selectedIdentityType]);

  const identityRoleIndex = useMemo(() => {
    return Math.max(0, Math.min(7, activeTypeSpec.code - 1));
  }, [activeTypeSpec]);

  const crossVmPreview = useMemo(() => {
    return buildCrossVmReceiptPreview(
      normalizedAddress,
      envelope.qorBech32Address,
      envelope.unifiedKeyspaceDigest,
      identityRoleIndex
    );
  }, [normalizedAddress, envelope.qorBech32Address, envelope.unifiedKeyspaceDigest, identityRoleIndex]);

  const derivedKeys = useMemo(() => {
    return ONCHAINID_V3_KEY_PURPOSES.map((purpose) => ({
      ...purpose,
      keyHash: ethers.keccak256(
        ethers.solidityPacked(
          ['address', 'uint256', 'string'],
          [normalizedAddress, purpose.id, `ERC7579_${purpose.code}`]
        )
      ),
      enabledByDefault: activeTypeSpec.defaultPurposes.includes(purpose.id)
    }));
  }, [normalizedAddress, activeTypeSpec]);

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleBridgeAddressChange = (val: string) => {
    setBridgeAddress(val);
    setBridgeError(null);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CROSS_VM_BRIDGE_STORAGE_KEY, val.trim());
    }
  };

  const handleDispatchCrossVmSync = async () => {
    setBridgeError(null);
    setBridgeResult(null);
    setIsDispatchingBridge(true);
    try {
      const result = await dispatchCrossVmIdentitySyncOnChain(
        bridgeAddress.trim(),
        normalizedAddress,
        envelope.qorBech32Address,
        envelope.unifiedKeyspaceDigest,
        identityRoleIndex
      );
      setBridgeResult(result);
    } catch (err: any) {
      const msg =
        err?.shortMessage ||
        err?.reason ||
        err?.message ||
        'Cross-VM 0x0901 dispatch failed. Confirm wallet is on QoreChain Diana (9800) with an active EVM window.';
      setBridgeError(msg);
    } finally {
      setIsDispatchingBridge(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & ERC-7579 / ERC-7930 Spec Summary */}
      <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
              <Layers className="w-4 h-4 shrink-0" />
              <span>ONCHAINID v3 ?? ERC-7579 Modular Account ?? ERC-7930 Envelope</span>
            </div>
            <p className="text-xs text-slate-400">
              Binds EVM (`0x...`) and QoreChain Cosmos Bech32 (`qor1...`) signers into one unified identity keyspace across 6 key purposes and 8 institutional entity types.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded shrink-0 whitespace-nowrap">
            {envelope.version}
          </span>
        </div>

        {/* 8 ONCHAINID v3 Identity Types Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-cyan-400" />
              <span>ONCHAINID v3 Identity Types (8 Roles)</span>
            </span>
            <span className="text-cyan-400 font-semibold">{activeTypeSpec.erc7579Module}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ONCHAINID_V3_IDENTITY_TYPES.map((spec) => {
              const isSelected = spec.type === selectedIdentityType;
              return (
                <button
                  key={spec.type}
                  type="button"
                  onClick={() => setSelectedIdentityType(spec.type)}
                  className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400 text-white'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:text-white hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className={isSelected ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                      #{spec.code}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {spec.defaultPurposes.length} keys
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold mt-0.5 truncate">{spec.type}</div>
                </button>
              );
            })}
          </div>
          <div className="text-xs text-slate-300 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              <strong className="text-white">{activeTypeSpec.label}</strong> ??? {activeTypeSpec.jurisdictionalRole}
            </span>
            <span className="text-[11px] font-mono text-cyan-300 shrink-0">
              Active Purposes: [{activeTypeSpec.defaultPurposes.join(', ')}]
            </span>
          </div>
        </div>
      </div>

      {/* ERC-7930 Interoperable Address Envelope Viewer */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>ERC-7930 Interoperable Address Envelope Viewer</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">{envelope.chainType}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>EVM Signer Binding (eip155:{envelope.chainId})</span>
              <button
                type="button"
                onClick={() => handleCopy(envelope.evmAddress, 'evm')}
                className="text-cyan-400 hover:text-white cursor-pointer flex items-center gap-1"
              >
                {copiedField === 'evm' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'evm' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-white break-all">{envelope.evmAddress}</div>
            <div className="text-[10px] text-slate-500 break-all">{envelope.caip10Evm}</div>
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>QoreChain Cosmos Bech32 Signer (qor1...)</span>
              <button
                type="button"
                onClick={() => handleCopy(envelope.qorBech32Address, 'qor')}
                className="text-emerald-400 hover:text-white cursor-pointer flex items-center gap-1"
              >
                {copiedField === 'qor' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedField === 'qor' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-emerald-300 break-all">{envelope.qorBech32Address}</div>
            <div className="text-[10px] text-slate-500 break-all">{envelope.caip10Cosmos}</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-black/60 border border-cyan-500/20 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-cyan-400 font-bold">
              ERC-7930 Binary Envelope Hex ({envelope.chainReferenceHex})
            </span>
            <button
              type="button"
              onClick={() => handleCopy(envelope.erc7930BinaryHex, 'bin')}
              className="text-cyan-300 hover:text-white cursor-pointer flex items-center gap-1 text-[11px]"
            >
              {copiedField === 'bin' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              <span>{copiedField === 'bin' ? 'Copied' : 'Copy Hex'}</span>
            </button>
          </div>
          <div className="text-slate-200 break-all text-[11px]">{envelope.erc7930BinaryHex}</div>
          <div className="pt-1 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
            <span className="text-slate-400">Unified Keyspace Digest:</span>
            <span className="text-purple-300 break-all">{envelope.unifiedKeyspaceDigest}</span>
          </div>
        </div>
      </div>

      {/* Live 0x0A02 / 0x0A01 Precompile Verification, ERC-7913 Verifier & @qorechain/qoreseal */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Live Diana Precompiles ?? ERC-7913 PQC Verifier ?? QoreSeal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400">
              {QORECHAIN_PRECOMPILES.pqcKeyStatus.slice(0, 10)}...{QORECHAIN_PRECOMPILES.pqcKeyStatus.slice(-4)} ?? {QORECHAIN_PRECOMPILES.pqcVerify.slice(-4)}
            </span>
            <button
              type="button"
              onClick={refreshPrecompileStatus}
              disabled={isLoadingPqc}
              className="px-3 py-1 rounded-lg bg-slate-950 border border-white/15 text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingPqc ? 'animate-spin' : ''}`} />
              <span>Probe 0x0A02</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">0x0A02 pqcKeyStatus</span>
              <span className={pqcKeyStatus?.possessionProven ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                {pqcKeyStatus === null
                  ? 'PROBING...'
                  : pqcKeyStatus.possessionProven
                  ? 'POSSESSION PROVEN'
                  : pqcKeyStatus.registered
                  ? 'REGISTERED'
                  : 'NO PQC KEY'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
              <div>
                <div className="text-[10px] text-slate-500">Algorithm</div>
                <div className="text-slate-200 font-semibold">{pqcKeyStatus?.algorithmLabel || '???'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Pubkey Size</div>
                <div className="text-cyan-300 font-semibold">{pqcKeyStatus ? `${pqcKeyStatus.pubkeyBytes} B` : '???'}</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-cyan-500/25 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-cyan-300 font-bold">PqcERC7913Verifier</span>
              <span className="text-emerald-400 font-bold">{ERC7913_MAGIC_VALUE}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
              <div>
                <div className="text-[10px] text-slate-500">Account Standard</div>
                <div className="text-white font-semibold">ERC-7579 / v3</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Precompile</div>
                <div className="text-cyan-300 font-semibold">0x0A01 (Alg 1)</div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Signer: abi.encodePacked(verifier, mlDsa87Pubkey)
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-purple-500/25 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-purple-300 font-bold">{qoreSeal.package}</span>
              <span className="text-emerald-400 font-bold">ML-KEM-1024</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 tabular-nums">
              <div>
                <div className="text-[10px] text-slate-500">ML-KEM Pubkey</div>
                <div className="text-white font-semibold">{qoreSeal.mlkemPubkeyBytes.toLocaleString()} B</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Sealed Envelope</div>
                <div className="text-purple-300 font-semibold">{qoreSeal.sealedEnvelopeBytes.toLocaleString()} B</div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              KEM Digest: {qoreSeal.encapsulatedKeyDigest}
            </div>
          </div>
        </div>
      </div>

      {/* Atomic Cross-VM Identity Sync (0x0901 EVM -> Native CosmWasm) */}
      <div className="rounded-2xl bg-slate-900/90 border border-emerald-500/30 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              <span>Cross-VM Identity Sync ?? Precompile 0x0901 (EVM ??? Native CosmWasm)</span>
            </div>
            <p className="text-xs text-slate-400">
              Dispatches one atomic ERC-7930 compliance attestation receipt from QoreChain EVM to Diana&apos;s governance-allowlisted CosmWasm contract via <code className="text-cyan-300">TrexCrossVmBridgeModule</code>.
            </p>
          </div>
          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded shrink-0 whitespace-nowrap">
            Target VM: 1 (Native)
          </span>
        </div>

        {/* Live Diana REST Pre-Flight Gate (/qorechain/pqc/v1/account & /evm_window) */}
        <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">Diana REST Pre-Flight Gate</span>
              <span className="text-[10px] text-slate-400 truncate max-w-[240px]" title={envelope.qorBech32Address}>
                {envelope.qorBech32Address}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={
                  preflightReport?.readyToDeploy
                    ? 'text-emerald-400 font-bold'
                    : preflightReport
                    ? 'text-amber-300 font-bold'
                    : 'text-slate-400'
                }
              >
                {isLoadingPreflight
                  ? 'QUERYING REST...'
                  : preflightReport?.readyToDeploy
                  ? 'WINDOW LIVE ?? READY'
                  : preflightReport
                  ? 'EVM WINDOW CLOSED'
                  : 'NOT CHECKED'}
              </span>
              <button
                type="button"
                onClick={refreshDianaPreflight}
                disabled={isLoadingPreflight}
                className="px-2.5 py-1 rounded-lg bg-slate-950 border border-white/15 text-[11px] text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingPreflight ? 'animate-spin' : ''}`} />
                <span>Check Window</span>
              </button>
            </div>
          </div>

          {preflightError && (
            <div className="text-[11px] text-rose-300">{preflightError}</div>
          )}

          {preflightReport && preflightReport.isLowWindow && (
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Warning:</strong> EVM window is running low ({preflightReport.remainingBlocks} blocks, {preflightReport.remainingTxs} txs remaining). Open a new window soon with <code className="text-white">MsgOpenEVMWindow</code>.
              </span>
            </div>
          )}

          {preflightReport && !preflightError && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 tabular-nums text-[11px]">
              <div>
                <div className="text-[10px] text-slate-500">ML-DSA-87 Key</div>
                <div className={preflightReport.hasUsableMlDsa87Key ? 'text-emerald-400 font-semibold' : 'text-amber-300 font-semibold'}>
                  {preflightReport.accountFound
                    ? `${preflightReport.algorithmName} (${preflightReport.possessionProven ? 'PoP OK' : 'Unproven'})`
                    : 'Not Registered'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">evm_window.live</div>
                <div className={preflightReport.windowLive ? 'text-emerald-400 font-semibold' : 'text-rose-300 font-semibold'}>
                  {String(preflightReport.windowLive)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Expiry Block</div>
                <div className="text-slate-200 font-semibold">
                  {Number(preflightReport.expiryHeight) > 0
                    ? `#${Number(preflightReport.expiryHeight).toLocaleString()}`
                    : '???'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Remaining Txs</div>
                <div className="text-cyan-300 font-semibold">
                  {preflightReport.windowFound
                    ? `${preflightReport.remainingTxs} / ${preflightReport.maxTxs}`
                    : '0 / 0'}
                </div>
              </div>
            </div>
          )}

          {preflightReport && preflightReport.blockers.length > 0 && (
            <div className="pt-2 border-t border-white/10 text-[11px] text-amber-200/90 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>QoreChain v3.2.0 PQC / EVM Window Notice</span>
              </div>
              <p className="text-slate-300 font-sans leading-relaxed text-[11px]">
                QoreChain Diana requires this connected account to register an ML-DSA-87 key and open a bounded EVM window (<code className="text-cyan-300">MsgOpenEVMWindow</code>) before broadcasting EVM transactions or interacting with contracts.
              </p>
              {preflightReport.blockers.map((b, i) => (
                <div key={i} className="font-mono text-amber-300">??? {b}</div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          <div className="space-y-1.5">
            <label
              htmlFor="trex-crossvm-bridge-input"
              className="block text-[11px] text-slate-300 font-semibold"
            >
              Deployed TrexCrossVmBridgeModule Address (Diana 9800)
            </label>
            <input
              id="trex-crossvm-bridge-input"
              type="text"
              value={bridgeAddress}
              onChange={(e) => handleBridgeAddressChange(e.target.value)}
              placeholder="0x... (from npm run deploy:qorechain-all)"
              className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-[11px] text-slate-300 font-semibold">
              Allowlisted Native CosmWasm Target (Proposal 40 ?? qday-receipts-w3)
            </div>
            <div className="px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-emerald-300 truncate select-all" title={QORECHAIN_NATIVE_RECEIPTS_CONTRACT}>
              {QORECHAIN_NATIVE_RECEIPTS_CONTRACT}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-black/60 border border-white/10 space-y-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Sanitized CosmWasm Execute Payload ({crossVmPreview.note.length} / 140 ASCII chars)</span>
            <span className="text-emerald-400">executeCrossVMCall(1, target, payload)</span>
          </div>
          <div className="text-slate-200 break-all text-[11px]">{crossVmPreview.jsonPayload}</div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDispatchCrossVmSync}
            disabled={isDispatchingBridge || !ethers.isAddress(bridgeAddress.trim())}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isDispatchingBridge
                ? 'Broadcasting 0x0901 Cross-VM Tx...'
                : 'Dispatch Cross-VM Identity Sync (0x0901)'}
            </span>
          </button>

          {!ethers.isAddress(bridgeAddress.trim()) && (
            <span className="text-[11px] font-mono text-slate-400">
              Run <code className="text-cyan-300">npm run deploy:qorechain-all</code> and paste the deployed bridge address above.
            </span>
          )}
        </div>

        {bridgeError && (
          <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs font-mono text-rose-200 break-words">
            {bridgeError}
          </div>
        )}

        {bridgeResult && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-1.5 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-emerald-300 font-bold">
                Cross-VM 0x0901 Receipt Anchored ?? Block #{bridgeResult.blockNumber.toLocaleString()}
              </span>
              <a
                href={bridgeResult.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-300 hover:text-white inline-flex items-center gap-1 underline"
              >
                <span>Inspect on Diana Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="text-[11px] text-slate-300 break-all">Tx Hash: {bridgeResult.txHash}</div>
          </div>
        )}
      </div>

      {/* All 6 ONCHAINID v3 Key Purposes */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>ONCHAINID v3 Key Purposes (Purposes 1 ??? 6)</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-300">ERC-734 + ERC-7579 Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {derivedKeys.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border space-y-2 ${
                item.enabledByDefault
                  ? 'bg-slate-950 border-cyan-500/30'
                  : 'bg-black/40 border-white/10 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono font-bold text-cyan-300">{item.label}</span>
                <span
                  className={`text-[10px] font-mono font-bold flex items-center gap-1 ${
                    item.enabledByDefault ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>{item.enabledByDefault ? 'ACTIVE ROLE' : 'AVAILABLE'}</span>
                </span>
              </div>
              <div className="text-[11px] font-mono text-purple-300">{item.erc7579ModuleRole}</div>
              <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
              <div className="text-[11px] font-mono text-slate-300 bg-black/60 border border-white/5 px-2.5 py-1.5 rounded-lg truncate">
                {item.keyHash}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

