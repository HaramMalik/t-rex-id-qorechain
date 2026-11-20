import { ethers } from 'ethers';

const getEnvVar = (viteKey: string, nextKey: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
    return import.meta.env[viteKey];
  }
  if (typeof process !== 'undefined' && process.env && process.env[nextKey]) {
    return process.env[nextKey] || fallback;
  }
  return fallback;
};

export const MASTER_SOVEREIGN_NODE_ADDRESS = "0x35912ee176F003800eBd1A60819A9Df51147cF3A";
export const TRUSTED_ISSUERS_REGISTRY_ADDRESS = "0x7C2892Ce9ad1584Cf0AA31De358699EfCebE9A11";
export const CLAIM_TOPICS_REGISTRY_ADDRESS = "0x59F6506948a54A3A22658E540Ba645614ac53EC7";
export const ZAMA_ACL_CONTRACT_ADDRESS = "0x44f76E60b52B286D8DAC637683B15c37CaD57Fb5";

export const REX_STORAGE_ADDRESS = getEnvVar("VITE_REX_STORAGE", "NEXT_PUBLIC_REX_STORAGE", "0x59F6506948a54A3A22658E540Ba645614ac53EC7");
export const REX_ISSUER_ADDRESS = getEnvVar("VITE_REX_ISSUER", "NEXT_PUBLIC_REX_ISSUER", "0x7C2892Ce9ad1584Cf0AA31De358699EfCebE9A11");
export const IDENTITY_REGISTRY_ADDRESS = getEnvVar("VITE_IDENTITY_REGISTRY", "NEXT_PUBLIC_IDENTITY_REGISTRY", "0xF555752b80FD128421730B540d2D63542C9221F6");
export const IDENTITY_REGISTRY_STORAGE_ADDRESS = getEnvVar("VITE_REGISTRY_STORAGE", "NEXT_PUBLIC_REGISTRY_STORAGE", "0x3Fe1C1c271cbfAd3165d1DDa93983F78646cA090");
export const TREX_TOKEN_ADDRESS = getEnvVar("VITE_TREX_TOKEN", "NEXT_PUBLIC_TREX_TOKEN", "0x7888aCc63D8bcEe8838C0cda3a433aD816f77ef2");

