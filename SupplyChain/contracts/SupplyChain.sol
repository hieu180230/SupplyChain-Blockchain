// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./RoleManager.sol";

contract SupplyChain {
    RoleManager public roleManager;

    /* ========== PRODUCT ========== */
    enum ProductState { 
        None, 
        Manufacturing,
        QC_Passed,
        Packaged,
        AtDistributor,
        AtRetailer,
        Sold
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

    /* ========== EVENTS ========== */
    event InitProduct(uint indexed id, address owner, uint timestamp);
    event UpdateProductState(
        uint indexed id,
        ProductState newState,
        address from,
        address to,
        uint timestamp
    );

    /* ========== CONSTRUCTOR ========== */
    constructor(address _roleManager) {
        roleManager = RoleManager(_roleManager);
    }

    /* ========== MODIFIERS ========== */
    modifier productExists(uint _id) {
        require(_id <= productCount && _id > 0, "Product does not exist");
        _;
    }

    modifier onlyOwner(uint _id) {
        require(products[_id].currentOwner == msg.sender, "Not owner");
        _;
    }

    modifier notSold(uint _id) {
        require(products[_id].state != ProductState.Sold, "Already sold");
        _;
    }

    modifier onlyManufacturer() {
        require(roleManager.isManufacturer(msg.sender), "Not manufacturer");
        _;
    }

    modifier onlyDistributor() {
        require(roleManager.isDistributor(msg.sender), "Not distributor");
        _;
    }

    modifier onlyRetailer() {
        require(roleManager.isRetailer(msg.sender), "Not retailer");
        _;
    }

    /* ========== PRODUCT LIFECYCLE FUNCTIONS ========== */
    function initProduct(
        string calldata _code,
        string calldata _name,
        string calldata _ipfsHash,
        uint _timestamp
    ) external onlyManufacturer {
        require(bytes(_code).length > 0, "Code empty");
        require(productIdByCode[_code] == 0, "Code existed");

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

        emit InitProduct(productCount, msg.sender, _timestamp);
        emit UpdateProductState(productCount, ProductState.Manufacturing, msg.sender, msg.sender, _timestamp);
    }

    function passQC(uint _id, uint _timestamp) 
        external 
        productExists(_id) 
        onlyOwner(_id) 
        onlyManufacturer 
    {
        require(products[_id].state == ProductState.Manufacturing, "Invalid state");
        products[_id].state = ProductState.QC_Passed;
        products[_id].timestamp = _timestamp;
        emit UpdateProductState(_id, ProductState.QC_Passed, msg.sender, msg.sender, _timestamp);
    }

    function packageProduct(uint _id, uint _timestamp) 
        external 
        productExists(_id) 
        onlyOwner(_id) 
        onlyManufacturer 
    {
        require(products[_id].state == ProductState.QC_Passed, "Invalid state");
        products[_id].state = ProductState.Packaged;
        products[_id].timestamp = _timestamp;
        emit UpdateProductState(_id, ProductState.Packaged, msg.sender, msg.sender, _timestamp);
    }

    function transferToDistributor(uint _id, address _distributor, uint _timestamp) 
        external 
        productExists(_id) 
        onlyOwner(_id) 
        onlyManufacturer 
    {
        require(roleManager.isDistributor(_distributor), "Not distributor");
        require(products[_id].state == ProductState.Packaged, "Invalid state");

        products[_id].currentOwner = _distributor;
        products[_id].state = ProductState.AtDistributor;
        products[_id].timestamp = _timestamp;

        emit UpdateProductState(_id, ProductState.AtDistributor, msg.sender, _distributor, _timestamp);
    }

    function transferToRetailer(uint _id, address _retailer, uint _timestamp) 
        external 
        productExists(_id) 
        onlyOwner(_id) 
        onlyDistributor 
    {
        require(roleManager.isRetailer(_retailer), "Not retailer");
        require(products[_id].state == ProductState.AtDistributor, "Invalid state");

        products[_id].currentOwner = _retailer;
        products[_id].state = ProductState.AtRetailer;
        products[_id].timestamp = _timestamp;

        emit UpdateProductState(_id, ProductState.AtRetailer, msg.sender, _retailer, _timestamp);
    }

    function sellToConsumer(uint _id, uint _timestamp) 
        external 
        productExists(_id) 
        onlyOwner(_id) 
        onlyRetailer 
        notSold(_id)
    {
        require(products[_id].state == ProductState.AtRetailer, "Invalid state");

        products[_id].currentOwner = address(0);
        products[_id].state = ProductState.Sold;
        products[_id].timestamp = _timestamp;

        emit UpdateProductState(_id, ProductState.Sold, msg.sender, address(0), _timestamp);
    }

    /* ========== VIEW FUNCTIONS ========== */
    function getIdFromCode(string memory _code) external view returns (uint) {
        uint id = productIdByCode[_code];
        require(id > 0, "Not exist");
        return id;
    }

    function getProductInfo(uint _id) 
        external 
        view 
        productExists(_id) 
        returns (
            string memory code,
            string memory name,
            address currentOwner,
            ProductState state,
            string memory ipfsHash,
            uint timestamp
        )
    {
        Product memory p = products[_id];
        return (p.code, p.name, p.currentOwner, p.state, p.ipfsHash, p.timestamp);
    }
}