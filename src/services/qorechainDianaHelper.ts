import { ethers } from 'ethers';
import {
  QORECHAIN_CHAIN_ID,
  QORECHAIN_RPC_URL,
  QORECHAIN_REST_URL,
  QORECHAIN_EXPLORER_URL,
  QORECHAIN_DASHBOARD_URL,
  QORECHAIN_CONTRACTS,
  QORECHAIN_DEPLOYMENT_TRANSACTIONS,
  QORECHAIN_DEPLOYMENT_BLOCKS,
  QORECHAIN_PRECOMPILES,
  QORECHAIN_NATIVE_RECEIPTS_CONTRACT,
  QORECHAIN_SOVEREIGN_ROLES,
  ERC7913_MAGIC_VALUE,
  evmAddressToQorBech32
} from './qorechainPqcService';

export const DIANA_NETWORK_CONFIG = {
  chainId: QORECHAIN_CHAIN_ID,
  chainHex: '0x2648',
  cosmosChainId: 'qorechain-diana',
  evmRpcUrl: QORECHAIN_RPC_URL,
  restApiUrl: QORECHAIN_REST_URL,
  explorerUrl: QORECHAIN_EXPLORER_URL,
  dashboardExplorerUrl: QORECHAIN_DASHBOARD_URL,
  nativeReceiptsContract: QORECHAIN_NATIVE_RECEIPTS_CONTRACT,
  precompiles: QORECHAIN_PRECOMPILES
} as const;

export interface DianaPqcAccountRaw {
  found: boolean;
  account: {
    address: string;
    public_key?: string;
    algorithm_id?: number;
    algorithm_name?: string;
    ecdsa_pubkey?: string;
    key_type?: string;
    created_at_height?: string;
    possession_proven?: boolean;
  } | null;
}

export interface DianaEvmWindowRaw {
  found: boolean;
  live: boolean;
  opened_height: string;
  expiry_height: string;
  max_txs: string;
  used_txs: string;
  max_value: string;
  used_value: string;
  remaining_blocks: string;
  remaining_txs: string;
  remaining_value: string;
  native_only: boolean;
  allowed_targets: string[];
}

export interface DianaPreflightReport {
  checkedAt: string;
  inputAddress: string;
  bech32Address: string;
  restAccountUrl: string;
  restWindowUrl: string;
  accountFound: boolean;
  algorithmId: number;
  algorithmName: string;
  keyType: string;
  possessionProven: boolean;
  createdAtHeight: string;
  windowFound: boolean;
  windowLive: boolean;
  openedHeight: string;
  expiryHeight: string;
  remainingBlocks: number;
  usedTxs: number;
  maxTxs: number;
  remainingTxs: number;
  remainingValue: string;
  nativeOnly: boolean;
  allowedTargets: string[];
  hasUsableMlDsa87Key: boolean;
  hasLiveEvmWindow: boolean;
  isLowWindow: boolean;
  readyToDeploy: boolean;
  blockers: string[];
  remediationCommands: string[];
}

const QOR_BECH32_PATTERN = /^qor1[0-9a-z]{38,60}$/;

export function normalizeToQorBech32(addressOrBech32: string): string {
  const trimmed = addressOrBech32.trim();
  if (QOR_BECH32_PATTERN.test(trimmed)) {
    return trimmed;
  }
  if (ethers.isAddress(trimmed)) {
    return evmAddressToQorBech32(trimmed);
  }
  throw new Error(
    `Invalid QoreChain address "${addressOrBech32}". Provide a valid Bech32 qor1... address or 0x... EVM address.`
  );
}

/**
 * Queries live QoreChain Diana REST endpoints (`/qorechain/pqc/v1/account/<addr>` and
 * `/qorechain/pqc/v1/evm_window/<addr>`) via same-origin server proxy in the browser
 * (or direct REST in Node/CLI) with zero mock fallbacks.
 */