export const PROTOCOL_CONTRACTS = [
  {
    name: "Master Sovereign Node (Tier-1 QIB)",
    role: "Canonical Attestation Signer (Purpose 3) & Sovereign QIB Benchmark",
    standard: "ERC-734 / 735",
    address: MASTER_SOVEREIGN_NODE_ADDRESS,
    isDeployed: true,
    verified: true,
    bytecodeSize: "23 bytes",
    score: "98 / 100",
    repoUrl: `https://sepolia.etherscan.io/address/${MASTER_SOVEREIGN_NODE_ADDRESS}#code`
  },
  {
    name: "IdentityRegistryStorage",
    role: "Decoupled persistent on-chain identity storage anchor",
    standard: "ERC-3643",
    address: IDENTITY_REGISTRY_STORAGE_ADDRESS,
    isDeployed: true,
    verified: true,
    bytecodeSize: "1,270 bytes",
    score: "98 / 100",
    repoUrl: `https://sepolia.etherscan.io/address/${IDENTITY_REGISTRY_STORAGE_ADDRESS}#code`
  },
  {
    name: "TREX_IdentityRegistry Proxy",
    role: "Canonical registry proxy executing isVerified() & investor country lookups",
    standard: "ERC-3643",
    address: IDENTITY_REGISTRY_ADDRESS,
    isDeployed: true,
    verified: true,
    bytecodeSize: "11,292 bytes",
    score: "98 / 100",
    repoUrl: `https://sepolia.etherscan.io/address/${IDENTITY_REGISTRY_ADDRESS}#code`
  },
  {
    name: "TrustedIssuersRegistry",
    role: "Whitelisted institutional KYC/QIB claim issuer authority registry",
    standard: "ERC-735",
    address: TRUSTED_ISSUERS_REGISTRY_ADDRESS,
    isDeployed: true,
    verified: true,
    bytecodeSize: "11,385 bytes",
    score: "98 / 100",
    repoUrl: `https://sepolia.etherscan.io/address/${TRUSTED_ISSUERS_REGISTRY_ADDRESS}#code`
  },
  {
    name: "ClaimTopicsRegistry",
    role: "Mandatory topic registry enforcing Topics 100, 101, 103, 105",
    standard: "ERC-3643",
    address: CLAIM_TOPICS_REGISTRY_ADDRESS,
    isDeployed: true,
    verified: true,
    bytecodeSize: "3,304 bytes",
    score: "98 / 100",
    repoUrl: `https://sepolia.etherscan.io/address/${CLAIM_TOPICS_REGISTRY_ADDRESS}#code`
  },
  {
    name: "TrexFheComplianceHook",
    role: "Zama fhEVM ModularCompliance hook executing FHE.gte on-chain",
    standard: "ERC-7984 / FHE",
    address: "0x38CD3AFE1F791Cd7A134F2A57330e0DE3465C860",
    isDeployed: true,
    verified: true,
    bytecodeSize: "11,680 bytes",
    score: "98 / 100",
    repoUrl: "https://sepolia.etherscan.io/address/0x38CD3AFE1F791Cd7A134F2A57330e0DE3465C860#code"
  },
  {
    name: "Zama KMS Gateway (13-Node MPC)",
    role: "Post-quantum threshold MPC lattice KMS gateway & ML-KEM re-encryption",
    standard: "Zama KMS",
    address: "0x0309b4308A6AC121B9b3A960aC7Bc9bd8256cf38",
    isDeployed: true,
    verified: true,
    bytecodeSize: "170 bytes",
    score: "98 / 100",
    repoUrl: "https://sepolia.etherscan.io/address/0x0309b4308A6AC121B9b3A960aC7Bc9bd8256cf38#code"
  },
  {
    name: "Zama ACL Contract",
    role: "Access control list granting encrypted ciphertext evaluation rights",
    standard: "ERC-7984 ACL",
    address: ZAMA_ACL_CONTRACT_ADDRESS,
    isDeployed: true,
    verified: true,
    bytecodeSize: "1,827 bytes",
    score: "98 / 100",
    repoUrl: `https://sepolia.etherscan.io/address/${ZAMA_ACL_CONTRACT_ADDRESS}#code`
  },
  {
    name: "TREX RWA Security Token",
    role: "ERC-3643 permissioned token with Two-Gate ModularCompliance integration",
    standard: "ERC-3643",
    address: TREX_TOKEN_ADDRESS,
    isDeployed: true,
    verified: true,
    bytecodeSize: "4,969 bytes",
    score: "98 / 100",
    repoUrl: `https://sepolia.etherscan.io/address/${TREX_TOKEN_ADDRESS}#code`
  }
];

export const TREX_FHE_HOOK_ADDRESS = "0x38CD3AFE1F791Cd7A134F2A57330e0DE3465C860";
export const ZAMA_COMPLIANCE_HOOK_ADDRESS = TREX_FHE_HOOK_ADDRESS;
export const ZAMA_KMS_GATEWAY_ADDRESS = "0x0309b4308A6AC121B9b3A960aC7Bc9bd8256cf38";
export const LAYERZERO_V2_ENDPOINT_SEPOLIA = "0x6EDCE65403992e310A62460808c4b910D972f10f";

