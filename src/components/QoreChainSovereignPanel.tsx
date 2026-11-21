import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  PauseCircle,
  PlayCircle,
  Send,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  KeyRound,
  Terminal
} from 'lucide-react';
import {
  QORECHAIN_CHAIN_ID,
  QORECHAIN_CONTRACTS,
  QORECHAIN_PRECOMPILES,
  QORECHAIN_SOVEREIGN_ROLES,
  QORECHAIN_TX_OVERRIDES,
  SWISS_BOND_TOKEN_ABI,
  TRUSTED_ISSUERS_REGISTRY_9800_ABI,
  QORECHAIN_RDK_ROLLUP_PRESET,
  ensureQoreChainNetwork,
  getQoreChainProvider,
  getQoreChainTxUrl,
  getQoreChainAddressUrl,
  buildQoreSealStatus,
  queryQorePqcKeyStatus,
  queryQoreConsensusParams,
  runAssetKitCompliancePreFlight,
  type LivePqcPrecompileKeyStatus
} from '../services/qorechainPqcService';

interface QoreChainSovereignPanelProps {
  connectedAddress: string | null;
  targetAddress: string;
}

interface TrustedIssuerRecord {
  address: string;
  topics: number[];
}

interface GovernanceReceipt {
  action: string;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  details: string;
}

