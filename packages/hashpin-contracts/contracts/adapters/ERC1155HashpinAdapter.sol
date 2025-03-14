// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IHashpinNFT.sol";

/**
 * @title ERC1155HashpinAdapter
 * @dev Adapter for minting ERC-1155 tokens for claimed hashes
 */
contract ERC1155HashpinAdapter is IHashpinNFT, ERC1155, Ownable {
    // Mapping from hash to whether it has been minted
    mapping(bytes32 => bool) public hashMinted;
    
    // The Hashpin contract address that is allowed to call mint
    address public hashpinContract;
    
    /**
     * @dev Constructor
     * @param uri_ The base URI for token metadata
     */
    constructor(string memory uri_) 
        ERC1155(uri_) 
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
     * @dev Mints an ERC-1155 token representing the claimed hash
     * @param to The address that will receive the token
     * @param hash The hash being claimed
     * @param metadata Additional metadata for the token (ignored for ERC-1155)
     * @return tokenId The ID of the newly minted token
     */
    function mint(address to, bytes32 hash, bytes calldata metadata) external override returns (uint256) {
        require(msg.sender == hashpinContract, "Only Hashpin contract can mint");
        require(!hashMinted[hash], "Hash already minted");
        
        // Use the hash itself as the token ID
        uint256 tokenId = uint256(hash);
        
        // Mark the hash as minted
        hashMinted[hash] = true;
        
        // Mint the token to the recipient (amount = 1)
        _mint(to, tokenId, 1, metadata);
        
        return tokenId;
    }
    
    /**
     * @dev Check if a hash has been minted
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
    function supportsInterface(bytes4 interfaceId) public view override(ERC1155, IHashpinNFT) returns (bool) {
        return 
            interfaceId == type(IHashpinNFT).interfaceId || 
            super.supportsInterface(interfaceId);
    }
} 