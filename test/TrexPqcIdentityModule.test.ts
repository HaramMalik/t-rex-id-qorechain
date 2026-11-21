import { expect } from "chai";
import hre from "hardhat";

describe("TrexPqcIdentityModule (ERC-3643 + ONCHAINID v3 + QoreChain 0x0A01/0x0A02)", function () {
  const PQC_VERIFY_PRECOMPILE = "0x0000000000000000000000000000000000000a01";
  const PQC_KEY_STATUS_PRECOMPILE = "0x0000000000000000000000000000000000000a02";
  const SAMPLE_MLDSA_PUBKEY = "0x" + "ab".repeat(2592);
  const SAMPLE_MLDSA_SIG = "0x" + "cd".repeat(128);

  async function deployFixture() {
    const { ethers, networkHelpers } = await hre.network.connect();
    const [owner, compliance, alice, bob, issuer, attacker] = await ethers.getSigners();

    // Deploy mock precompiles and inject their runtime bytecode at QoreChain precompile addresses
    const MockKeyStatusFactory = await ethers.getContractFactory("MockPqcKeyStatusPrecompile");
    const mockKeyStatusImpl = await MockKeyStatusFactory.deploy();
    const keyStatusRuntime = await ethers.provider.getCode(await mockKeyStatusImpl.getAddress());
    await networkHelpers.setCode(PQC_KEY_STATUS_PRECOMPILE, keyStatusRuntime);

    const MockVerifyFactory = await ethers.getContractFactory("MockPqcVerifyPrecompile");
    const mockVerifyImpl = await MockVerifyFactory.deploy();
    const verifyRuntime = await ethers.provider.getCode(await mockVerifyImpl.getAddress());
    await networkHelpers.setCode(PQC_VERIFY_PRECOMPILE, verifyRuntime);

    const mockKeyStatus = await ethers.getContractAt("MockPqcKeyStatusPrecompile", PQC_KEY_STATUS_PRECOMPILE);
    const mockVerify = await ethers.getContractAt("MockPqcVerifyPrecompile", PQC_VERIFY_PRECOMPILE);

    const RegistryFactory = await ethers.getContractFactory("MockTrexIdentityRegistry");
    const registry = await RegistryFactory.deploy();

    const ModuleFactory = await ethers.getContractFactory("TrexPqcIdentityModule");
    const module = await ModuleFactory.deploy(owner.address, await registry.getAddress());

    return {
      ethers,
      networkHelpers,
      owner,
      compliance,
      alice,
      bob,
      issuer,
      attacker,
      mockKeyStatus,
      mockVerify,
      registry,
      module
    };
  }

  it("enforces ERC-3643 compliance binding and metadata invariants", async function () {
    const { owner, compliance, attacker, module } = await deployFixture();

    expect(await module.name()).to.equal("TrexPqcIdentityModule");
    expect(await module.isPlugAndPlay()).to.equal(true);
    expect(await module.canComplianceBind(compliance.address)).to.equal(true);

    // Only compliance contract itself can bind
    await expect(
      module.connect(attacker).bindCompliance(compliance.address)
    ).to.be.revertedWithCustomError(module, "OnlyComplianceCanBind");

    await expect(module.connect(compliance).bindCompliance(compliance.address))
      .to.emit(module, "ComplianceBound")
      .withArgs(compliance.address);

    expect(await module.isComplianceBound(compliance.address)).to.equal(true);

    // Bound compliance can trigger module hooks; unbound reverts
    await module.connect(compliance).moduleTransferAction(owner.address, attacker.address, 100n);
    await expect(
      module.connect(attacker).moduleMintAction(attacker.address, 100n)
    ).to.be.revertedWithCustomError(module, "ComplianceNotBound");
  });

  it("gates ERC-3643 transfers on 0x0A02 pqcKeyStatus (ML-DSA-87 + possessionProven) and IdentityRegistry", async function () {
    const { ethers, owner, compliance, alice, bob, mockKeyStatus, registry, module } = await deployFixture();

    // Neither Alice nor Bob has an ML-DSA-87 key or IdentityRegistry verification
    expect(await module.moduleCheck(ethers.ZeroAddress, alice.address, 100n, compliance.address)).to.equal(false);

    // Register Alice on 0x0A02 WITHOUT possessionProven -> MUST still fail closed
    await mockKeyStatus.setKeyStatus(alice.address, true, 1, SAMPLE_MLDSA_PUBKEY, false);
    await registry.setVerified(alice.address, true);
    expect(await module.isHybridHolder(alice.address)).to.equal(false);
    expect(await module.moduleCheck(ethers.ZeroAddress, alice.address, 100n, compliance.address)).to.equal(false);

    // Prove possession for Alice -> mint allowed; transfer to unverified Bob still blocked
    await mockKeyStatus.setKeyStatus(alice.address, true, 1, SAMPLE_MLDSA_PUBKEY, true);
    expect(await module.isHybridHolder(alice.address)).to.equal(true);
    expect(await module.moduleCheck(ethers.ZeroAddress, alice.address, 100n, compliance.address)).to.equal(true);
    expect(await module.moduleCheck(alice.address, bob.address, 50n, compliance.address)).to.equal(false);

    // Verify Bob in T-REX IdentityRegistry AND mark Bob exempt (e.g. institutional custody contract)
    await registry.setVerified(bob.address, true);
    await module.connect(owner).setExempt(bob.address, true, "Qualified Custodian Vault");
    expect(await module.moduleCheck(alice.address, bob.address, 50n, compliance.address)).to.equal(true);

    // Burns / redemptions (to == address(0)) are always allowed so holders can exit
    expect(await module.moduleCheck(alice.address, ethers.ZeroAddress, 50n, compliance.address)).to.equal(true);
  });

  it("fails closed when 0x0A02 precompile is absent or returns non-ML-DSA-87 key", async function () {
    const { networkHelpers, alice, mockKeyStatus, module } = await deployFixture();

    // Algorithm ID 2 (non-ML-DSA-87) must fail closed
    await mockKeyStatus.setKeyStatus(alice.address, true, 2, SAMPLE_MLDSA_PUBKEY, true);
    expect(await module.isHybridHolder(alice.address)).to.equal(false);

    // Precompile code absent (mainnet / unactivated node) must fail closed without reverting
    await networkHelpers.setCode(PQC_KEY_STATUS_PRECOMPILE, "0x");
    expect(await module.precompileActive()).to.equal(false);
    expect(await module.isHybridHolder(alice.address)).to.equal(false);
  });

  it("verifies ONCHAINID v3 ERC-735 claims via 0x0A02 + 0x0A01 (pqcVerify)", async function () {
    const { ethers, alice, issuer, mockKeyStatus, mockVerify, module } = await deployFixture();

    const topic = 105n;
    const claimData = ethers.toUtf8Bytes("FINMA_QIB_VERIFIED_2026");
    const claimDigest = ethers.keccak256(
      ethers.solidityPacked(["address", "uint256", "bytes"], [alice.address, topic, claimData])
    );

    await mockKeyStatus.setKeyStatus(issuer.address, true, 1, SAMPLE_MLDSA_PUBKEY, true);
    await mockVerify.setAcceptedProof(SAMPLE_MLDSA_PUBKEY, SAMPLE_MLDSA_SIG, claimDigest, true);

    expect(
      await module.verifyOnchainIdClaimPqc(issuer.address, topic, alice.address, claimData, SAMPLE_MLDSA_SIG)
    ).to.equal(true);

    // Tampered claim data must return false
    const tamperedData = ethers.toUtf8Bytes("FINMA_QIB_TAMPERED");
    expect(
      await module.verifyOnchainIdClaimPqc(issuer.address, topic, alice.address, tamperedData, SAMPLE_MLDSA_SIG)
    ).to.equal(false);
  });

  it("anchors ONCHAINID v3 ERC-7930 interoperable address envelopes with 0x0A01 pqcVerify check", async function () {
    const { ethers, alice, attacker, mockKeyStatus, mockVerify, module } = await deployFixture();

    const cosmosAddr = "qor1d2w2r5gvq4x946047ktuwe3qsvgs4xp5w9fzs2";
    const digest = ethers.keccak256(ethers.toUtf8Bytes("ONCHAINID_V3_INSTITUTION"));
    const payload = ethers.solidityPacked(
      ["address", "string", "bytes32"],
      [alice.address, cosmosAddr, digest]
    );

    await mockKeyStatus.setKeyStatus(alice.address, true, 1, SAMPLE_MLDSA_PUBKEY, true);
    await mockVerify.setAcceptedProof(SAMPLE_MLDSA_PUBKEY, SAMPLE_MLDSA_SIG, payload, true);

    // Unauthorized attacker cannot anchor Alice's envelope
    await expect(
      module.connect(attacker).anchorErc7930Envelope(alice.address, cosmosAddr, digest, 1, SAMPLE_MLDSA_SIG)
    ).to.be.revertedWithCustomError(module, "UnauthorizedEnvelopeAnchor");

    // Alice anchors with live 0x0A01 PQC proof
    await expect(
      module.connect(alice).anchorErc7930Envelope(alice.address, cosmosAddr, digest, 1, SAMPLE_MLDSA_SIG)
    )
      .to.emit(module, "Erc7930EnvelopeAnchored")
      .withArgs(alice.address, cosmosAddr, digest, 1, true);

    const env = await module.getErc7930Envelope(alice.address);
    expect(env.cosmosBech32).to.equal(cosmosAddr);
    expect(env.keyspaceDigest).to.equal(digest);
    expect(env.identityRole).to.equal(1n);
    expect(env.pqcVerified).to.equal(true);
  });
});
