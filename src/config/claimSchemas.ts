import {
  ONCHAINID_V3_KEY_PURPOSES,
  ONCHAINID_V3_IDENTITY_TYPES,
  type OnchainIdV3KeyPurposeSpec,
  type OnchainIdV3IdentityType,
  type OnchainIdV3IdentityTypeSpec
} from '../services/qorechainPqcService';

export {
  ONCHAINID_V3_KEY_PURPOSES,
  ONCHAINID_V3_IDENTITY_TYPES,
  type OnchainIdV3KeyPurposeSpec,
  type OnchainIdV3IdentityType,
  type OnchainIdV3IdentityTypeSpec
};

export interface ClaimTopicSchema {
  topic: number;
  code: string;
  title: string;
  executiveDescription: string;
  badgeLabel: string;
  category: 'IDENTITY' | 'ACCREDITATION' | 'PRIVACY' | 'REPUTATION';
}

export const CLAIM_TOPIC_SCHEMAS: Record<number, ClaimTopicSchema> = {
  100: {
    topic: 100,
    code: 'KYC_AML_CLEARANCE',
    title: 'Global KYC / AML Compliance Clearance',
    executiveDescription: 'Verified sovereign identity clearance under International FATF and MiCA frameworks.',
    badgeLabel: 'KYC / AML Cleared',
    category: 'IDENTITY'
  },
  101: {
    topic: 101,
    code: 'QIB_SEC_RULE_144A',
    title: 'Qualified Institutional Buyer (QIB) Accreditation (SEC Rule 144A)',
    executiveDescription: 'Qualified Institutional Buyer credential under SEC Rule 144A / Regulation S.',
    badgeLabel: 'QIB Accredited',
    category: 'ACCREDITATION'
  },
  103: {
    topic: 103,
    code: 'ZAMA_FHE_SHIELDING',
    title: 'Zama fhEVM Confidential Shielding (Zero-PII)',
    executiveDescription: 'Fully Homomorphic Encrypted privacy shield protecting confidential transaction amounts and balances on-chain.',
    badgeLabel: 'Zama Shielded',
    category: 'PRIVACY'
  },
  105: {
    topic: 105,
    code: 'INSTITUTIONAL_BITMASK',
    title: '256-Bit Institutional Reputation Bitmask',
    executiveDescription: 'Cryptographic bitmask verifying liquidity, solvency, and historical protocol compliance.',
    badgeLabel: 'Reputation Verified',
    category: 'REPUTATION'
  }
};

export const FHE_PREDICATE_TRANSLATIONS: Record<string, { title: string; description: string }> = {
  'FHE.gte': {
    title: 'Institutional Solvency & Reserve Clearance',
    description: 'Validates that encrypted balance is greater than or equal to the minimum required transfer threshold.'
  },
  'FHE.req': {
    title: 'Regulatory Transfer Restriction Hook',
    description: 'Enforces on-chain compliance rules using homomorphic equality evaluation without decrypting underlying user state.'
  }
};

export const ERC7930_ENVELOPE_SCHEMA = {
  standard: 'ERC-7930 Interoperable Addresses + ONCHAINID v3 (ERC-7579)',
  versionBytes: '0x0001',
  supportedKeyPurposesCount: 6,
  supportedIdentityTypesCount: 8,
  unifiedVmBindings: ['EVM Hex (eip155:9800)', 'QoreChain Cosmos Bech32 (qor1...)']
} as const;

export function getClaimTopicSchema(topic: number): ClaimTopicSchema {
  return CLAIM_TOPIC_SCHEMAS[topic] || {
    topic,
    code: `TOPIC_${topic}`,
    title: `ERC-3643 Claim Topic ${topic}`,
    executiveDescription: `Custom Verified ERC-3643 Attestation Claim (Topic ${topic}).`,
    badgeLabel: `Topic ${topic} Valid`,
    category: 'IDENTITY'
  };
}

export function translateFhePredicate(predicateName: string): { title: string; description: string } {
  return FHE_PREDICATE_TRANSLATIONS[predicateName] || {
    title: `${predicateName} Homomorphic Evaluation`,
    description: 'Encrypted homomorphic predicate execution on Zama fhEVM.'
  };
}
