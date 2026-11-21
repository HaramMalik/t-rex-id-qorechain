import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Key, ShieldCheck, Globe, Copy, Check, Layers, Fingerprint, RefreshCw, Cpu } from 'lucide-react';
import {
  ONCHAINID_V3_KEY_PURPOSES,
  ONCHAINID_V3_IDENTITY_TYPES,
  type OnchainIdV3IdentityType
} from '../constants/claimSchemas';
import {
  buildErc7930InteroperableEnvelope,
  buildQoreSealStatus,
  queryQorePqcKeyStatus,
  QORECHAIN_PRECOMPILES,
  QORECHAIN_CHAIN_ID,
  type LivePqcPrecompileKeyStatus
} from '../services/qorechainPqcService';

interface OnchainIdV3EnvelopePanelProps {
  targetAddress: string;
  chainId?: number;
}

export const OnchainIdV3EnvelopePanel: React.FC<OnchainIdV3EnvelopePanelProps> = ({
  targetAddress,
  chainId = QORECHAIN_CHAIN_ID
}) => {
  const [selectedIdentityType, setSelectedIdentityType] = useState<OnchainIdV3IdentityType>('INSTITUTION');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [pqcKeyStatus, setPqcKeyStatus] = useState<LivePqcPrecompileKeyStatus | null>(null);
  const [isLoadingPqc, setIsLoadingPqc] = useState<boolean>(false);

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

  useEffect(() => {
    refreshPrecompileStatus();
  }, [refreshPrecompileStatus]);

  const activeTypeSpec = useMemo(() => {
    return (
      ONCHAINID_V3_IDENTITY_TYPES.find((t) => t.type === selectedIdentityType) ||
      ONCHAINID_V3_IDENTITY_TYPES[1]
    );
  }, [selectedIdentityType]);

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

  return (
    <div className="space-y-6">
      {/* Header & ERC-7579 / ERC-7930 Spec Summary */}
      <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400">
              <Layers className="w-4 h-4 shrink-0" />
              <span>ONCHAINID v3 · ERC-7579 Modular Account · ERC-7930 Envelope</span>
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
              <strong className="text-white">{activeTypeSpec.label}</strong> — {activeTypeSpec.jurisdictionalRole}
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

      {/* Live 0x0A02 / 0x0A01 Precompile Verification & @qorechain/qoreseal Envelope */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Live Diana Precompile & QoreSeal Attestation</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400">
              {QORECHAIN_PRECOMPILES.pqcKeyStatus.slice(0, 10)}...{QORECHAIN_PRECOMPILES.pqcKeyStatus.slice(-4)} · {QORECHAIN_PRECOMPILES.pqcVerify.slice(-4)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">0x0A02 pqcKeyStatus(address)</span>
              <span className={pqcKeyStatus?.possessionProven ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                {pqcKeyStatus === null
                  ? 'PROBING...'
                  : pqcKeyStatus.possessionProven
                  ? 'HYBRID POSSESSION PROVEN'
                  : pqcKeyStatus.registered
                  ? 'REGISTERED · UNPROVEN'
                  : 'NO PQC KEY REGISTERED'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 tabular-nums">
              <div>
                <div className="text-[10px] text-slate-500">Algorithm</div>
                <div className="text-slate-200 font-semibold">{pqcKeyStatus?.algorithmLabel || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Pubkey Size</div>
                <div className="text-cyan-300 font-semibold">{pqcKeyStatus ? `${pqcKeyStatus.pubkeyBytes} B` : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">0x0A01 Verify</div>
                <div className="text-emerald-300 font-semibold">TrexPqcIdentityModule</div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-purple-500/25 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-purple-300 font-bold">{qoreSeal.package} · {qoreSeal.kemAlgorithm}</span>
              <span className="text-emerald-400 font-bold">{qoreSeal.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 tabular-nums">
              <div>
                <div className="text-[10px] text-slate-500">ML-KEM Pubkey</div>
                <div className="text-white font-semibold">{qoreSeal.mlkemPubkeyBytes.toLocaleString()} B</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Sealed Envelope</div>
                <div className="text-purple-300 font-semibold">{qoreSeal.sealedEnvelopeBytes.toLocaleString()} B</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500">HKDF Context</div>
                <div className="text-slate-300 font-semibold truncate" title={qoreSeal.hkdfContext}>{qoreSeal.hkdfContext}</div>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              KEM Digest: {qoreSeal.encapsulatedKeyDigest}
            </div>
          </div>
        </div>
      </div>

      {/* All 6 ONCHAINID v3 Key Purposes */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>ONCHAINID v3 Key Purposes (Purposes 1 – 6)</span>
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
