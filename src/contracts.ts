import { ethers } from 'ethers';
import { IDENTITY_REGISTRY_ADDRESS, IDENTITY_REGISTRY_STORAGE_ADDRESS, REX_ISSUER_ADDRESS, REX_STORAGE_ADDRESS, TREX_TOKEN_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ADDRESS, CLAIM_TOPICS_REGISTRY_ADDRESS } from './config/contracts';

export { IDENTITY_REGISTRY_ADDRESS, IDENTITY_REGISTRY_STORAGE_ADDRESS, REX_ISSUER_ADDRESS, REX_STORAGE_ADDRESS, TREX_TOKEN_ADDRESS, TRUSTED_ISSUERS_REGISTRY_ADDRESS, CLAIM_TOPICS_REGISTRY_ADDRESS };

export const ERC734_KEY_PURPOSES = {
  MANAGEMENT: 1,   // Root administrative control
  ACTION: 2,       // Operational execution signers
  CLAIM_SIGNER: 3, // Authorized attestation signers (Topic 100-105)
  ENCRYPTION: 4,   // Post-quantum ML-KEM-1024 / @qorechain/qoreseal encryption key
  CLAIM_ADDER: 5,  // Delegated ERC-7579 claim insertion key
  PROPOSER: 6      // Governance & timelocked rotation proposer
};

export const ONCHAIN_IDENTITY_ABI = [
  'function getKey(bytes32 key) external view returns (uint256[] purposes, uint256 keyType, bytes32 key)',
  'function keyHasPurpose(bytes32 key, uint256 purpose) external view returns (bool)',
  'function getClaim(bytes32 claimId) external view returns (uint256 topic, uint256 scheme, address issuer, bytes signature, bytes data, string uri)',
  'function getClaimIdsByTopic(uint256 topic) external view returns (bytes32[])',
  'function execute(address to, uint256 value, bytes data) external payable returns (uint256)',
  'function addKey(bytes32 key, uint256 purpose, uint256 keyType) external returns (bool)',
  'function removeKey(bytes32 key, uint256 purpose) external returns (bool)'
];

export const IDENTITY_REGISTRY_STORAGE_ABI = [
  'function getIdentity(address investor) external view returns (address)',
  'function investorCountry(address investor) external view returns (uint16)',
  'function registry() external view returns (address)',
  'function setRegistry(address _registry) external',
  'function addInvestor(address investor, address identity) external',
  'function removeInvestor(address investor) external'
];

export const TRUSTED_ISSUERS_REGISTRY_ABI = [
  'function isTrustedIssuer(address issuer) external view returns (bool)',
  'function getTrustedIssuerClaimTopics(address issuer) external view returns (uint256[])',
  'function getTrustedIssuers() external view returns (address[])',
  'function hasClaimTopic(address issuer, uint256 claimTopic) external view returns (bool)'
];

export const IDENTITY_REGISTRY_ABI = [
  'function contains(address investor) external view returns (bool)',
  'function isVerified(address investor) external view returns (bool)',
  'function identity(address investor) external view returns (address)',
  'function investorCountry(address investor) external view returns (uint16)',
  'function registerIdentity(address investor, address identityProxy, uint16 countryCode) external'
];

export const SEPOLIA_CONTRACTS = {
  identityRegistry: IDENTITY_REGISTRY_ADDRESS,
  identityRegistryStorage: IDENTITY_REGISTRY_STORAGE_ADDRESS,
  trustedIssuersRegistry: TRUSTED_ISSUERS_REGISTRY_ADDRESS,
  claimTopicsRegistry: CLAIM_TOPICS_REGISTRY_ADDRESS,
  trexToken: TREX_TOKEN_ADDRESS,
  reputationStorage: REX_STORAGE_ADDRESS,
  reputationClaimIssuer: REX_ISSUER_ADDRESS,
  targetEid: 40232 // Optimism Sepolia EID
};
