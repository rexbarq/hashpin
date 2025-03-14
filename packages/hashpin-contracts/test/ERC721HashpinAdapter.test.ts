import { expect } from "chai";
import { ethers } from "hardhat";
import { Hashpin, ERC721HashpinAdapter } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ERC721HashpinAdapter", function () {
  let hashpin: Hashpin;
  let adapter: ERC721HashpinAdapter;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  // Sample hash and metadata
  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("sample data"));
  const sampleMetadata = "Sample metadata";
  const tokenURI = "ipfs://QmSampleCID";

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

  // Additional helper to prepare merkle proof (in this case, just the nonce)
  async function prepareNonceAsMerkleProof(hash: string): Promise<{nonce: bigint, merkleProof: string[]}> {
    const nonce = await findValidNonce(hash);
    const nonceAsBytes32 = ethers.hexlify(ethers.toBeHex(nonce, 32));
    return { nonce, merkleProof: [nonceAsBytes32] };
  }

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy Hashpin contract
    const HashpinFactory = await ethers.getContractFactory("Hashpin");
    hashpin = await HashpinFactory.deploy();

    // Deploy ERC721HashpinAdapter
    const AdapterFactory = await ethers.getContractFactory("ERC721HashpinAdapter");
    adapter = await AdapterFactory.deploy("Hashpin NFT", "HPIN");

    // Set up the adapter
    await adapter.setHashpinContract(await hashpin.getAddress());
    
    // Whitelist the adapter in the Hashpin contract
    await hashpin.setAdapterWhitelisted(await adapter.getAddress(), true);
    
    // Set a low difficulty for testing
    await hashpin.setDifficulty(1);
  });

  describe("Initialization", function () {
    it("should set the correct name and symbol", async function () {
      expect(await adapter.name()).to.equal("Hashpin NFT");
      expect(await adapter.symbol()).to.equal("HPIN");
    });

    it("should set the correct Hashpin contract address", async function () {
      expect(await adapter.hashpinContract()).to.equal(await hashpin.getAddress());
    });
  });

  describe("Access Control", function () {
    it("should allow owner to set Hashpin contract address", async function () {
      const newAddress = ethers.Wallet.createRandom().address;
      await adapter.setHashpinContract(newAddress);
      expect(await adapter.hashpinContract()).to.equal(newAddress);
    });

    it("should not allow non-owner to set Hashpin contract address", async function () {
      const newAddress = ethers.Wallet.createRandom().address;
      await expect(adapter.connect(user1).setHashpinContract(newAddress))
        .to.be.revertedWithCustomError(adapter, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("should not allow direct minting from non-Hashpin contract", async function () {
      await expect(adapter.connect(user1).mint(user1.address, sampleHash, ethers.toUtf8Bytes(tokenURI)))
        .to.be.revertedWith("Only Hashpin contract can mint");
    });
  });

  describe("Hash to Token ID Conversion", function () {
    it("should correctly convert hash to token ID", async function () {
      const tokenId = await adapter.hashToTokenID(sampleHash);
      expect(tokenId).to.equal(ethers.toBigInt(sampleHash));
    });

    it("should correctly convert token ID to hash", async function () {
      const tokenId = ethers.toBigInt(sampleHash);
      const hash = await adapter.tokenIDToHash(tokenId);
      expect(hash).to.equal(sampleHash);
    });

    it("should be reversible (hash -> tokenId -> hash)", async function () {
      const tokenId = await adapter.hashToTokenID(sampleHash);
      const hash = await adapter.tokenIDToHash(tokenId);
      expect(hash).to.equal(sampleHash);
    });
  });

  describe("Claiming Hashes as NFTs", function () {
    let nonce: bigint;
    let merkleProof: string[];
    
    beforeEach(async function () {
      // Pin a hash first
      const result = await prepareNonceAsMerkleProof(sampleHash);
      nonce = result.nonce;
      merkleProof = result.merkleProof;
      
      await hashpin.connect(user1).pinHash(sampleHash, nonce, sampleMetadata);
    });

    it("should successfully claim a hash as NFT", async function () {
      // Claim the hash as NFT with merkle proof
      await expect(hashpin.connect(user1).claimHash(
        sampleHash,
        merkleProof,
        await adapter.getAddress(), 
        ethers.toUtf8Bytes(tokenURI)
      ))
        .to.emit(hashpin, "HashClaimed")
        .withArgs(user1.address, sampleHash, await adapter.getAddress(), ethers.toBigInt(sampleHash));

      // Check that the NFT was minted
      const tokenId = await adapter.hashToTokenID(sampleHash);
      expect(await adapter.ownerOf(tokenId)).to.equal(user1.address);
      
      // Check that the token URI was set correctly
      expect(await adapter.tokenURI(tokenId)).to.equal(tokenURI);
      
      // Check that the hash is marked as minted
      expect(await adapter.isHashMinted(sampleHash)).to.be.true;
    });

    it("should not allow claiming the same hash twice", async function () {
      // Claim the hash as NFT
      await hashpin.connect(user1).claimHash(
        sampleHash,
        merkleProof,
        await adapter.getAddress(), 
        ethers.toUtf8Bytes(tokenURI)
      );

      // Try to claim it again
      await expect(hashpin.connect(user1).claimHash(
        sampleHash,
        merkleProof,
        await adapter.getAddress(), 
        ethers.toUtf8Bytes("different URI")
      ))
        .to.be.revertedWith("Hash already minted");
    });

    it("should allow transferring the NFT", async function () {
      // Claim the hash as NFT
      await hashpin.connect(user1).claimHash(
        sampleHash,
        merkleProof,
        await adapter.getAddress(), 
        ethers.toUtf8Bytes(tokenURI)
      );

      // Get the token ID
      const tokenId = await adapter.hashToTokenID(sampleHash);
      
      // Transfer the NFT
      await adapter.connect(user1).transferFrom(user1.address, user2.address, tokenId);
      
      // Check the new owner
      expect(await adapter.ownerOf(tokenId)).to.equal(user2.address);
    });
  });

  describe("Querying Hash and Token Information", function () {
    let merkleProof: string[];
    
    beforeEach(async function () {
      // Pin and claim a hash
      const result = await prepareNonceAsMerkleProof(sampleHash);
      merkleProof = result.merkleProof;
      
      await hashpin.connect(user1).pinHash(sampleHash, result.nonce, sampleMetadata);
      await hashpin.connect(user1).claimHash(
        sampleHash,
        merkleProof,
        await adapter.getAddress(), 
        ethers.toUtf8Bytes(tokenURI)
      );
    });

    it("should return correct hash for a token ID", async function () {
      const tokenId = await adapter.hashToTokenID(sampleHash);
      const hash = await adapter.getHashByTokenId(tokenId);
      expect(hash).to.equal(sampleHash);
    });

    it("should revert when querying non-existent token ID", async function () {
      const nonExistentTokenId = ethers.toBigInt(ethers.keccak256(ethers.toUtf8Bytes("non-existent")));
      await expect(adapter.getHashByTokenId(nonExistentTokenId))
        .to.be.revertedWith("Token ID does not exist");
    });

    it("should correctly report if a hash is minted", async function () {
      // Check a minted hash
      expect(await adapter.isHashMinted(sampleHash)).to.be.true;
      
      // Check an unminted hash
      const unmintedHash = ethers.keccak256(ethers.toUtf8Bytes("unminted data"));
      expect(await adapter.isHashMinted(unmintedHash)).to.be.false;
    });
  });

  describe("Interface Support", function () {
    it("should support ERC721 interface", async function () {
      const ERC721InterfaceId = "0x80ac58cd"; // ERC721 interface ID
      expect(await adapter.supportsInterface(ERC721InterfaceId)).to.be.true;
    });

    it("should support ERC721Metadata interface", async function () {
      const ERC721MetadataInterfaceId = "0x5b5e139f"; // ERC721Metadata interface ID
      expect(await adapter.supportsInterface(ERC721MetadataInterfaceId)).to.be.true;
    });

    it("should support IHashpinNFT interface", async function () {
      // Calculate IHashpinNFT interface ID correctly
      // Interface ID is calculated as XOR of all function selectors
      const mintSelector = ethers.id("mint(address,bytes32,bytes)").substring(0, 10);
      const supportsInterfaceSelector = ethers.id("supportsInterface(bytes4)").substring(0, 10);
      
      // Convert selectors to numbers, XOR them, and convert back to hex
      const mintSelectorNum = BigInt(mintSelector);
      const supportsInterfaceSelectorNum = BigInt(supportsInterfaceSelector);
      const interfaceIdNum = mintSelectorNum ^ supportsInterfaceSelectorNum;
      const IHashpinNFTInterfaceId = "0x" + interfaceIdNum.toString(16).padStart(8, '0');
      
      expect(await adapter.supportsInterface(IHashpinNFTInterfaceId)).to.be.true;
    });
  });
}); 