export const QoreChainSovereignPanel: React.FC<QoreChainSovereignPanelProps> = ({
  connectedAddress,
  targetAddress
}) => {
  const effectiveTarget = ethers.isAddress(targetAddress)
    ? ethers.getAddress(targetAddress)
    : QORECHAIN_SOVEREIGN_ROLES.masterSovereignNode;

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [tokenOwner, setTokenOwner] = useState<string>(QORECHAIN_SOVEREIGN_ROLES.sovereignOwner);
  const [totalSupply, setTotalSupply] = useState<string>('10000.00');
  const [targetBalance, setTargetBalance] = useState<string>('0.00');
  const [isTargetFrozen, setIsTargetFrozen] = useState<boolean>(false);
  const [isConnectedAgent, setIsConnectedAgent] = useState<boolean>(false);
  const [trustedIssuers, setTrustedIssuers] = useState<TrustedIssuerRecord[]>([]);
  const [isLoadingChain, setIsLoadingChain] = useState<boolean>(false);
  const [targetPqcStatus, setTargetPqcStatus] = useState<LivePqcPrecompileKeyStatus | null>(null);
  const [consensusParams, setConsensusParams] = useState<{
    responded: boolean;
    blockTimeMs: number;
    baseGasPriceGwei: string;
    validatorSetSize: number;
    epoch: number;
  } | null>(null);

  // Governance form controls
  const [freezeTargetInput, setFreezeTargetInput] = useState<string>(effectiveTarget);
  const [forcedFrom, setForcedFrom] = useState<string>(effectiveTarget);
  const [forcedTo, setForcedTo] = useState<string>(QORECHAIN_SOVEREIGN_ROLES.masterSovereignNode);
  const [forcedAmount, setForcedAmount] = useState<string>('100');

  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [govError, setGovError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<GovernanceReceipt | null>(null);

  useEffect(() => {
    if (ethers.isAddress(effectiveTarget)) {
      setFreezeTargetInput(effectiveTarget);
      setForcedFrom(effectiveTarget);
    }
  }, [effectiveTarget]);

  const refreshChainState = useCallback(async () => {
    setIsLoadingChain(true);
    try {
      const provider = getQoreChainProvider();
      const token = new ethers.Contract(
        QORECHAIN_CONTRACTS.SwissQuantumBondToken,
        SWISS_BOND_TOKEN_ABI,
        provider
      );
      const issuersReg = new ethers.Contract(
        QORECHAIN_CONTRACTS.TrustedIssuersRegistry,
        TRUSTED_ISSUERS_REGISTRY_9800_ABI,
        provider
      );

      const queryAddr = ethers.isAddress(freezeTargetInput)
        ? ethers.getAddress(freezeTargetInput)
        : effectiveTarget;

      const [pausedRes, ownerRes, supplyRes, balRes, frozenRes, issuerListRes, pqcKeyRes, consensusRes] =
        await Promise.all([
          token.paused().catch(() => false),
          token.owner().catch(() => QORECHAIN_SOVEREIGN_ROLES.sovereignOwner),
          token.totalSupply().catch(() => 0n),
          token.balanceOf(queryAddr).catch(() => 0n),
          token.frozenAddresses(queryAddr).catch(() => false),
          issuersReg.getTrustedIssuers().catch(() => []),
          queryQorePqcKeyStatus(queryAddr),
          queryQoreConsensusParams()
        ]);

      setIsPaused(Boolean(pausedRes));
      setTokenOwner(String(ownerRes));
      setTotalSupply(ethers.formatUnits(supplyRes, 6));
      setTargetBalance(ethers.formatUnits(balRes, 6));
      setIsTargetFrozen(Boolean(frozenRes));
      setTargetPqcStatus(pqcKeyRes);
      setConsensusParams(consensusRes);

      if (connectedAddress && ethers.isAddress(connectedAddress)) {
        const agentStatus = await token.isAgent(connectedAddress).catch(() => false);
        setIsConnectedAgent(Boolean(agentStatus));
      } else {
        setIsConnectedAgent(false);
      }

      if (Array.isArray(issuerListRes) && issuerListRes.length > 0) {
        const loadedIssuers = await Promise.all(
          issuerListRes.map(async (addr: string) => {
            const rawTopics = await issuersReg.getTrustedIssuerTopics(addr).catch(() => []);
            return {
              address: ethers.getAddress(addr),
              topics: Array.isArray(rawTopics) ? rawTopics.map((t: any) => Number(t)) : []
            };
          })
        );
        setTrustedIssuers(loadedIssuers);
      }
    } catch (err) {
      console.warn('Diana 9800 state read warning:', err);
    } finally {
      setIsLoadingChain(false);
    }
  }, [connectedAddress, effectiveTarget, freezeTargetInput]);

  useEffect(() => {
    refreshChainState();
  }, [refreshChainState]);

  /**
   * Wrapper matching ERC-3643 setAddressFrozen(address, bool) backed by
   * deployed SwissQuantumBondToken freezeAddress/unfreezeAddress on Chain 9800.
   */
  const setAddressFrozen = async (target: string, freeze: boolean) => {
    if (!ethers.isAddress(target)) {
      setGovError('Enter a valid 0x investor address to freeze or unfreeze.');
      return;
    }
    setGovError(null);
    setPendingAction(freeze ? 'freeze' : 'unfreeze');
    try {
      await ensureQoreChainNetwork();
      const eth = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const cleanTarget = ethers.getAddress(target);
      const token = new ethers.Contract(
        QORECHAIN_CONTRACTS.SwissQuantumBondToken,
        SWISS_BOND_TOKEN_ABI,
        signer
      );

      const tx = freeze
        ? await token.freezeAddress(cleanTarget, QORECHAIN_TX_OVERRIDES)
        : await token.unfreezeAddress(cleanTarget, QORECHAIN_TX_OVERRIDES);

      const receipt = await tx.wait(1);
      setLastReceipt({
        action: freeze ? 'setAddressFrozen(true)' : 'setAddressFrozen(false)',
        txHash: receipt?.hash || tx.hash,
        blockNumber: Number(receipt?.blockNumber || 0),
        timestamp: new Date().toLocaleTimeString(),
        details: `${freeze ? 'Frozen' : 'Unfrozen'} ${cleanTarget} on CH-QOR-01`
      });
      await refreshChainState();
    } catch (err: any) {
      setGovError(err?.reason || err?.shortMessage || err?.message || 'Chain 9800 freeze transaction reverted.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleTogglePause = async (shouldPause: boolean) => {
    setGovError(null);
    setPendingAction(shouldPause ? 'pause' : 'unpause');
    try {
      await ensureQoreChainNetwork();
      const eth = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const token = new ethers.Contract(
        QORECHAIN_CONTRACTS.SwissQuantumBondToken,
        SWISS_BOND_TOKEN_ABI,
        signer
      );

      const tx = shouldPause
        ? await token.pause(QORECHAIN_TX_OVERRIDES)
        : await token.unpause(QORECHAIN_TX_OVERRIDES);

      const receipt = await tx.wait(1);
      setLastReceipt({
        action: shouldPause ? 'pause()' : 'unpause()',
        txHash: receipt?.hash || tx.hash,
        blockNumber: Number(receipt?.blockNumber || 0),
        timestamp: new Date().toLocaleTimeString(),
        details: shouldPause
          ? 'CH-QOR-01 circuit breaker engaged'
          : 'CH-QOR-01 compliant transfers resumed'
      });
      await refreshChainState();
    } catch (err: any) {
      setGovError(err?.reason || err?.shortMessage || err?.message || 'Chain 9800 pause toggle failed.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleForcedTransfer = async () => {
    if (!ethers.isAddress(forcedFrom) || !ethers.isAddress(forcedTo)) {
      setGovError('Both From and To addresses must be valid 0x EVM addresses.');
      return;
    }
    const numericAmount = Number(forcedAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setGovError('Enter a valid CH-QOR-01 amount (> 0).');
      return;
    }

    setGovError(null);
    setPendingAction('forcedTransfer');
    try {
      await ensureQoreChainNetwork();
      const eth = (window as any).ethereum;
      const provider = new ethers.BrowserProvider(eth);
      const signer = await provider.getSigner();
      const token = new ethers.Contract(
        QORECHAIN_CONTRACTS.SwissQuantumBondToken,
        SWISS_BOND_TOKEN_ABI,
        signer
      );
      const parsedUnits = ethers.parseUnits(forcedAmount, 6);
      const tx = await token.forcedTransfer(
        ethers.getAddress(forcedFrom),
        ethers.getAddress(forcedTo),
        parsedUnits,
        QORECHAIN_TX_OVERRIDES
      );
      const receipt = await tx.wait(1);
      setLastReceipt({
        action: 'forcedTransfer()',
        txHash: receipt?.hash || tx.hash,
        blockNumber: Number(receipt?.blockNumber || 0),
        timestamp: new Date().toLocaleTimeString(),
        details: `Recovered ${forcedAmount} CH-QOR-01 from ${forcedFrom.slice(0, 8)}... to ${forcedTo.slice(0, 8)}...`
      });
      await refreshChainState();
    } catch (err: any) {
      setGovError(err?.reason || err?.shortMessage || err?.message || 'Forced transfer failed (Agent role required).');
    } finally {
      setPendingAction(null);
    }
  };

  const qoreSeal = buildQoreSealStatus(effectiveTarget, [100, 101, 103, 105]);

  return (
    <div className="space-y-6">
      {/* Top Status Strip */}
      <div className="rounded-xl border border-cyan-500/30 bg-[#080B10] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-900/40 pb-4">
          <div>
            <div className="text-xs font-mono font-bold text-cyan-400">
              QoreChain Diana Testnet · Chain ID: {QORECHAIN_CHAIN_ID}
            </div>
            <h2 className="text-lg font-bold text-white font-mono mt-0.5 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              <span>CEO Sovereign Governance Rail (CH-QOR-01)</span>
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshChainState}
              disabled={isLoadingChain}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-800/50 text-cyan-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingChain ? 'animate-spin' : ''}`} />
              <span>Sync Chain 9800</span>
            </button>
            <a
              href={getQoreChainAddressUrl(QORECHAIN_CONTRACTS.SwissQuantumBondToken)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5"
            >
              <span>CH-QOR-01 Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live Telemetry Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-white/10">
            <div className="text-[11px] text-slate-400">Total CH-QOR-01 Supply</div>
            <div className="text-sm font-bold text-white tabular-nums mt-0.5">{Number(totalSupply).toLocaleString()} CH-QOR-01</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-white/10">
            <div className="text-[11px] text-slate-400">Circuit Breaker State</div>
            <div className={`text-sm font-bold mt-0.5 ${isPaused ? 'text-red-400' : 'text-emerald-400'}`}>
              {isPaused ? 'PAUSED' : 'ACTIVE / OPERATIONAL'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-white/10">
            <div className="text-[11px] text-slate-400">Target CH-QOR-01 Balance</div>
            <div className="text-sm font-bold text-cyan-300 tabular-nums mt-0.5">{Number(targetBalance).toLocaleString()} CH-QOR-01</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-white/10">
            <div className="text-[11px] text-slate-400">Signer Authority</div>
            <div className={`text-sm font-bold mt-0.5 ${isConnectedAgent ? 'text-emerald-400' : 'text-amber-300'}`}>
              {isConnectedAgent ? 'Agent / Owner Authorized' : `Owner: ${tokenOwner.slice(0, 8)}...`}
            </div>
          </div>
        </div>

        {/* Governance Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
          {/* 1. Freeze / Unfreeze Address */}
          <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>Freeze / Unfreeze Account</span>
              </span>
              <span className={`text-[11px] font-mono font-bold ${isTargetFrozen ? 'text-red-400' : 'text-emerald-400'}`}>
                {isTargetFrozen ? 'FROZEN' : 'CLEAR'}
              </span>
            </div>
            <input
              type="text"
              value={freezeTargetInput}
              onChange={(e) => setFreezeTargetInput(e.target.value)}
              placeholder="0x Investor Address"
              className="w-full bg-black border border-white/15 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={() => setAddressFrozen(freezeTargetInput, true)}
                className="py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{pendingAction === 'freeze' ? 'Freezing...' : 'Freeze'}</span>
              </button>
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={() => setAddressFrozen(freezeTargetInput, false)}
                className="py-2 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>{pendingAction === 'unfreeze' ? 'Unfreezing...' : 'Unfreeze'}</span>
              </button>
            </div>
          </div>

          {/* 2. Global Pause / Unpause */}
          <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-mono font-bold text-red-300 flex items-center gap-1.5">
                {isPaused ? <PlayCircle className="w-4 h-4 text-emerald-400" /> : <PauseCircle className="w-4 h-4 text-red-400" />}
                <span>Token Circuit Breaker</span>
              </span>
              <p className="text-xs text-slate-400">
                Halts or resumes all CH-QOR-01 compliance transfers directly on Diana Chain 9800.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={pendingAction !== null || isPaused}
                onClick={() => handleTogglePause(true)}
                className="py-2 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-mono font-bold cursor-pointer disabled:opacity-40"
              >
                {pendingAction === 'pause' ? 'Pausing...' : 'Pause Token'}
              </button>
              <button
                type="button"
                disabled={pendingAction !== null || !isPaused}
                onClick={() => handleTogglePause(false)}
                className="py-2 px-3 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold cursor-pointer disabled:opacity-40"
              >
                {pendingAction === 'unpause' ? 'Resuming...' : 'Unpause Token'}
              </button>
            </div>
          </div>

          {/* 3. Forced Transfer Recovery */}
          <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-2.5">
            <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <Send className="w-4 h-4" />
              <span>Forced Transfer Recovery</span>
            </span>
            <input
              type="text"
              value={forcedFrom}
              onChange={(e) => setForcedFrom(e.target.value)}
              placeholder="From 0x..."
              className="w-full bg-black border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-cyan-400"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={forcedTo}
                onChange={(e) => setForcedTo(e.target.value)}
                placeholder="To 0x..."
                className="col-span-2 bg-black border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="number"
                value={forcedAmount}
                onChange={(e) => setForcedAmount(e.target.value)}
                placeholder="Qty"
                className="bg-black border border-white/15 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-white tabular-nums focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              type="button"
              disabled={pendingAction !== null}
              onClick={handleForcedTransfer}
              className="w-full py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold cursor-pointer disabled:opacity-50"
            >
              {pendingAction === 'forcedTransfer' ? 'Executing Recovery...' : 'Execute Forced Transfer'}
            </button>
          </div>
        </div>

        {/* Error / Live Block Confirmation Receipt */}
        {govError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
            {govError}
          </div>
        )}

        {lastReceipt && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="space-y-0.5">
              <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {lastReceipt.action} confirmed in Block #{lastReceipt.blockNumber.toLocaleString()} ({lastReceipt.timestamp})
                </span>
              </div>
              <div className="text-slate-300 text-[11px]">{lastReceipt.details}</div>
            </div>
            <a
              href={getQoreChainTxUrl(lastReceipt.txHash)}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:text-white font-bold flex items-center gap-1.5 shrink-0"
            >
              <span>Diana Explorer ({lastReceipt.txHash.slice(0, 10)}...)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Live Chain 9800 Trusted Issuers Snapshot */}
        {trustedIssuers.length > 0 && (
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="text-xs font-mono text-slate-400">
              Live TrustedIssuersRegistry ({QORECHAIN_CONTRACTS.TrustedIssuersRegistry})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {trustedIssuers.map((iss) => (
                <div
                  key={iss.address}
                  className="p-2.5 rounded-lg bg-black/50 border border-white/10 flex items-center justify-between gap-2 text-xs font-mono"
                >
                  <a
                    href={getQoreChainAddressUrl(iss.address)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-300 hover:underline truncate"
                  >
                    {iss.address}
                  </a>
                  <span className="text-emerald-400 shrink-0">Topics [{iss.topics.join(', ')}]</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom 2-Column Spec Panels: @qorechain/qoreseal + 0x0A02 & @qorechain/rdk + @qorechain/asset-kit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* @qorechain/qoreseal ML-KEM-1024 Selective Disclosure */}
        <div className="rounded-xl border border-purple-500/30 bg-[#080B10] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-purple-900/40 pb-3">
            <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-purple-400" />
              <span>{qoreSeal.package} · Selective Disclosure</span>
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-400">{qoreSeal.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-white/10">
              <div className="text-[11px] text-slate-400">KEM Primitive</div>
              <div className="text-white font-bold mt-0.5">{qoreSeal.kemAlgorithm}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-white/10">
              <div className="text-[11px] text-slate-400">Regulator Key ID</div>
              <div className="text-purple-300 font-bold mt-0.5">{qoreSeal.regulatorKeyId}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-white/10 tabular-nums">
              <div className="text-[11px] text-slate-400">ML-KEM Pubkey / Sealed Envelope</div>
              <div className="text-cyan-300 font-bold mt-0.5">
                {qoreSeal.mlkemPubkeyBytes.toLocaleString()} B / {qoreSeal.sealedEnvelopeBytes.toLocaleString()} B
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 border border-white/10">
              <div className="text-[11px] text-slate-400">0x0A02 Target PQC Key</div>
              <div className={`font-bold mt-0.5 ${targetPqcStatus?.possessionProven ? 'text-emerald-400' : 'text-amber-300'}`}>
                {targetPqcStatus === null
                  ? 'Checking...'
                  : targetPqcStatus.possessionProven
                  ? `${targetPqcStatus.algorithmLabel} (${targetPqcStatus.pubkeyBytes} B)`
                  : targetPqcStatus.registered
                  ? `${targetPqcStatus.algorithmLabel} (Unproven)`
                  : 'Unregistered'}
              </div>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono space-y-1">
            <div className="text-slate-400">
              HKDF: {qoreSeal.hkdfContext} · Topics [{qoreSeal.authorizedTopics.join(', ')}]
            </div>
            <div className="text-purple-200 break-all">KEM Digest: {qoreSeal.encapsulatedKeyDigest}</div>
          </div>
        </div>

        {/* @qorechain/rdk + @qorechain/asset-kit + 0x0C01 Consensus Params */}
        <div className="rounded-xl border border-cyan-500/30 bg-[#080B10] p-5 space-y-3">
          {(() => {
            const preFlight = runAssetKitCompliancePreFlight(
              effectiveTarget,
              'CH-QOR-01',
              targetPqcStatus?.responded
                ? { registered: targetPqcStatus.registered, possessionProven: targetPqcStatus.possessionProven }
                : undefined
            );
            return (
              <>
                <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
                  <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>{QORECHAIN_RDK_ROLLUP_PRESET.package} · {QORECHAIN_RDK_ROLLUP_PRESET.presetName}</span>
                  </span>
                  <span className="text-[11px] font-mono text-cyan-400 tabular-nums">
                    {consensusParams?.responded
                      ? `0x0C01: ${consensusParams.validatorSetSize} validators · Epoch ${consensusParams.epoch}`
                      : `${QORECHAIN_RDK_ROLLUP_PRESET.blockTimeMs}ms finality`}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="text-slate-300 flex flex-wrap items-center justify-between gap-2">
                    <span>{preFlight.package}: {preFlight.bech32Holder.slice(0, 14)}...{preFlight.bech32Holder.slice(-6)}</span>
                    <span className="text-emerald-400 font-bold">
                      {preFlight.pqcKeyBoundInMockChain ? 'PRE-FLIGHT BOUND' : 'UNBOUND'} · {QORECHAIN_PRECOMPILES.pqcVerify.slice(-6)}/{QORECHAIN_PRECOMPILES.pqcKeyStatus.slice(-6)}
                    </span>
                  </div>
                  <div className="text-slate-400">Data Availability: {QORECHAIN_RDK_ROLLUP_PRESET.daAvailability}</div>
                  <div className="space-y-1 pt-1">
                    {QORECHAIN_RDK_ROLLUP_PRESET.enforcedPrecompiles.map((rule) => (
                      <div key={rule} className="text-[11px] text-emerald-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-black border border-white/10 text-[11px] font-mono text-cyan-300 flex items-center gap-2 overflow-x-auto">
                  <Terminal className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <code className="whitespace-nowrap">{QORECHAIN_RDK_ROLLUP_PRESET.scaffoldCommand}</code>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
