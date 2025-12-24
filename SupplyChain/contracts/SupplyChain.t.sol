// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { RoleManager } from "./RoleManager.sol";
import { SupplyChain } from "./SupplyChain.sol";
import { Test } from "forge-std/Test.sol";

contract SupplyChainTest is Test {
    RoleManager roleManager;
    SupplyChain supplyChain;

    address admin = makeAddr("admin");
    address manufacturer = makeAddr("manufacturer");
    address distributor = makeAddr("distributor");
    address retailer = makeAddr("retailer");

    uint constant TIMESTAMP = 1000;
    string constant PRODUCT_CODE = "LAPTOP-001";
    string constant PRODUCT_NAME = "Gaming Laptop";
    string constant IPFS_HASH = "Qmhash";

    function setUp() public {
        roleManager = new RoleManager();
        supplyChain = new SupplyChain(address(roleManager));
        roleManager.addParticipant(manufacturer, roleManager.MANUFACTURER_ROLE(), "Manufacturer Inc", TIMESTAMP);
        roleManager.addParticipant(distributor, roleManager.DISTRIBUTOR_ROLE(), "Big Distributor", TIMESTAMP);
        roleManager.addParticipant(retailer, roleManager.RETAILER_ROLE(), "Best Retailer", TIMESTAMP);
    }

    function beforeTestSetup(bytes4 testSelector) public pure returns(bytes[] memory beforeTestCalldata) {
        if (
            testSelector == this.test_RemoveParticipantEmitsEvent.selector ||
            testSelector == this.test_RemoveParticipantFromParticipantList.selector
        ) {
            beforeTestCalldata = new bytes[](1);
            beforeTestCalldata[0] = abi.encodePacked(this.test_AddParticipantEmitsEvent.selector);
        }
        if (
            testSelector == this.testFuzz_InitProductWithExistingCode.selector ||
            testSelector == this.test_PassQCUpdatesProductState.selector ||
            testSelector == this.test_PassQCEmitsEvent.selector ||
            testSelector == this.testFuzz_PassQCByNotOwner.selector
        ) {
            beforeTestCalldata = new bytes[](1);
            beforeTestCalldata[0] = abi.encodePacked(this.test_InitProductToProductList.selector);
        }
        if (
            testSelector == this.test_PackageProductUpdatesProductState.selector ||
            testSelector == this.test_PackageProductEmitsEvent.selector ||
            testSelector == this.testFuzz_PackageProductByNotOwner.selector
        ) {
            beforeTestCalldata = new bytes[](2);
            beforeTestCalldata[0] = abi.encodePacked(this.test_InitProductToProductList.selector);
            beforeTestCalldata[1] = abi.encodePacked(this.test_PassQCUpdatesProductState.selector);
        }
        if (
            testSelector == this.test_TransferToDistributorUpdateProductState.selector ||
            testSelector == this.test_TransferToDistributorEmitsEvent.selector
        ) {
            beforeTestCalldata = new bytes[](3);
            beforeTestCalldata[0] = abi.encodePacked(this.test_InitProductToProductList.selector);
            beforeTestCalldata[1] = abi.encodePacked(this.test_PassQCUpdatesProductState.selector);
            beforeTestCalldata[2] = abi.encodePacked(this.test_PackageProductUpdatesProductState.selector);
        }
        if (
            testSelector == this.test_TransferToRetailerUpdateProductState.selector ||
            testSelector == this.test_TransferToRetailerEmitsEvent.selector
        ) {
            beforeTestCalldata = new bytes[](4);
            beforeTestCalldata[0] = abi.encodePacked(this.test_InitProductToProductList.selector);
            beforeTestCalldata[1] = abi.encodePacked(this.test_PassQCUpdatesProductState.selector);
            beforeTestCalldata[2] = abi.encodePacked(this.test_PackageProductUpdatesProductState.selector);
            beforeTestCalldata[3] = abi.encodePacked(this.test_TransferToDistributorUpdateProductState.selector);
        }
        if (
            testSelector == this.test_SellToConsumerUpdateProductState.selector ||
            testSelector == this.test_SellToConsumerEmitsEvent.selector ||
            testSelector == this.testFuzz_SellToConsumerByNotRetailer.selector
        ) {
            beforeTestCalldata = new bytes[](5);
            beforeTestCalldata[0] = abi.encodePacked(this.test_InitProductToProductList.selector);
            beforeTestCalldata[1] = abi.encodePacked(this.test_PassQCUpdatesProductState.selector);
            beforeTestCalldata[2] = abi.encodePacked(this.test_PackageProductUpdatesProductState.selector);
            beforeTestCalldata[3] = abi.encodePacked(this.test_TransferToDistributorUpdateProductState.selector);
            beforeTestCalldata[4] = abi.encodePacked(this.test_TransferToRetailerUpdateProductState.selector);
        }
    }

    /* ========== AddParticipant ========== */
    function test_AddParticipantToParticipantList() public {
        address _account = address(0x11);
        roleManager.addParticipant(_account, roleManager.MANUFACTURER_ROLE(), "Manu", TIMESTAMP);
        (string memory name, bytes32 role) = roleManager.participants(_account);

        assertEq(name, "Manu");
        assertEq(role, roleManager.MANUFACTURER_ROLE());
        assertTrue(roleManager.hasRole(roleManager.MANUFACTURER_ROLE(), _account));
    }

    function test_AddParticipantEmitsEvent() public {
        address _account = address(0x11);
        vm.expectEmit();
        emit RoleManager.AddParticipant(_account, roleManager.MANUFACTURER_ROLE(), TIMESTAMP);

        roleManager.addParticipant(_account, roleManager.MANUFACTURER_ROLE(), "Manu", TIMESTAMP);
    }

    /* ========== removeParticipant ========== */
    function test_RemoveParticipantFromParticipantList() public {
        address _account = address(0x11);
        roleManager.removeParticipant(_account, roleManager.MANUFACTURER_ROLE(), TIMESTAMP);
        (string memory name, bytes32 role) = roleManager.participants(_account);

        assertEq(name, "");
        assertEq(role, bytes32(0));
        assertFalse(roleManager.hasRole(roleManager.MANUFACTURER_ROLE(), _account));
    }

    function test_RemoveParticipantEmitsEvent() public {
        address _account = address(0x11);
        vm.expectEmit();
        emit RoleManager.RemoveParticipant(_account, roleManager.MANUFACTURER_ROLE(), TIMESTAMP);

        roleManager.removeParticipant(_account, roleManager.MANUFACTURER_ROLE(), TIMESTAMP);
    }

    /* ========== initProduct ========== */
    function test_InitProductToProductList() public {
        vm.prank(manufacturer);
        supplyChain.initProduct("code", "laptop", "hash", 1000);

        (uint id, string memory code, string memory name, address currentOwner, string memory ipfsHash, SupplyChain.ProductState state, uint timestamp) = supplyChain.products(1);
        assertEq(id, 1);
        assertEq(name, "laptop");
        assertEq(code, "code");
        assertEq(currentOwner, manufacturer);
        assertEq(uint(state), uint(SupplyChain.ProductState.Manufacturing));
        assertEq(ipfsHash, "hash");
        assertEq(timestamp, 1000);
    }

    function test_InitProductEmitsEvent() public {
        vm.prank(manufacturer);
        vm.expectEmit();
        emit SupplyChain.InitProduct(1, manufacturer, 1000);
        vm.expectEmit();
        emit SupplyChain.UpdateProductState(1, SupplyChain.ProductState.Manufacturing, manufacturer, manufacturer, 1000);

        supplyChain.initProduct("code", "laptop", "hash", 1000);
    }

    function testFuzz_InitProductByNotManufacturer(address account) public {
        vm.assume(account != manufacturer);
        vm.prank(account);
        vm.expectRevert();

        supplyChain.initProduct("code", "laptop", "hash", 1000);
    }

    function testFuzz_InitProductWithExistingCode() public {
        vm.prank(manufacturer);
        vm.expectRevert();

        supplyChain.initProduct("code", "phone", "hash2", 1000);
    }

    /* ========== passQC ========== */
    function test_PassQCUpdatesProductState() public {
        vm.prank(manufacturer);

        supplyChain.passQC(1, 1000);
        (,,,,, SupplyChain.ProductState state,) = supplyChain.products(1);

        assertEq(uint(state), uint(SupplyChain.ProductState.QC_Passed));
    }

    function test_PassQCEmitsEvent() public {
        vm.prank(manufacturer);
        vm.expectEmit();
        emit SupplyChain.UpdateProductState(1, SupplyChain.ProductState.QC_Passed, manufacturer, manufacturer, 1000);

        supplyChain.passQC(1, 1000);
    }

    function testFuzz_PassQCByNotOwner(address account) public {
        vm.assume(account != manufacturer);
        vm.prank(account);
        vm.expectRevert();

        supplyChain.passQC(1, 1000);
    }

    /* ========== packageProduct ========== */
    function test_PackageProductUpdatesProductState() public {
        vm.prank(manufacturer);

        supplyChain.packageProduct(1, 1000);
        (,,,,, SupplyChain.ProductState state,) = supplyChain.products(1);

        assertEq(uint(state), uint(SupplyChain.ProductState.Packaged));
    }

    function test_PackageProductEmitsEvent() public {
        vm.prank(manufacturer);
        vm.expectEmit();
        emit SupplyChain.UpdateProductState(1, SupplyChain.ProductState.Packaged, manufacturer, manufacturer, 1000);

        supplyChain.packageProduct(1, 1000);
    }

    function testFuzz_PackageProductByNotOwner(address account) public {
        vm.assume(account != manufacturer);
        vm.prank(account);
        vm.expectRevert();

        supplyChain.packageProduct(1, 1000);
    }

    /* ========== transferToDistributor ========== */
    function test_TransferToDistributorUpdateProductState() public {
        vm.prank(manufacturer);

        supplyChain.transferToDistributor(1, distributor, 1000);
        (,,, address currentOwner,, SupplyChain.ProductState state,) = supplyChain.products(1);

        assertEq(uint(state), uint(SupplyChain.ProductState.AtDistributor));
        assertEq(currentOwner, distributor);
    }

    function test_TransferToDistributorEmitsEvent() public {
        vm.prank(manufacturer);
        vm.expectEmit();
        emit SupplyChain.UpdateProductState(1, SupplyChain.ProductState.AtDistributor, manufacturer, distributor, 1000);

        supplyChain.transferToDistributor(1, distributor, 1000);
    }

    /* ========== transferToRetailer ========== */
    function test_TransferToRetailerUpdateProductState() public {
        vm.prank(distributor);

        supplyChain.transferToRetailer(1, retailer, 1000);
        (,,, address currentOwner,, SupplyChain.ProductState state,) = supplyChain.products(1);

        assertEq(uint(state), uint(SupplyChain.ProductState.AtRetailer));
        assertEq(currentOwner, retailer);
    }

    function test_TransferToRetailerEmitsEvent() public {
        vm.prank(distributor);
        vm.expectEmit();
        emit SupplyChain.UpdateProductState(1, SupplyChain.ProductState.AtRetailer, distributor, retailer, 1000);

        supplyChain.transferToRetailer(1, retailer, 1000);
    }

    /* ========== sellToConsumer ========== */
    function test_SellToConsumerUpdateProductState() public {
        vm.prank(retailer);

        supplyChain.sellToConsumer(1, 1000);
        (,,, address currentOwner,, SupplyChain.ProductState state,) = supplyChain.products(1);

        assertEq(uint(state), uint(SupplyChain.ProductState.Sold));
        assertEq(currentOwner, address(0));
    }

    function test_SellToConsumerEmitsEvent() public {
        vm.prank(retailer);
        vm.expectEmit();
        emit SupplyChain.UpdateProductState(1, SupplyChain.ProductState.Sold, retailer, address(0), 1000);

        supplyChain.sellToConsumer(1, 1000);
    }

    function testFuzz_SellToConsumerByNotRetailer(address account) public {
        vm.assume(account != retailer);
        vm.prank(account);
        vm.expectRevert();

        supplyChain.sellToConsumer(1, 1000);
    }
}