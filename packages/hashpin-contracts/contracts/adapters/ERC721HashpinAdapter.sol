// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IHashpinNFT.sol";

/**
 * @title ERC721HashpinAdapter
 * @dev Adapter for minting ERC-721 tokens for claimed hashes
 */
contract ERC721HashpinAdapter is IHashpinNFT, ERC721URIStorage, Ownable {
    // Mapping to track which hashes have been minted
    mapping(bytes32 => bool) public hashMinted;
    
    // The Hashpin contract address that is allowed to call mint
    address public hashpinContract;
    
    /**
     * @dev Constructor
     * @param name The name of the NFT collection
     * @param symbol The symbol of the NFT collection
     */
    constructor(string memory name, string memory symbol) 
        ERC721(name, symbol) 
        Ownable(msg.sender) 
    {}
    
    /**
     * @dev Sets the Hashpin contract address
     * @param _hashpinContract The address of the Hashpin contract
     */
    function setHashpinContract(address _hashpinContract) external onlyOwner {
        hashpinContract = _hashpinContract;
    }
    
    /**
     * @dev Convert a bytes32 hash to a uint256 token ID
     * @param hash The hash to convert
     * @return tokenId The resulting token ID
     */
    function hashToTokenID(bytes32 hash) public pure returns (uint256) {
        return uint256(hash);
    }
    
    /**
     * @dev Convert a uint256 token ID to a bytes32 hash
     * @param tokenId The token ID to convert
     * @return hash The resulting hash
     */
    function tokenIDToHash(uint256 tokenId) public pure returns (bytes32) {
        return bytes32(tokenId);
    }
    
    /**
     * @dev Mints an NFT representing the claimed hash
     * @param to The address that will receive the NFT
     * @param hash The hash being claimed
     * @param metadata Additional metadata for the NFT (token URI as bytes)
     * @return tokenId The ID of the newly minted NFT
     */
    function mint(address to, bytes32 hash, bytes calldata metadata) external override returns (uint256) {
        require(msg.sender == hashpinContract, "Only Hashpin contract can mint");
        require(!hashMinted[hash], "Hash already minted");
        
        // Use the hash itself as the token ID
        uint256 tokenId = hashToTokenID(hash);
        
        // Mark the hash as minted
        hashMinted[hash] = true;
        
        // Mint the NFT to the recipient
        _safeMint(to, tokenId);
        
        // Set the token URI if metadata is provided
        if (metadata.length > 0) {
            _setTokenURI(tokenId, string(metadata));
        }
        
        return tokenId;
    }
    
    /**
     * @dev Get the hash associated with a token ID
     * @param tokenId The token ID to query
     * @return hash The hash associated with the token
     */
    function getHashByTokenId(uint256 tokenId) external view returns (bytes32) {
        bytes32 hash = tokenIDToHash(tokenId);
        require(_ownerOf(tokenId) != address(0), "Token ID does not exist");
        require(hashMinted[hash], "Hash not minted");
        return hash;
    }
    
    /**
     * @dev Check if a hash has been minted as an NFT
     * @param hash The hash to check
     * @return bool True if the hash has been minted
     */
    function isHashMinted(bytes32 hash) external view returns (bool) {
        return hashMinted[hash];
    }
    
    /**
     * @dev Checks if the contract supports a given interface
     * @param interfaceId The interface identifier
     * @return bool True if the contract supports the interface
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, IHashpinNFT) returns (bool) {
        return 
            interfaceId == type(IHashpinNFT).interfaceId || 
            super.supportsInterface(interfaceId);
    }
} 