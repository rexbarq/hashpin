import { expect } from "chai";
import { ethers } from "hardhat";
import { Hashpin } from "../typechain-types";
import type { IHashpinNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";

describe("Hashpin Core Functionality", function () {
  let hashpin: Hashpin;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let mockAdapter: SignerWithAddress; // We'll use a signer as a mock adapter for now
  let nonWhitelistedAdapter: SignerWithAddress;
  let mockNFT: any; // Using any type for mockNFT to avoid complex typing issues

  // Sample hash and metadata
  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("sample data"));
  const sampleMetadata = "Sample metadata";

  // Helper function to find a valid nonce for a hash
  async function findValidNonce(hash: string): Promise<bigint> {
    const difficulty = await hashpin.getDifficulty();
    let nonce = 0n;
    
    while (true) {
      const powHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256"], [hash, nonce])
      );
      
      if (await hashpin.meetsDifficulty(powHash)) {
        return nonce;
      }
      
      nonce++;
      
      // Prevent infinite loops in tests
      if (nonce > 1000n) {
        throw new Error("Could not find valid nonce within reasonable time");
      }
    }
  }

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, mockAdapter, nonWhitelistedAdapter] = await ethers.getSigners();

    // Deploy Hashpin contract
    const HashpinFactory = await ethers.getContractFactory("Hashpin");
    hashpin = await HashpinFactory.deploy();
    
    // Deploy mock NFT adapter
    const MockNFTFactory = await ethers.getContractFactory("MockHashpinNFT");
    mockNFT = await MockNFTFactory.deploy();
    
    // Set a low difficulty for testing
    await hashpin.setDifficulty(1);
  });

  describe("Initialization", function () {
    it("should set the correct owner", async function () {
      expect(await hashpin.owner()).to.equal(owner.address);
    });

    it("should set the initial difficulty", async function () {
      // We set difficulty to 1 in beforeEach
      expect(await hashpin.getDifficulty()).to.equal(1);
    });
  });

  describe("Difficulty Management", function () {
    it("should allow owner to set difficulty", async function () {
      await hashpin.setDifficulty(8);
      expect(await hashpin.getDifficulty()).to.equal(8);
    });

    it("should not allow non-owner to set difficulty", async function () {
      await expect(hashpin.connect(user1).setDifficulty(8))
        .to.be.revertedWithCustomError(hashpin, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("should not allow setting difficulty above 256", async function () {
      await expect(hashpin.setDifficulty(257))
        .to.be.revertedWith("Difficulty cannot exceed 256 bits");
    });
  });

  describe("Adapter Whitelisting", function () {
    it("should allow owner to whitelist an adapter", async function () {
      await hashpin.setAdapterWhitelisted(mockAdapter.address, true);
      expect(await hashpin.whitelistedAdapters(mockAdapter.address)).to.be.true;
    });

    it("should allow owner to de-whitelist an adapter", async function () {
      await hashpin.setAdapterWhitelisted(mockAdapter.address, true);
      await hashpin.setAdapterWhitelisted(mockAdapter.address, false);
      expect(await hashpin.whitelistedAdapters(mockAdapter.address)).to.be.false;
    });

    it("should not allow non-owner to whitelist an adapter", async function () {
      await expect(hashpin.connect(user1).setAdapterWhitelisted(mockAdapter.address, true))
        .to.be.revertedWithCustomError(hashpin, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });
  });

  describe("Proof of Work", function () {
    it("should verify a hash meets difficulty", async function () {
      // For difficulty 1, the first byte must have its most significant bit as 0
      const validHash = "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      expect(await hashpin.meetsDifficulty(validHash)).to.be.true;
    });

    it("should reject a hash that doesn't meet difficulty", async function () {
      // For difficulty 1, the first byte must not have its most significant bit as 1
      const invalidHash = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      expect(await hashpin.meetsDifficulty(invalidHash)).to.be.false;
    });
  });

  describe("Pinning Hashes", function () {
    it("should allow pinning a hash with valid proof of work", async function () {
      // Set a low difficulty for testing
      await hashpin.setDifficulty(1);
      
      // Find a valid nonce
      const nonce = await findValidNonce(sampleHash);
      
      // Calculate the powHash that will be stored
      const powHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256"], [sampleHash, nonce])
      );
      
      // Pin the hash and expect the HashPinned event with the powHash
      await expect(hashpin.connect(user1).pinHash(sampleHash, nonce, sampleMetadata))
        .to.emit(hashpin, "HashPinned")
        .withArgs(user1.address, powHash, sampleMetadata, await time.latest());
      
      // Verify the hash details using the powHash
      const details = await hashpin.getHashDetails(powHash);
      expect(details[0]).to.equal(user1.address); // pinner
      expect(details[1]).to.equal(sampleMetadata); // metadata
      expect(details[2]).to.be.closeTo(await time.latest(), 2); // timestamp
    });

    it("should not allow pinning a hash that doesn't meet difficulty", async function () {
      // Set a higher difficulty for this test
      await hashpin.setDifficulty(20); // High enough to ensure our nonce will fail
      
      // Use an invalid nonce
      const invalidNonce = 0n;
      await expect(hashpin.connect(user1).pinHash(sampleHash, invalidNonce, sampleMetadata))
        .to.be.revertedWith("Hash does not meet difficulty requirement");
        
      // Reset difficulty for other tests
      await hashpin.setDifficulty(1);
    });

    it("should not allow pinning the same hash twice", async function () {
      const nonce = await findValidNonce(sampleHash);
      
      // Calculate the powHash
      const powHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256"], [sampleHash, nonce])
      );
      
      // Pin the hash first time
      await hashpin.connect(user1).pinHash(sampleHash, nonce, sampleMetadata);
      
      // Try to pin the same hash again (will produce the same powHash)
      await expect(hashpin.connect(user1).pinHash(sampleHash, nonce, "Different metadata"))
        .to.be.revertedWith("Hash already pinned");
    });
  });

  describe("Verifying Hashes", function () {
    let nonce: bigint;
    let powHash: string;
    
    beforeEach(async function () {
      // Pin a hash first
      nonce = await findValidNonce(sampleHash);
      
      // Calculate and store the powHash
      powHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256"], [sampleHash, nonce])
      );
      
      await hashpin.connect(user1).pinHash(sampleHash, nonce, sampleMetadata);
    });
    
    it("should verify a pinned hash", async function () {
      // Create a merkle proof with just the nonce (as a bytes32 value)
      const nonceAsBytes32 = ethers.hexlify(ethers.toBeHex(nonce, 32));
      
      // Verify using the original hash and merkle proof
      const pinner = await hashpin.verifyHash(sampleHash, [nonceAsBytes32]);
      expect(pinner).to.equal(user1.address);
    });
    
    it("should return zero address for non-pinned hash", async function () {
      const nonPinnedHash = ethers.keccak256(ethers.toUtf8Bytes("non-pinned"));
      // Use a random nonce
      const nonceAsBytes32 = ethers.hexlify(ethers.toBeHex(123n, 32));
      
      const pinner = await hashpin.verifyHash(nonPinnedHash, [nonceAsBytes32]);
      expect(pinner).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Getting Hash Details", function () {
    let nonce: bigint;
    let powHash: string;
    
    beforeEach(async function () {
      // Pin a hash first
      nonce = await findValidNonce(sampleHash);
      
      // Calculate and store the powHash
      powHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256"], [sampleHash, nonce])
      );
      
      await hashpin.connect(user1).pinHash(sampleHash, nonce, sampleMetadata);
    });
    
    it("should get details of a pinned hash", async function () {
      // Get details using the powHash
      const details = await hashpin.getHashDetails(powHash);
      expect(details[0]).to.equal(user1.address); // pinner
      expect(details[1]).to.equal(sampleMetadata); // metadata
      expect(details[2]).to.be.closeTo(await time.latest(), 2); // timestamp
    });
    
    it("should revert for non-pinned hash", async function () {
      const nonPinnedHash = ethers.keccak256(ethers.toUtf8Bytes("non-pinned"));
      await expect(hashpin.getHashDetails(nonPinnedHash))
        .to.be.revertedWith("Hash not found");
    });
  });

  describe("Claiming Hashes", function () {
    let nonce: bigint;
    let powHash: string;
    
    beforeEach(async function () {
      // Whitelist the mock adapter
      await hashpin.setAdapterWhitelisted(await mockNFT.getAddress(), true);
      
      // Pin a hash first
      nonce = await findValidNonce(sampleHash);
      
      // Calculate and store the powHash
      powHash = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "uint256"], [sampleHash, nonce])
      );
      
      await hashpin.connect(user1).pinHash(sampleHash, nonce, sampleMetadata);
    });
    
    it("should allow claiming a pinned hash", async function () {
      // Create a merkle proof with just the nonce (as a bytes32 value)
      const nonceAsBytes32 = ethers.hexlify(ethers.toBeHex(nonce, 32));
      const nftAddress = await mockNFT.getAddress();
      
      // Claim the hash using the original hash and merkle proof
      await expect(hashpin.connect(user1).claimHash(
        sampleHash, 
        [nonceAsBytes32], 
        nftAddress,
        "0x"
      ))
        .to.emit(hashpin, "HashClaimed")
        .withArgs(user1.address, sampleHash, nftAddress, ethers.toBigInt(sampleHash));
    });
    
    it("should not allow claiming a non-pinned hash", async function () {
      const nonPinnedHash = ethers.keccak256(ethers.toUtf8Bytes("non-pinned"));
      const nonceAsBytes32 = ethers.hexlify(ethers.toBeHex(nonce, 32));
      const nftAddress = await mockNFT.getAddress();
      
      await expect(hashpin.connect(user1).claimHash(
        nonPinnedHash, 
        [nonceAsBytes32], 
        nftAddress,
        "0x"
      ))
        .to.be.revertedWith("Hash not found");
    });
    
    it("should not allow claiming another user's hash", async function () {
      const nonceAsBytes32 = ethers.hexlify(ethers.toBeHex(nonce, 32));
      const nftAddress = await mockNFT.getAddress();
      
      await expect(hashpin.connect(user2).claimHash(
        sampleHash, 
        [nonceAsBytes32], 
        nftAddress,
        "0x"
      ))
        .to.be.revertedWith("Only the pinner can claim this hash");
    });
    
    it("should not allow claiming with a non-whitelisted adapter", async function () {
      const nonceAsBytes32 = ethers.hexlify(ethers.toBeHex(nonce, 32));
      
      await expect(hashpin.connect(user1).claimHash(
        sampleHash, 
        [nonceAsBytes32], 
        nonWhitelistedAdapter.address,
        "0x"
      ))
        .to.be.revertedWith("Adapter not whitelisted");
    });
  });

  describe("Merkle Tree Support", function () {
    it("should support pinning a merkle root", async function () {
      // Create a simple merkle tree with two leaves
      const leaf1 = ethers.keccak256(ethers.toUtf8Bytes("leaf 1"));
      const leaf2 = ethers.keccak256(ethers.toUtf8Bytes("leaf 2"));
      
      // Calculate the merkle root by combining the leaves
      const merkleRoot = ethers.keccak256(
        ethers.solidityPacked(["bytes32", "bytes32"], [leaf1, leaf2])
      );
      
      // Find a valid nonce for the merkle root
      const nonce = await findValidNonce(merkleRoot);
      
      // Pin the merkle root
      await expect(hashpin.connect(user1).pinHash(merkleRoot, nonce, "Merkle tree with two leaves"))
        .to.emit(hashpin, "HashPinned");
      
      // Whitelist the adapter for claiming
      await hashpin.setAdapterWhitelisted(await mockNFT.getAddress(), true);
      
      // For leaf1, the proof includes leaf2 (the sibling) and the nonce
      const nonceAsBytes32 = ethers.hexlify(ethers.toBeHex(nonce, 32));
      const nftAddress = await mockNFT.getAddress();
      
      // Claim the leaf
      await expect(hashpin.connect(user1).claimHash(
        leaf1, 
        [leaf2, nonceAsBytes32], 
        nftAddress,
        "0x"
      ))
        .to.emit(hashpin, "HashClaimed")
        .withArgs(user1.address, leaf1, nftAddress, ethers.toBigInt(leaf1));
    });
  });
}); 