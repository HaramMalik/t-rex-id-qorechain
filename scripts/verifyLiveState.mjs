import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://evm-testnet.qore.host', 9800, { staticNetwork: true });

const contracts = {
  IdentityRegistryStorage: {
    evm: ethers.getAddress('0x174b948095D6D6d4692C1187977AE26bceB973c9'.toLowerCase()),
    bech32: 'qor1za9efqy46mtdg6fvzxrew7hzd08tju7fsc8t79'
  },
  TrustedIssuersRegistry: {
    evm: ethers.getAddress('0x1cd4A4FDe8f5189aEeFD88F00621c0410BE42EFb'.toLowerCase()),
    bech32: 'qor1rn22fl0g75vf4mha3rcqvgwqgy97gthml34fee'
  },
  ModularCompliance: {
    evm: ethers.getAddress('0xA5E22734a86f4099EEA5e3ed03C818149ebbD546'.toLowerCase()),
    bech32: 'qor15h3zwd9gdaqfnm49u0ks8jqczj0th42xdalqat'
  },
  TREXFactory: {
    evm: ethers.getAddress('0x110e9080FcB2DC0025262eD6eD213dc17dB6454E'.toLowerCase()),
    bech32: 'qor1zy8fpq8uktwqqffx9mtw6gfac97mv32w869yvz'
  },
  SwissQuantumBondToken: {
    evm: ethers.getAddress('0x6A9ca1D10c054C5aE9f5F597c7662083110a9834'.toLowerCase()),
    bech32: 'qor1d2w2r5gvq4x946047ktuwe3qsvgs4xp5w9fzs2'
  }
};

async function main() {
  console.log('==================================================================');
  console.log('=== T-REX ID x QORECHAIN DIANA LIVE BYTECODE & STATE VERIFIER ===');
  console.log('==================================================================');

  const block = await provider.getBlockNumber();
  console.log(`Current Diana Block Height: #${block.toLocaleString()}\n`);

  for (const [name, addr] of Object.entries(contracts)) {
    const code = await provider.getCode(addr.evm);
    const isLive = Boolean(code && code !== '0x' && code.length > 2);
    const bytes = code && code !== '0x' ? (code.length - 2) / 2 : 0;
    console.log(`[${isLive ? 'LIVE ON-CHAIN' : 'MISSING'}]: ${name}`);
    console.log(`  EVM:    ${addr.evm}`);
    console.log(`  Bech32: ${addr.bech32}`);
    console.log(`  Bytes:  ${bytes} bytes\n`);
  }

  const tokenAbi = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function owner() view returns (address)'
  ];
  const token = new ethers.Contract(contracts.SwissQuantumBondToken.evm, tokenAbi, provider);
  console.log('=== SWISS QUANTUM BOND TOKEN (CH-QOR-01) REAL-TIME STATE ===');
  console.log('Token Name:     ', await token.name());
  console.log('Token Symbol:   ', await token.symbol());
  console.log('Token Decimals: ', Number(await token.decimals()));
  console.log('Token Owner:    ', await token.owner());
}

main().catch((err) => {
  console.error('[Verification Error]:', err);
  process.exit(1);
});
