// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";

contract SupplyChain is AccessControl {
    /* ========== ROLES ========== */
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");

    /* ========== PRODUCT ========== */
    enum ProductState { 
        None, 
        Manufacturing,  // init product
        QC_Passed,      // passed QC
        Packaged,       // finish packaging
        AtDistributor,  // distributor received
        AtRetailer,     // retailer received
        Sold            // customer bought
    }
    
    struct Product {
        uint id;
        string code;
        string name;
        address currentOwner;
        string ipfsHash;
        ProductState state;
        uint timestamp;
    }
    mapping(uint => Product) public products;
    uint public productCount;
    mapping(string => uint) public productIdByCode;

    /* ========== PARTICIPANT ========== */
    struct Participant {
        string name;
        bytes32 role;
    }
    mapping(address => Participant) public participants;

    /* ========== EVENTS ========== */
    event InitProduct(uint indexed id, address owner, uint timestamp);
    event UpdateProductState(uint indexed id, ProductState newState, address from, address to, uint timestamp);

    event AddParticipant(address indexed account, bytes32 role, uint timestamp);
    event RemoveParticipant(address indexed account, bytes32 role, uint timestamp);

    /* ========== CONSTRUCTOR ========== */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        participants[msg.sender] = Participant({
            name: "Admin",
            role: DEFAULT_ADMIN_ROLE
        });
    }

    /* ========== MODIFIERS ========== */
    modifier productExists(uint _id) {
        require(_id <= productCount && _id > 0, "Product does not exist.");
        _;
    }

    modifier onlyOwner(uint _id) {
        require(products[_id].currentOwner == msg.sender, "Only current owner of the product can perform this action.");
        _;
    }

    modifier notSold(uint _id) {
        require(products[_id].state != ProductState.Sold, "Product was sold.");
        _;
    }

    /* ========== ADMIN FUNCTIONS ========== */
    function addParticipant(address _account, bytes32 _role, string calldata _name, uint _timestamp) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_account != address(0), "Invalid account.");
        require(_role == MANUFACTURER_ROLE || _role == DISTRIBUTOR_ROLE || _role == RETAILER_ROLE, "Invalid role.");
        _grantRole(_role, _account);
        participants[_account] = Participant({
            name: _name,
            role: _role
        });

        emit AddParticipant(_account, _role, _timestamp);
    }

    function removeParticipant(address _account, bytes32 _role, uint _timestamp) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(hasRole(_role, _account), "Account does not have this role.");
        _revokeRole(_role, _account);
        delete participants[_account];

        emit RemoveParticipant(_account, _role, _timestamp);
    }

    /* ========== PRODUCT LIFECYCLE FUNCTIONS ========== */
    // Initialze product
    function initProduct(string calldata _code, string calldata _name, string calldata _ipfsHash, uint _timestamp) public onlyRole(MANUFACTURER_ROLE) {
        require(bytes(_code).length > 0, "Product code cannot be empty.");
        require(productIdByCode[_code] == 0, "Product with this code already exists.");

        productCount++;
        products[productCount] = Product({
            id: productCount,
            code: _code,
            name: _name,
            currentOwner: msg.sender,
            ipfsHash: _ipfsHash,
            state: ProductState.Manufacturing,
            timestamp: _timestamp
        });
        productIdByCode[_code] = productCount;

        emit InitProduct(productCount, products[productCount].currentOwner, _timestamp);
        emit UpdateProductState(productCount, ProductState.Manufacturing, msg.sender, msg.sender, _timestamp);
    }

    // Pass Quality Control
    function passQC(uint _id, uint _timestamp) public productExists(_id) onlyOwner(_id) onlyRole(MANUFACTURER_ROLE) {
        require(products[_id].state == ProductState.Manufacturing, "The current state does not allow QC pass.");
        products[_id].state = ProductState.QC_Passed;
        products[_id].timestamp = _timestamp;

        emit UpdateProductState(_id, ProductState.QC_Passed, msg.sender, msg.sender, _timestamp);
    }

    // Package Product
    function packageProduct(uint _id, uint _timestamp) public productExists(_id) onlyOwner(_id) onlyRole(MANUFACTURER_ROLE) {
        require(products[_id].state == ProductState.QC_Passed, "The current state does not allow packaging.");
        products[_id].state = ProductState.Packaged;
        products[_id].timestamp = _timestamp;

        emit UpdateProductState(_id, ProductState.Packaged, msg.sender, msg.sender, _timestamp);
    }

    // Manufacturer transfers to Distributor
    function transferToDistributor(uint _id, address _distributor, uint _timestamp) public productExists(_id) onlyOwner(_id) onlyRole(MANUFACTURER_ROLE) {
        require(hasRole(DISTRIBUTOR_ROLE, _distributor), "Receiver must be a Distributor.");
        require(products[_id].state == ProductState.Packaged, "The current state does not allow transfering to Distributor");
        products[_id].currentOwner = _distributor;
        products[_id].state = ProductState.AtDistributor;
        products[_id].timestamp = _timestamp;

        emit UpdateProductState(_id, ProductState.AtDistributor, msg.sender, _distributor, _timestamp);
    }

    // Distributor transfers to Retailer
    function transferToRetailer(uint _id, address _retailer, uint _timestamp) public productExists(_id) onlyOwner(_id) onlyRole(DISTRIBUTOR_ROLE) {
        require(hasRole(RETAILER_ROLE, _retailer), "Receiver must be a Retailer.");
        require(products[_id].state == ProductState.AtDistributor, "The current state does not allow transfering to Retailer.");
        products[_id].currentOwner = _retailer;
        products[_id].state = ProductState.AtRetailer;
        products[_id].timestamp = _timestamp;

        emit UpdateProductState(_id, ProductState.AtRetailer, msg.sender, _retailer, _timestamp);
    }

    // Retailer sells to Consumer
    function sellToConsumer(uint _id, uint _timestamp) public productExists(_id) onlyOwner(_id) onlyRole(RETAILER_ROLE) notSold(_id) {
        require(products[_id].state == ProductState.AtRetailer, "The current state does not allow selling to consumer.");
        products[_id].currentOwner  = address(0);
        products[_id].state = ProductState.Sold;
        products[_id].timestamp = _timestamp;

        emit UpdateProductState(_id, ProductState.Sold, msg.sender, address(0), _timestamp);
    }

    /* ========== VIEW FUNCTIONS ========== */
    // Get product ID (on-chain ID) from product code (off-chain ID)
    function getIdFromCode(string memory _idCode) public view returns (uint) {
        uint id = productIdByCode[_idCode];
        require(id > 0, "Product does not exist.");
        return id;
    }

    // Get detailed product info
    function getProductInfo(uint _id) public view productExists(_id) returns (string memory, string memory, address, ProductState, string memory) {
        return (
            products[_id].code,
            products[_id].name,
            products[_id].currentOwner,
            products[_id].state,
            products[_id].ipfsHash
        );
    }

    function getParticipant(address _account) public view returns(string memory, string memory) {
        require(bytes(participants[_account].name).length > 0, "Participant does not exist.");
        string memory roleStr;
        if (participants[_account].role == MANUFACTURER_ROLE) roleStr = "Manufacturer";
        else if (participants[_account].role == DISTRIBUTOR_ROLE) roleStr = "Distributor";
        else if (participants[_account].role == RETAILER_ROLE) roleStr = "Retailer";
        else roleStr = "None";

        return (participants[_account].name, roleStr);
    }
}