export async function checkDianaPqcReadiness(
  addressOrBech32: string = QORECHAIN_SOVEREIGN_ROLES.GasBroadcasterBech32
): Promise<DianaPreflightReport> {
  const bech32Address = normalizeToQorBech32(addressOrBech32);
  const restAccountUrl = `${QORECHAIN_REST_URL}/qorechain/pqc/v1/account/${bech32Address}`;
  const restWindowUrl = `${QORECHAIN_REST_URL}/qorechain/pqc/v1/evm_window/${bech32Address}`;

  let accountData: DianaPqcAccountRaw;
  let windowData: DianaEvmWindowRaw;

  if (typeof window !== 'undefined') {
    const proxyRes = await fetch(
      `${window.location.origin}/api/qorechain/pqc/preflight/${encodeURIComponent(bech32Address)}`
    );
    const contentType = proxyRes.headers.get('content-type') || '';
    const textBody = await proxyRes.text();
    if (!proxyRes.ok || !contentType.includes('application/json') || textBody.trim().startsWith('<')) {
      throw new Error(`Diana pre-flight proxy returned HTTP ${proxyRes.status} (non-JSON): ${textBody.slice(0, 120)}`);
    }
    const payload = JSON.parse(textBody);
    accountData = payload.account as DianaPqcAccountRaw;
    windowData = payload.evmWindow as DianaEvmWindowRaw;
  } else {
    const [accRes, winRes] = await Promise.all([fetch(restAccountUrl), fetch(restWindowUrl)]);
    if (!accRes.ok) {
      throw new Error(`Account pre-flight query failed (HTTP ${accRes.status})`);
    }
    if (!winRes.ok) {
      throw new Error(`EVM window pre-flight query failed (HTTP ${winRes.status})`);
    }
    accountData = (await accRes.json()) as DianaPqcAccountRaw;
    windowData = (await winRes.json()) as DianaEvmWindowRaw;
  }

  const acc = accountData?.account ?? null;
  const accountFound = Boolean(accountData?.found && acc);
  const algorithmId = Number(acc?.algorithm_id ?? 0);
  const algorithmName = acc?.algorithm_name || (algorithmId === 1 ? 'dilithium5' : 'none');
  const keyType = acc?.key_type || 'none';
  const possessionProven = Boolean(acc?.possession_proven);
  const createdAtHeight = acc?.created_at_height || '0';

  const windowFound = Boolean(windowData?.found);
  const windowLive = Boolean(windowData?.live);
  const openedHeight = windowData?.opened_height || '0';
  const expiryHeight = windowData?.expiry_height || '0';
  const remainingBlocks = Number(windowData?.remaining_blocks || '0');
  const usedTxs = Number(windowData?.used_txs || '0');
  const maxTxs = Number(windowData?.max_txs || '0');
  const remainingTxs = Number(windowData?.remaining_txs || '0');
  const remainingValue = windowData?.remaining_value || '0';
  const nativeOnly = Boolean(windowData?.native_only);
  const allowedTargets = Array.isArray(windowData?.allowed_targets) ? windowData.allowed_targets : [];

  const hasUsableMlDsa87Key = accountFound && algorithmId === 1 && possessionProven;
  const hasUnrestrictedTargets = allowedTargets.length === 0;
  const hasLiveEvmWindow =
    windowLive && remainingBlocks > 0 && remainingTxs >= 1 && !nativeOnly && hasUnrestrictedTargets;

  const isLowWindow = windowLive && (remainingBlocks < 1000 || remainingTxs < 10);

  const blockers: string[] = [];
  const remediationCommands: string[] = [];

  if (!accountFound || algorithmId !== 1) {
    blockers.push('No NIST FIPS 204 ML-DSA-87 (algorithm_id = 1) PQC key is registered on this account.');
    remediationCommands.push(
      `# Step 1: Register ML-DSA-87 hybrid key (MsgRegisterPQCKeyV2)\nqored tx pqc register-key-v2 --algorithm 1 --from ${bech32Address} --chain-id qorechain-diana --node https://rpc-testnet.qore.host:443 --gas auto --gas-adjustment 1.3 -y`
    );
  } else if (!possessionProven) {
    blockers.push('ML-DSA-87 key is registered, but possession_proven is false (complete MsgRegisterPQCKeyV2 proof-of-possession).');
    remediationCommands.push(
      `# Step 1: Complete ML-DSA-87 proof-of-possession (MsgRegisterPQCKeyV2)\nqored tx pqc register-key-v2 --algorithm 1 --from ${bech32Address} --chain-id qorechain-diana --node https://rpc-testnet.qore.host:443 --gas auto --gas-adjustment 1.3 -y`
    );
  }

  if (!windowLive || remainingBlocks <= 0) {
    blockers.push(
      windowFound
        ? `EVM authorization window expired at block #${Number(expiryHeight).toLocaleString()} (live === false).`
        : 'No active EVM authorization window found (live === false).'
    );
    remediationCommands.push(
      `# Step 2: Open unrestricted EVM authorization window (MsgOpenEVMWindow)\nqored tx pqc open-evm-window --blocks 17280 --max-txs 100 --max-value 50000000000 --from ${bech32Address} --chain-id qorechain-diana --node https://rpc-testnet.qore.host:443 --gas auto --gas-adjustment 1.3 -y`
    );
  } else {
    if (nativeOnly) {
      blockers.push('EVM window is restricted to native_only === true.');
    }
    if (!hasUnrestrictedTargets) {
      blockers.push(`EVM window restricts allowed_targets (${allowedTargets.length} entries); contract creation requires unrestricted targets.`);
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    inputAddress: addressOrBech32,
    bech32Address,
    restAccountUrl,
    restWindowUrl,
    accountFound,
    algorithmId,
    algorithmName,
    keyType,
    possessionProven,
    createdAtHeight,
    windowFound,
    windowLive,
    openedHeight,
    expiryHeight,
    remainingBlocks,
    usedTxs,
    maxTxs,
    remainingTxs,
    remainingValue,
    nativeOnly,
    allowedTargets,
    hasUsableMlDsa87Key,
    hasLiveEvmWindow,
    isLowWindow,
    readyToDeploy: hasUsableMlDsa87Key && hasLiveEvmWindow,
    blockers,
    remediationCommands
  };
}

export interface DianaDeploymentStepSpec {
  order: number;
  phase: 'CORE_ERC3643_LIVE' | 'ADDITIVE_PQC_EXTENSIONS' | 'CROSS_VM_VERIFICATION';
  contractName: string;
  standard: string;
  precompilesUsed: string[];
  status: 'DEPLOYED_LIVE' | 'READY_FOR_BROADCAST';
  deployedAddress?: string;
  deploymentTxHash?: string;
  deploymentBlock?: number;
  constructorSummary: string;
  purpose: string;
}

export const DIANA_CONTRACT_SEQUENCE: readonly DianaDeploymentStepSpec[] = [
  {
    order: 1,
    phase: 'CORE_ERC3643_LIVE',
    contractName: 'IdentityRegistryStorage',
    standard: 'ERC-3643 / ONCHAINID',
    precompilesUsed: [],
    status: 'DEPLOYED_LIVE',
    deployedAddress: QORECHAIN_CONTRACTS.IdentityRegistryStorage,
    deploymentTxHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.IdentityRegistryStorage,
    deploymentBlock: QORECHAIN_DEPLOYMENT_BLOCKS.IdentityRegistryStorage,
    constructorSummary: 'constructor()',
    purpose: 'Stores bound investor ONCHAINID contracts and ISO-3166 country codes.'
  },
  {
    order: 2,
    phase: 'CORE_ERC3643_LIVE',
    contractName: 'TrustedIssuersRegistry',
    standard: 'ERC-3643 / ONCHAINID',
    precompilesUsed: [],
    status: 'DEPLOYED_LIVE',
    deployedAddress: QORECHAIN_CONTRACTS.TrustedIssuersRegistry,
    deploymentTxHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.TrustedIssuersRegistry,
    deploymentBlock: QORECHAIN_DEPLOYMENT_BLOCKS.TrustedIssuersRegistry,
    constructorSummary: 'constructor()',
    purpose: 'Authorizes KYC/AML claim issuers for topics [100, 101, 103, 105].'
  },
  {
    order: 3,
    phase: 'CORE_ERC3643_LIVE',
    contractName: 'ModularCompliance',
    standard: 'ERC-3643 Modular Engine',
    precompilesUsed: [],
    status: 'DEPLOYED_LIVE',
    deployedAddress: QORECHAIN_CONTRACTS.ModularCompliance,
    deploymentTxHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.ModularCompliance,
    deploymentBlock: QORECHAIN_DEPLOYMENT_BLOCKS.ModularCompliance,
    constructorSummary: 'constructor(identityRegistry, trustedIssuersRegistry, requiredClaimTopics)',
    purpose: 'Evaluates pre-transfer regulatory gates before token movement.'
  },
  {
    order: 4,
    phase: 'CORE_ERC3643_LIVE',
    contractName: 'TREXFactory',
    standard: 'ERC-3643 Factory',
    precompilesUsed: [],
    status: 'DEPLOYED_LIVE',
    deployedAddress: QORECHAIN_CONTRACTS.TREXFactory,
    deploymentTxHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.TREXFactory,
    deploymentBlock: QORECHAIN_DEPLOYMENT_BLOCKS.TREXFactory,
    constructorSummary: 'constructor()',
    purpose: 'Deterministic factory for permissioned institutional security tokens.'
  },
  {
    order: 5,
    phase: 'CORE_ERC3643_LIVE',
    contractName: 'SwissQuantumBondToken (CH-QOR-01)',
    standard: 'ERC-3643 / Swiss DLT Act',
    precompilesUsed: [],
    status: 'DEPLOYED_LIVE',
    deployedAddress: QORECHAIN_CONTRACTS.SwissQuantumBondToken,
    deploymentTxHash: QORECHAIN_DEPLOYMENT_TRANSACTIONS.SwissQuantumBondToken,
    deploymentBlock: QORECHAIN_DEPLOYMENT_BLOCKS.SwissQuantumBondToken,
    constructorSummary: 'constructor("Swiss Quantum Bond 2026", "CH-QOR-01", ModularCompliance)',
    purpose: 'Live 6-decimal institutional tokenized sovereign bond (10,000 CH-QOR-01 minted).'
  },
  {
    order: 6,
    phase: 'ADDITIVE_PQC_EXTENSIONS',
    contractName: 'TrexPqcIdentityModule',
    standard: 'ERC-3643 + ONCHAINID v3',
    precompilesUsed: [QORECHAIN_PRECOMPILES.pqcVerify, QORECHAIN_PRECOMPILES.pqcKeyStatus],
    status: 'DEPLOYED_LIVE',
    deployedAddress: '0x62600c1C206C089a68D53c65eE19A3f4A98e26a2',
    deploymentTxHash: '0xc9e9e475ad65ef40c2cff03fc10e562ebd663eda63bc40522e99f01c7488fbfa',
    deploymentBlock: 10680152,
    constructorSummary: `constructor(${QORECHAIN_SOVEREIGN_ROLES.SovereignOwner}, ${QORECHAIN_CONTRACTS.IdentityRegistryStorage})`,
    purpose: 'Plug-and-play ModularCompliance module enforcing ML-DSA-87 proof-of-possession (0x0A02), ERC-735 claim checks (0x0A01), and ERC-7930 envelope anchoring.'
  },
  {
    order: 7,
    phase: 'ADDITIVE_PQC_EXTENSIONS',
    contractName: 'PqcERC7913Verifier',
    standard: 'ONCHAINID v3 / ERC-7913 / ERC-7579',
    precompilesUsed: [QORECHAIN_PRECOMPILES.pqcVerify],
    status: 'DEPLOYED_LIVE',
    deployedAddress: '0xFcd34140F26AF7bCb8935DdeF90F1936b36A1FAe',
    deploymentTxHash: '0xee4c20364dc6978faee1e0f4dc75292e9cd81deb1bf08312eb73d8c125f59041',
    deploymentBlock: 10680154,
    constructorSummary: 'constructor()',
    purpose: `Stateless IERC7913SignatureVerifier returning ${ERC7913_MAGIC_VALUE} / 0xffffffff via 0x0A01 for OpenZeppelin AccountERC7579 smart accounts.`
  },
  {
    order: 8,
    phase: 'ADDITIVE_PQC_EXTENSIONS',
    contractName: 'TrexCrossVmBridgeModule',
    standard: 'ERC-7930 + QoreChain Cross-VM',
    precompilesUsed: [QORECHAIN_PRECOMPILES.crossVmBridge],
    status: 'DEPLOYED_LIVE',
    deployedAddress: '0x72E4B9507cBd76b9177d61c8a14bd127201EAE0C',
    deploymentTxHash: '0x6a59732ede95facde99d0b858a5d32063e6ffd2c9b8f36a956742304875e452c',
    deploymentBlock: 10680156,
    constructorSummary: `constructor(${QORECHAIN_SOVEREIGN_ROLES.SovereignOwner}, ${QORECHAIN_CONTRACTS.IdentityRegistryStorage}, false)`,
    purpose: `Atomic EVM-to-Native CosmWasm bridge invoking 0x0901 executeCrossVMCall(1, ${QORECHAIN_NATIVE_RECEIPTS_CONTRACT}, payload).`
  },
  {
    order: 9,
    phase: 'CROSS_VM_VERIFICATION',
    contractName: 'TrexCrossVmBridgeModule.dispatchIdentitySync (0x0901)',
    standard: 'Cross-VM, EVM to Native',
    precompilesUsed: [QORECHAIN_PRECOMPILES.crossVmBridge],
    status: 'DEPLOYED_LIVE',
    deployedAddress: '0x72E4B9507cBd76b9177d61c8a14bd127201EAE0C',
    deploymentTxHash: '0x369d3276f63d0114433078146402cc936e4f8ef0300d12c5b2668824fb6c8b87',
    deploymentBlock: 10680158,
    constructorSummary: 'dispatchIdentitySync(evmAccount, cosmosBech32, keyspaceDigest, identityRole)',
    purpose: 'Broadcasts one live atomic 0x0901 EVM-to-Native CosmWasm receipt transaction to verify the Cross-VM, EVM to Native badge on build.qorechain.io.'
  }
] as const;

export const BUILD_QORECHAIN_SUBMISSION_MAP = {
  deadlineUtc: '2026-12-02T23:59:00Z',
  shipWeeksFirstPqcCheck: {
    targetSection: 'My space -> Ship Weeks -> First contract with a PQC check',
    txHash: '0xc9e9e475ad65ef40c2cff03fc10e562ebd663eda63bc40522e99f01c7488fbfa',
    alternateTxHash: '0xee4c20364dc6978faee1e0f4dc75292e9cd81deb1bf08312eb73d8c125f59041',
    expectedProof: 'Broadcast deployment transaction hash of TrexPqcIdentityModule (calls 0x0A01 & 0x0A02) or PqcERC7913Verifier (calls 0x0A01).'
  },
  shipWeeksFirstQoreSealKey: {
    targetSection: 'My space -> Ship Weeks -> First QoreSeal key',
    txHash: 'B0070E96706158732A6AF774573E30FB696FE4D9F2CF1A1C7696129B2252CAB1',
    blockHeight: 10727844,
    senderBech32: 'qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad',
    algorithmName: 'mlkem1024',
    expectedProof: 'Confirmed MsgRegisterKEMKey transaction on qorechain-diana registering a 1,568-byte ML-KEM-1024 public key.'
  },
  shipWeeksFirstSwapInPool: {
    targetSection: 'My space -> Ship Weeks -> First swap in a pool',
    txHash: '9B77C0113F61EF6867C10222BB0A3774AE411FFADD4CB4C2A80270ECFD0E040A',
    blockHeight: 10727847,
    senderBech32: 'qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad',
    poolId: '2',
    expectedProof: 'Confirmed native Cosmos MsgSwapExactIn transaction on qorechain-diana Pool #2 (1000 uqor -> 27 erc20:0x97143B771D34ddb9130b807b135Ae675A5a963CA).'
  },
  crossVmBadgeVerification: {
    targetSection: 'Project card -> Check again (Cross-VM, EVM to Native)',
    txHash: '0x369d3276f63d0114433078146402cc936e4f8ef0300d12c5b2668824fb6c8b87',
    expectedProof: 'Confirmed transaction hash from TrexCrossVmBridgeModule.dispatchIdentitySync() invoking 0x0901 against qday-receipts-w3.'
  },
  editProjectChecklist: {
    targetSection: 'Edit project (before December 2, 2026 at 23:59 UTC)',
    testnetAddressesToAttach: [
      'qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad',
      'qor19y6ah0umdhueq85g9m30xvzrxxeujzcrcqeymm',
      'qor1xkgjactk7qpcqr4arfsgrx5a75g50ne6uwv0qr'
    ],
    contractAddressesToAttach: [
      '0x62600c1C206C089a68D53c65eE19A3f4A98e26a2',
      '0xFcd34140F26AF7bCb8935DdeF90F1936b36A1FAe',
      '0x72E4B9507cBd76b9177d61c8a14bd127201EAE0C',
      '0x174b948095D6D6d4692C1187977AE26bceB973c9',
      '0x1cd4A4FDe8f5189aEeFD88F00621c0410BE42EFb',
      '0xA5E22734a86f4099EEA5e3ed03C818149ebbD546',
      '0x110e9080FcB2DC0025262eD6eD213dc17dB6454E',
      '0x6A9ca1D10c054C5aE9f5F597c7662083110a9834'
    ],
    walkthroughVideoChecklist: [
      'Keep total runtime <= 3 minutes.',
      'Show live Diana Chain 9800 telemetry & 5 deployed ERC-3643 contracts (including CH-QOR-01).',
      'Show ONCHAINID v3 panel: 0x0A02 pqcKeyStatus probe, PqcERC7913Verifier (0x024ad318), and QoreSeal ML-KEM-1024 envelope.',
      'Demonstrate Diana Pre-Flight EVM Window readiness + live 0x0901 Cross-VM Identity Sync receipt on Diana Explorer.',
      'Highlight cbom.json, FINMA_PQC_REPORT.md, and 12/12 passing adversarial Hardhat tests.'
    ]
  }
} as const;