export const SEPOLIA_CONTRACT_ADDRESSES = {
  identityRegistry: ethers.getAddress(IDENTITY_REGISTRY_ADDRESS),
  identityRegistryStorage: ethers.getAddress(IDENTITY_REGISTRY_STORAGE_ADDRESS),
  trustedIssuersRegistry: ethers.getAddress(TRUSTED_ISSUERS_REGISTRY_ADDRESS),
  claimTopicsRegistry: ethers.getAddress(CLAIM_TOPICS_REGISTRY_ADDRESS),
  trexToken: ethers.getAddress(TREX_TOKEN_ADDRESS),
  reputationStorage: ethers.getAddress(REX_STORAGE_ADDRESS),
  reputationClaimIssuer: ethers.getAddress(REX_ISSUER_ADDRESS),
  claimIssuer: ethers.getAddress(REX_ISSUER_ADDRESS),
  legacyClaimIssuer: ethers.getAddress("0x1ada75e2a76Cabe7595A0618b35A6AaBF5131e88"),
  claimModule: ethers.getAddress("0x7C2892Ce9ad1584Cf0AA31De358699EfCebE9A11"),
  identityFactory: ethers.getAddress(IDENTITY_REGISTRY_ADDRESS),
  trexOApp: ethers.getAddress("0x1ada75e2a76Cabe7595A0618b35A6AaBF5131e88"),
  reputationCompliance: ethers.getAddress(ZAMA_ACL_CONTRACT_ADDRESS),
  trexFheComplianceHook: ethers.getAddress(TREX_FHE_HOOK_ADDRESS),
  zamaKmsGateway: ethers.getAddress(ZAMA_KMS_GATEWAY_ADDRESS),
  layerZeroEndpoint: ethers.getAddress(LAYERZERO_V2_ENDPOINT_SEPOLIA)
};

export const REPUTATION_COMPLIANCE_ABI = [
  'function canTransfer(address from, address to, uint256 amount) external view returns (bool)',
  'function setRevocationStatus(address identity, bool status) external',
  'function isRevoked(address identity) external view returns (bool)',
  'event RevocationStatusChanged(address indexed identity, bool indexed revoked)'
];

export const SEPOLIA_RPC_PROVIDERS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.drpc.org",
  "https://rpc.ankr.com/eth_sepolia",
  "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
  "https://1rpc.io/sepolia"
];

export const SEPOLIA_RPC_ENDPOINTS = SEPOLIA_RPC_PROVIDERS;

export const REX_REPUTATION_STORAGE_ABI = [
  'function owner() external view returns (address)',
  'function authorizedIssuer() external view returns (address)',
  'function getNonce(address _identity) external view returns (uint256)',
  'function recordScore(address _identity, uint256 _score, string memory _tier, uint256 _validUntil) external',
  'function getReputationRecord(address _identity) external view returns (uint256 score, string memory tier, uint256 lastUpdated, address issuer, uint256 nonce)',
  'function hasReputationRecord(address _identity) external view returns (bool)',
  'function setReputationRecord(address _identity, uint256 _score, string calldata _tier, address _issuer, uint256 _nonce) external',
  'event ReputationRecordSet(address indexed identity, uint256 score, string tier, uint256 lastUpdated, address indexed issuer, uint256 nonce)'
];

export const REX_REPUTATION_CLAIM_ISSUER_ABI = [
  'function getNonce(address _identity) external view returns (uint256)',
  'function claimSignerAuthority() external view returns (address)',
  'function storageContract() external view returns (address)',
  'function DOMAIN_SEPARATOR() external view returns (bytes32)',
  'function quoteDispatch(uint32 _dstEid, address _identity, uint256 _score, bytes32 _tier, bytes calldata _options) external view returns (uint256)',
  'function submitAndDispatchReputation(address _identity, uint256 _score, bytes32 _tier, uint256 _validUntil, bytes calldata _signature, uint32 _dstEid, bytes calldata _options) external payable returns (bytes32 guid)',
  'function submitReputationScore(address identity, uint256 score, string calldata tier, uint256 validUntil, uint256 nonce, bytes calldata signature) external returns (bytes32 claimDigest)',
  'event Topic105Dispatched(address indexed identity, uint256 score, bytes32 tier, uint32 indexed dstEid, bytes32 guid, uint256 nativeFee)'
];

