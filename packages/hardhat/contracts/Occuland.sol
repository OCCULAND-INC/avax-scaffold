pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";

contract Occuland is
    ERC721,
    ERC721Enumerable,
    ERC721URIStorage,
    ERC721Burnable,
    AccessControl,
    EIP712
{
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    Counters.Counter private _tokenIdCounter;
    uint256 private base = 10000;
    uint256 public occulandFee = 300;
    address public immutable signer;

    event MintedAsset(address to, uint256 tokenId, string assetId);
    event BridgeBack(address from, uint256 tokenId, string assetId);

    event OccupyAsset(
        address leasor,
        address leasee,
        uint256 tokenId,
        string assetId
    );
    event ReleaseAsset(
        address leasor,
        address leasee,
        uint256 tokenId,
        string assetId
    );

    struct LeaseTerms {
        uint256 tokenId;
        string assetId;
        string assetURI;
        uint256 minimumRentalPeriod;
        uint256 minimumRentalPrice;
        bool rented;
    }

    mapping(address => uint256) earnings;

    mapping(address => mapping(uint256 => LeaseTerms)) public tokenLeasingInfo;

    constructor(address _minterAccount)
        ERC721("Occuland: NFT Asset", "OCCLND")
        EIP712("OCCLND", "1")
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, _minterAccount);
        signer = msg.sender;
    }

    function mint(
        address to,
        string memory assetId,
        string memory assetURI
    ) public onlyRole(MINTER_ROLE) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, assetId);
        initLeasingTerms(to, tokenId, assetId, assetURI, 0, 0, false);
        emit MintedAsset(to, tokenId, assetId);
    }

    function initLeasingTerms(
        address _owner,
        uint256 _tokenId,
        string memory _assetId,
        string memory _assetURI,
        uint256 _minimumRentalPeriod,
        uint256 _minimumRentalPrice,
        bool _rented
    ) internal onlyRole(MINTER_ROLE) {
        require(_owner == ownerOf(_tokenId), "non owner");
        address owner = ownerOf(_tokenId);
        tokenLeasingInfo[owner][_tokenId].tokenId = _tokenId;
        tokenLeasingInfo[owner][_tokenId].assetId = _assetId;
        tokenLeasingInfo[owner][_tokenId].assetURI = _assetURI;
        tokenLeasingInfo[owner][_tokenId]
            .minimumRentalPeriod = _minimumRentalPeriod;
        tokenLeasingInfo[owner][_tokenId]
            .minimumRentalPrice = _minimumRentalPrice;
        tokenLeasingInfo[owner][_tokenId].rented = _rented;
    }

    function setLeasingPrice(
        uint256 _tokenId,
        uint256 _newPrice,
        string memory _newURI
    ) public {
        require(msg.sender == ownerOf(_tokenId), "non owner");
        address owner = ownerOf(_tokenId);
        tokenLeasingInfo[owner][_tokenId].minimumRentalPrice = _newPrice;
        tokenLeasingInfo[owner][_tokenId].assetURI = _newURI;
        setTokenURI(_tokenId, _newURI);
    }

    function setLeasingPeriod(
        uint256 _tokenId,
        uint256 _newPeriod,
        string memory _newURI
    ) public {
        require(msg.sender == ownerOf(_tokenId), "non owner");
        address owner = ownerOf(_tokenId);
        tokenLeasingInfo[owner][_tokenId].minimumRentalPeriod = _newPeriod;
        tokenLeasingInfo[owner][_tokenId].assetURI = _newURI;
        setTokenURI(_tokenId, _newURI);
    }

    function occupyAsset(
        uint256 _tokenId,
        uint256 _period,
        string memory _newURI
    ) public payable {
        address owner = ownerOf(_tokenId);
        require(
            tokenLeasingInfo[owner][_tokenId].rented == false,
            "asset is already rented"
        );
        require(
            tokenLeasingInfo[owner][_tokenId].minimumRentalPeriod <= _period,
            "does not meet mimimum rental period"
        );
        require(
            tokenLeasingInfo[owner][_tokenId].minimumRentalPrice *
                tokenLeasingInfo[owner][_tokenId].minimumRentalPeriod <=
                msg.value,
            "does not meet rental price"
        );

        tokenLeasingInfo[owner][_tokenId].rented = true;
        tokenLeasingInfo[owner][_tokenId].assetURI = _newURI;

        setTokenURI(_tokenId, _newURI);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function setTokenURI(uint256 _tokenId, string memory _newURI) public {
        require(
            msg.sender == ownerOf(_tokenId) || msg.sender == address(this),
            "non-owner"
        );
        tokenLeasingInfo[ownerOf(_tokenId)][_tokenId].assetURI = _newURI;
        _setTokenURI(_tokenId, _newURI);
    }

    function bridgeBack(uint256 _tokenId) public {
        require(msg.sender == ownerOf(_tokenId), "non owner");
        string memory _assetId = tokenLeasingInfo[ownerOf(_tokenId)][_tokenId]
            .assetId;
        _burn(_tokenId);
        emit BridgeBack(msg.sender, _tokenId, _assetId);
    }
}
