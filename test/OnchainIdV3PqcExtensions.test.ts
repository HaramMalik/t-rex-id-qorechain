import { expect } from "chai";
import hre from "hardhat";

describe("ONCHAINID v3 Post-Quantum Extensions (PqcERC7913Verifier + TrexCrossVmBridgeModule)", function () {
  const PQC_VERIFY_PRECOMPILE = "0x0000000000000000000000000000000000000a01";
  const CROSS_VM_BRIDGE_PRECOMPILE = "0x0000000000000000000000000000000000000901";
  const DEFAULT_NATIVE_RECEIPTS =
    "qor1xjayq5ev55tkzpml9klxwyshr7gdrha0nurha9jhm0f0gdckksgs3gltw8";
  const ERC7913_MAGIC_VALUE = "0x024ad318";
  const ERC7913_INVALID = "0xffffffff";

  const SAMPLE_MLDSA_PUBKEY = "0x" + "ab".repeat(2592);
  const SAMPLE_MLDSA_SIG = "0x" + "cd".repeat(128);

  async function deployExtensionsFixture() {
    const { ethers, networkHelpers } = await hre.network.connect();
    const [owner, alice, bob, attacker] = await ethers.getSigners();

    // Inject MockPqcVerifyPrecompile at 0x0A01
    const MockVerifyFactory = await ethers.getContractFactory("MockPqcVerifyPrecompile");
    const mockVerifyImpl = await MockVerifyFactory.deploy();
    const verifyRuntime = await ethers.provider.getCode(await mockVerifyImpl.getAddress());
    await networkHelpers.setCode(PQC_VERIFY_PRECOMPILE, verifyRuntime);
    const mockVerify = await ethers.getContractAt("MockPqcVerifyPrecompile", PQC_VERIFY_PRECOMPILE);

    // Inject MockCrossVmBridgePrecompile at 0x0901
    const MockBridgeFactory = await ethers.getContractFactory("MockCrossVmBridgePrecompile");
    const mockBridgeImpl = await MockBridgeFactory.deploy();
    const bridgeRuntime = await ethers.provider.getCode(await mockBridgeImpl.getAddress());
    await networkHelpers.setCode(CROSS_VM_BRIDGE_PRECOMPILE, bridgeRuntime);
    const mockBridge = await ethers.getContractAt(
      "MockCrossVmBridgePrecompile",
      CROSS_VM_BRIDGE_PRECOMPILE
    );

    // Deploy MockTrexIdentityRegistry
    const RegistryFactory = await ethers.getContractFactory("MockTrexIdentityRegistry");
    const registry = await RegistryFactory.deploy();

    // Deploy PqcERC7913Verifier
    const VerifierFactory = await ethers.getContractFactory("PqcERC7913Verifier");
    const verifier = await VerifierFactory.deploy();

    // Deploy TrexCrossVmBridgeModule (with identity verification initially disabled for permissionless sync)
    const BridgeModuleFactory = await ethers.getContractFactory("TrexCrossVmBridgeModule");
    const bridgeModule = await BridgeModuleFactory.deploy(
      owner.address,
      await registry.getAddress(),
      false
    );

    return {
      ethers,
      networkHelpers,
      owner,
      alice,
      bob,
      attacker,
      mockVerify,
      mockBridge,
      registry,
      verifier,
      bridgeModule
    };
  }

  describe("PqcERC7913Verifier (ONCHAINID v3 / OpenZeppelin AccountERC7579)", function () {
    it("returns canonical ERC-7913 magic selector 0x024ad318 for valid ML-DSA-87 proof via 0x0A01", async function () {
      const { ethers, mockVerify, verifier } = await deployExtensionsFixture();

      expect(await verifier.ERC7913_MAGIC_VALUE()).to.equal(ERC7913_MAGIC_VALUE);
      expect(await verifier.ERC7913_INVALID()).to.equal(ERC7913_INVALID);
      expect(await verifier.ML_DSA_87_ALG_ID()).to.equal(1n);
      expect(await verifier.precompileActive()).to.equal(true);

      const digest = ethers.keccak256(ethers.toUtf8Bytes("ONCHAINID_V3_USEROP_HASH"));
      await mockVerify.setAcceptedProof(SAMPLE_MLDSA_PUBKEY, SAMPLE_MLDSA_SIG, digest, true);

      expect(await verifier.verify(SAMPLE_MLDSA_PUBKEY, digest, SAMPLE_MLDSA_SIG)).to.equal(
        ERC7913_MAGIC_VALUE
      );

      // Tampered digest must return 0xffffffff (fail closed, no revert)
      const tamperedDigest = ethers.keccak256(ethers.toUtf8Bytes("TAMPERED_HASH"));
      expect(
        await verifier.verify(SAMPLE_MLDSA_PUBKEY, tamperedDigest, SAMPLE_MLDSA_SIG)
      ).to.equal(ERC7913_INVALID);
    });

    it("fails closed with 0xffffffff on empty inputs or absent 0x0A01 precompile", async function () {
      const { ethers, networkHelpers, verifier } = await deployExtensionsFixture();
      const digest = ethers.keccak256(ethers.toUtf8Bytes("EMPTY_CHECK"));

      // Empty key or empty signature must return 0xffffffff
      expect(await verifier.verify("0x", digest, SAMPLE_MLDSA_SIG)).to.equal(ERC7913_INVALID);
      expect(await verifier.verify(SAMPLE_MLDSA_PUBKEY, digest, "0x")).to.equal(ERC7913_INVALID);

      // Absent 0x0A01 precompile bytecode must fail closed without reverting
      await networkHelpers.setCode(PQC_VERIFY_PRECOMPILE, "0x");
      expect(await verifier.precompileActive()).to.equal(false);
      expect(await verifier.verify(SAMPLE_MLDSA_PUBKEY, digest, SAMPLE_MLDSA_SIG)).to.equal(
        ERC7913_INVALID
      );
    });

    it("validates packed ERC-7913 Signer bytes (abi.encodePacked(verifier, pubkey)) for ONCHAINID v3", async function () {
      const { ethers, mockVerify, verifier } = await deployExtensionsFixture();
      const verifierAddress = await verifier.getAddress();
      const digest = ethers.keccak256(ethers.toUtf8Bytes("ACCOUNT_ERC7579_EXECUTION"));

      await mockVerify.setAcceptedProof(SAMPLE_MLDSA_PUBKEY, SAMPLE_MLDSA_SIG, digest, true);

      const packedSigner = ethers.solidityPacked(
        ["address", "bytes"],
        [verifierAddress, SAMPLE_MLDSA_PUBKEY]
      );
      expect(
        await verifier.isValidOnchainIdV3Signer(packedSigner, digest, SAMPLE_MLDSA_SIG)
      ).to.equal(true);

      // Truncated signer (<= 20 bytes) or empty signature returns false
      expect(
        await verifier.isValidOnchainIdV3Signer(verifierAddress, digest, SAMPLE_MLDSA_SIG)
      ).to.equal(false);
      expect(await verifier.isValidOnchainIdV3Signer(packedSigner, digest, "0x")).to.equal(false);

      // External non-verifier address returns false cleanly (fail closed)
      const externalSigner = ethers.solidityPacked(
        ["address", "bytes"],
        [ethers.ZeroAddress, SAMPLE_MLDSA_PUBKEY]
      );
      expect(
        await verifier.isValidOnchainIdV3Signer(externalSigner, digest, SAMPLE_MLDSA_SIG)
      ).to.equal(false);
    });
  });

  describe("TrexCrossVmBridgeModule (0x0901 EVM-to-Native CosmWasm Bridge)", function () {
    it("dispatches ERC-7930 identity sync to 0x0901 with JSON-safe ASCII payload and records receipt", async function () {
      const { ethers, alice, mockBridge, bridgeModule } = await deployExtensionsFixture();

      await mockBridge.setAllowlist(DEFAULT_NATIVE_RECEIPTS, true);
      await mockBridge.setEnforceAllowlist(true);

      const cosmosAddr = "qor1d2w2r5gvq4x946047ktuwe3qsvgs4xp5w9fzs2";
      const digest = ethers.keccak256(ethers.toUtf8Bytes("ERC7930_INSTITUTION_SYNC"));

      const expectedNote = await bridgeModule.buildReceiptNote(alice.address, cosmosAddr, digest, 1);
      expect(expectedNote.length).to.be.greaterThan(0);
      expect(expectedNote.length).to.be.at.most(140);
      expect(expectedNote).to.include("TREX-ERC7930|r=1|");

      const tx = await bridgeModule
        .connect(alice)
        .dispatchIdentitySync(alice.address, cosmosAddr, digest, 1);

      await expect(tx).to.emit(bridgeModule, "CrossVmIdentitySynced");

      expect(await bridgeModule.syncCount()).to.equal(1n);
      expect(await mockBridge.callCount()).to.equal(1n);
      expect(await mockBridge.lastTargetVm()).to.equal(1n);
      expect(await mockBridge.lastTargetContract()).to.equal(DEFAULT_NATIVE_RECEIPTS);

      const dispatchedJson = ethers.toUtf8String(await mockBridge.lastPayload());
      expect(dispatchedJson).to.equal(`{"record":{"note":"${expectedNote}"}}`);

      const rec = await bridgeModule.getLastSync(alice.address);
      expect(rec.syncId).to.equal(1n);
      expect(rec.cosmosBech32).to.equal(cosmosAddr);
      expect(rec.keyspaceDigest).to.equal(digest);
      expect(rec.identityRole).to.equal(1n);
    });

    it("rejects JSON injection attempts and invalid identity roles", async function () {
      const { ethers, alice, bridgeModule } = await deployExtensionsFixture();
      const digest = ethers.keccak256(ethers.toUtf8Bytes("INJECTION_TEST"));

      await expect(
        bridgeModule
          .connect(alice)
          .dispatchIdentitySync(alice.address, 'qor1abc","evil":"1', digest, 1)
      ).to.be.revertedWithCustomError(bridgeModule, "InvalidAsciiNote");

      await expect(
        bridgeModule
          .connect(alice)
          .dispatchIdentitySync(alice.address, "qor1abc\\escaped", digest, 1)
      ).to.be.revertedWithCustomError(bridgeModule, "InvalidAsciiNote");

      await expect(
        bridgeModule
          .connect(alice)
          .dispatchIdentitySync(alice.address, "qor1validaddr", digest, 8)
      ).to.be.revertedWithCustomError(bridgeModule, "InvalidIdentityRole");
    });

    it("enforces ERC-3643 IdentityRegistry verification when policy is enabled", async function () {
      const { ethers, owner, alice, registry, bridgeModule } = await deployExtensionsFixture();
      const cosmosAddr = "qor1xkgjactk7qpcqr4arfsgrx5a75g50ne6uwv0qr";
      const digest = ethers.keccak256(ethers.toUtf8Bytes("IDENTITY_GATED_SYNC"));

      await bridgeModule.connect(owner).setEnforceIdentityVerification(true);

      await expect(
        bridgeModule.connect(alice).dispatchIdentitySync(alice.address, cosmosAddr, digest, 2)
      )
        .to.be.revertedWithCustomError(bridgeModule, "IdentityNotVerified")
        .withArgs(alice.address);

      await registry.setVerified(alice.address, true);
      await expect(
        bridgeModule.connect(alice).dispatchIdentitySync(alice.address, cosmosAddr, digest, 2)
      ).to.emit(bridgeModule, "CrossVmIdentitySynced");
    });

    it("reverts fail-closed when 0x0901 precompile is absent or rejects unallowlisted target", async function () {
      const { ethers, networkHelpers, owner, alice, attacker, mockBridge, bridgeModule } =
        await deployExtensionsFixture();
      const cosmosAddr = "qor18sp9j6zplpun44zu4ryqdzpq6cs2wc7mrtt9ad";
      const digest = ethers.keccak256(ethers.toUtf8Bytes("FAIL_CLOSED_BRIDGE"));

      // Unauthorized caller cannot invoke owner-only custom payload dispatcher
      await expect(
        bridgeModule
          .connect(attacker)
          .dispatchCustomCompliancePayload(DEFAULT_NATIVE_RECEIPTS, ethers.toUtf8Bytes("{}"))
      ).to.be.revertedWithCustomError(bridgeModule, "OwnableUnauthorizedAccount");

      // Unallowlisted target reverts inside 0x0901 -> BridgeCallFailed
      await mockBridge.setEnforceAllowlist(true);
      await expect(
        bridgeModule
          .connect(owner)
          .dispatchCustomCompliancePayload("qor1unallowlisted", ethers.toUtf8Bytes('{"ping":{}}'))
      ).to.be.revertedWithCustomError(bridgeModule, "BridgeCallFailed");

      // Absent 0x0901 bytecode returns ok=true, ret.length=0 -> MUST revert BridgeNotActive
      await networkHelpers.setCode(CROSS_VM_BRIDGE_PRECOMPILE, "0x");
      await expect(
        bridgeModule.connect(alice).dispatchIdentitySync(alice.address, cosmosAddr, digest, 1)
      ).to.be.revertedWithCustomError(bridgeModule, "BridgeNotActive");
    });
  });
});