export const ONCHAIN_IDENTITY_ABI = [
  'function getKey(bytes32 key) external view returns (uint256[] purposes, uint256 keyType, bytes32 key)',
  'function keyHasPurpose(bytes32 key, uint256 purpose) external view returns (bool)',
  'function execute(address to, uint256 value, bytes data) external payable returns (uint256)',
  'function getClaim(bytes32 claimId) external view returns (uint256 topic, uint256 scheme, address issuer, bytes signature, bytes data, string uri)',
  'function addClaim(uint256 topic, uint256 scheme, address issuer, bytes signature, bytes data, string uri) external returns (bytes32)',
  'function removeClaim(bytes32 claimId) external returns (bool)'
];

export const TREX_TOKEN_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function mint(address to, uint256 amount) external',
  'function isAgent(address agent) external view returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

export const IDENTITY_REGISTRY_ABI = [
  'function contains(address investor) external view returns (bool)',
  'function isVerified(address investor) external view returns (bool)',
  'function identity(address investor) external view returns (address)',
  'function investorCountry(address investor) external view returns (uint16)',
  'function registerIdentity(address investor, address identityProxy, uint16 countryCode) external',
  'event IdentityRegistered(address indexed investor, address indexed identityProxy, uint16 countryCode)'
];

export const IDENTITY_REGISTRY_STORAGE_ABI = [
  'function storedIdentity(address investorAddress) external view returns (address)',
  'function getIdentity(address investorAddress) external view returns (address)',
  'function identity(address investorAddress) external view returns (address)',
  'function storedCountryCode(address investorAddress) external view returns (uint16)',
  'function identityRegistry() external view returns (address)',
  'function owner() external view returns (address)'
];

export const TRUSTED_ISSUERS_REGISTRY_ABI = [
  'function isTrustedIssuer(address issuer) external view returns (bool)',
  'function getTrustedIssuers() external view returns (address[] memory)',
  'function getTrustedIssuersForClaimTopic(uint256 claimTopic) external view returns (address[] memory)',
  'function hasClaimTopic(address issuer, uint256 claimTopic) external view returns (bool)'
];

export const TREX_FHE_COMPLIANCE_HOOK_ABI = [
  'function validateAndTransfer(address from, address to, bytes32 encryptedAmountHandle, bytes calldata inputProof) external returns (bool approved, bytes32 predicateHandle)',
  'function registerEncryptedBalance(address account, bytes32 balanceHandle) external',
  'function getEncryptedBalanceHandle(address account) external view returns (bytes32)',
  'function zamaKmsGateway() external view returns (address)',
  'function identityRegistry() external view returns (address)',
  'event ConfidentialTransferValidated(address indexed from, address indexed to, bytes32 indexed encryptedAmountHandle, bytes32 predicateResultHandle, bool isApproved, uint256 timestamp)',
  'event EncryptedBalanceRegistered(address indexed account, bytes32 indexed balanceHandle)'
];

export const OPTIMISM_SEPOLIA_RPC_PROVIDERS = [
  "https://sepolia.optimism.io",
  "https://optimism-sepolia.drpc.org",
  "https://optimism-sepolia-rpc.publicnode.com"
];

export const OPTIMISM_SEPOLIA_RPC_ENDPOINTS = OPTIMISM_SEPOLIA_RPC_PROVIDERS;

export const SEPOLIA_EID = 40161;
export const TARGET_OMNICHAIN_EID = 40232; // Optimism Sepolia EID
export const LZ_EXECUTOR_OPTIONS = "0x0003010011010000000000000000000000000003d090";

export function getFallbackProvider(): ethers.FallbackProvider {
  const providers = SEPOLIA_RPC_ENDPOINTS.map((url, index) => ({
    provider: new ethers.JsonRpcProvider(url, 11155111, { staticNetwork: true }),
    priority: index + 1,
    weight: 1,
    stallTimeout: 2000
  }));
  return new ethers.FallbackProvider(providers, 1);
}

export function getOptimismFallbackProvider(): ethers.FallbackProvider {
  const providers = OPTIMISM_SEPOLIA_RPC_ENDPOINTS.map((url, index) => ({
    provider: new ethers.JsonRpcProvider(url, 11155420, { staticNetwork: true }),
    priority: index + 1,
    weight: 1,
    stallTimeout: 2000
  }));
  return new ethers.FallbackProvider(providers, 1);
}

