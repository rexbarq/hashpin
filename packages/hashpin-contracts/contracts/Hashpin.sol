// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IHashpinNFT.sol";

/**
 * @title Hashpin
 * @dev A protocol for pinning cryptographic hashes to the blockchain and claiming them as NFTs
 */
contract Hashpin is Ownable {
    // Events
    event HashPinned(address indexed pinner, bytes32 indexed powHash, string metadata, uint256 timestamp);
    event DifficultyUpdated(uint256 newDifficulty);
    event HashClaimed(address indexed claimer, bytes32 indexed hash, address indexed adapter, uint256 tokenId);
    event AdapterWhitelisted(address indexed adapter, bool whitelisted);
    
    // Structs
    struct PinnedHash {
        address pinner;
        string metadata;
        uint256 timestamp;
    }
    
    // State variables
    mapping(bytes32 => PinnedHash) public pinnedHashes; // Maps powHash to PinnedHash struct
    uint256 public currentDifficulty;  // Number of leading zeros required
    uint256 public constant INITIAL_DIFFICULTY = 4;  // Start with 4 leading zeros
    
    // Whitelisted NFT adapters
    mapping(address => bool) public whitelistedAdapters;
    
    constructor() Ownable(msg.sender) {
        currentDifficulty = INITIAL_DIFFICULTY;
    }
    
    /**
     * @notice Verifies if a provided hash meets the required difficulty
     * @dev Difficulty is represented by the number of leading zero bits required
     * @param hash The hash to verify
     * @return bool True if the hash meets the difficulty requirement
     */
    function meetsDifficulty(bytes32 hash) public view returns (bool) {
        // Convert difficulty to number of bytes and bits to check
        uint256 fullBytes = currentDifficulty / 8;
        uint256 remainingBits = currentDifficulty % 8;
        
        // Check full bytes first (most efficient)
        for (uint256 i = 0; i < fullBytes; i++) {
            if (uint8(hash[i]) != 0) {
                return false;
            }
        }
        
        // Check remaining bits if any
        if (remainingBits > 0) {
            // Create mask for remaining bits
            // e.g., for 3 bits: 11100000 (0xE0)
            uint8 mask = uint8(0xFF) << (8 - remainingBits);
            
            // Apply mask and check if result is 0
            if ((uint8(hash[fullBytes]) & mask) != 0) {
                return false;
            }
        }
        
        return true;
    }    
    
    /**
     * @dev Pin a hash to the blockchain with proof of work
     * @param hash The hash to pin (could be a single hash or a merkle root)
     * @param nonce The nonce used to meet the difficulty requirement
     * @param metadata Optional metadata associated with the hash
     * @return powHash The proof-of-work hash that was generated
     */
    function pinHash(bytes32 hash, uint256 nonce, string calldata metadata) external returns (bytes32) {
        require(hash != bytes32(0), "Hash cannot be empty");
        
        // Calculate the proof of work hash
        bytes32 powHash = keccak256(abi.encodePacked(hash, nonce));
        
        // Ensure the powHash isn't already pinned
        require(pinnedHashes[powHash].timestamp == 0, "Hash already pinned");
        
        // Verify proof of work
        require(meetsDifficulty(powHash), "Hash does not meet difficulty requirement");
        
        // Store the powHash information
        pinnedHashes[powHash] = PinnedHash({
            pinner: msg.sender,
            metadata: metadata,
            timestamp: block.timestamp
        });
        
        // Emit event
        emit HashPinned(msg.sender, powHash, metadata, block.timestamp);
        
        return powHash;
    }
    
    /**
     * @dev Claim a hash as an NFT using the specified adapter
     * @param hash The hash to claim
     * @param merkleProof The merkle proof (including the nonce as the last element)
     * @param adapter The address of the NFT adapter to use
     * @param metadata Additional metadata for the NFT
     * @return tokenId The ID of the newly minted NFT
     */
    function claimHash(
        bytes32 hash, 
        bytes32[] calldata merkleProof, 
        address adapter, 
        bytes calldata metadata
    ) external returns (uint256) {
        require(merkleProof.length > 0, "Merkle proof must include at least the nonce");
        
        // Start with the hash to claim
        bytes32 currentHash = hash;
        
        // Process the entire Merkle proof (including the nonce as the last element)
        for (uint256 i = 0; i < merkleProof.length; i++) {
            // Combine the current hash with each proof element
            currentHash = keccak256(abi.encodePacked(currentHash, merkleProof[i]));
        }
        
        // The final hash is the powHash that should be stored in our contract
        bytes32 powHash = currentHash;
        
        // Verify the powHash exists and is pinned by the caller
        require(pinnedHashes[powHash].timestamp > 0, "Hash not found");
        require(pinnedHashes[powHash].pinner == msg.sender, "Only the pinner can claim this hash");
        require(whitelistedAdapters[adapter], "Adapter not whitelisted");
        
        // Use the adapter to mint an NFT with the original hash
        IHashpinNFT nftAdapter = IHashpinNFT(adapter);
        uint256 tokenId = nftAdapter.mint(msg.sender, hash, metadata);
        
        // Emit event
        emit HashClaimed(msg.sender, hash, adapter, tokenId);
        
        return tokenId;
    }
    
    /**
     * @dev Whitelist or de-whitelist an NFT adapter
     * @param adapter The address of the adapter
     * @param whitelisted Whether the adapter should be whitelisted
     */
    function setAdapterWhitelisted(address adapter, bool whitelisted) external onlyOwner {
        whitelistedAdapters[adapter] = whitelisted;
        emit AdapterWhitelisted(adapter, whitelisted);
    }
    
    /**
     * @dev Verify if a hash has been pinned
     * @param hash The hash to verify
     * @param merkleProof The merkle proof (including the nonce as the last element)
     * @return address The address that pinned the hash, null if not pinned
     */
    function verifyHash(bytes32 hash, bytes32[] calldata merkleProof) external view returns (address) {
        require(merkleProof.length > 0, "Merkle proof must include at least the nonce");
        
        // Start with the hash to verify
        bytes32 currentHash = hash;
        
        // Process the entire Merkle proof (including the nonce as the last element)
        for (uint256 i = 0; i < merkleProof.length; i++) {
            // Combine the current hash with each proof element
            currentHash = keccak256(abi.encodePacked(currentHash, merkleProof[i]));
        }
        
        // The final hash is the powHash that should be stored in our contract
        bytes32 powHash = currentHash;
        
        return pinnedHashes[powHash].pinner;
    }
    
    /**
     * @dev Get details of a pinned hash
     * @param powHash The proof-of-work hash to get details for
     * @return pinner The address that pinned the hash
     * @return metadata The metadata associated with the hash
     * @return timestamp The timestamp when the hash was pinned
     */
    function getHashDetails(bytes32 powHash) external view returns (
        address pinner,
        string memory metadata,
        uint256 timestamp
    ) {
        require(pinnedHashes[powHash].timestamp > 0, "Hash not found");
        
        PinnedHash storage pinnedHash = pinnedHashes[powHash];
        
        return (
            pinnedHash.pinner,
            pinnedHash.metadata,
            pinnedHash.timestamp
        );
    }
    
    /**
     * @dev Get the current difficulty target
     * @return uint256 The current difficulty (number of leading zeros required)
     */
    function getDifficulty() external view returns (uint256) {
        return currentDifficulty;
    }

    /**
     * @dev Set the current difficulty target (for testing only)
     * @param newDifficulty The new difficulty value (number of leading zero bits required)
     */
    function setDifficulty(uint256 newDifficulty) external onlyOwner {
        require(newDifficulty <= 256, "Difficulty cannot exceed 256 bits");
        currentDifficulty = newDifficulty;
        emit DifficultyUpdated(newDifficulty);
    }
} 

/** TODOs
 * 1. Tokens
 * 2. Usurping
 *     a. Change timestamp to block number or another more reliable method to tell two same hash registrations apart
 *     b. If usurpation is called on the same merkle root, the first caller wins
 * 3. Add reentrancy guard
 * 4. Use bytes for metadata instead of string
 * 5. Fee for claimHash
 * 6. 
 * 
 */