// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {SLAContractFactory} from "../src/relationships/SLAContractFactory.sol";
import {SLAContract} from "../src/relationships/SLAContract.sol";
import {MockERC20Full} from "./MockERC20Full.sol";
import {MockERC8004Validation} from "./MockERC8004Validation.sol";

contract SLAContractFactoryTest is Test {
    SLAContractFactory public factory;
    MockERC20Full public token;
    MockERC8004Validation public validationRegistry;

    address public treasury;
    address public provider;
    address public consumer;
    uint256 constant PROVIDER_AGENT_ID = 1;
    uint256 constant STAKE_AMOUNT = 100e6;

    function setUp() public {
        treasury = makeAddr("treasury");
        provider = makeAddr("provider");
        consumer = makeAddr("consumer");
        token = new MockERC20Full();
        token.mint(provider, 200e6);
        validationRegistry = new MockERC8004Validation();
    }

    function test_CreateSLA_NoFee() public {
        factory = new SLAContractFactory(treasury);
        vm.prank(provider);
        address sla = factory.createSLA(
            provider, consumer, PROVIDER_AGENT_ID, address(token), STAKE_AMOUNT, address(validationRegistry), 80, 0
        );
        assertTrue(sla != address(0));
        assertEq(SLAContract(sla).provider(), provider);
        assertEq(SLAContract(sla).consumer(), consumer);
        assertEq(token.balanceOf(treasury), 0);
    }

    function test_CreateSLA_WithSetupFee() public {
        factory = new SLAContractFactory(treasury);
        uint256 fee = 5e6; // $5
        vm.startPrank(provider);
        token.approve(address(factory), fee);
        address sla = factory.createSLA(
            provider, consumer, PROVIDER_AGENT_ID, address(token), STAKE_AMOUNT, address(validationRegistry), 80, fee
        );
        vm.stopPrank();
        assertTrue(sla != address(0));
        assertEq(token.balanceOf(treasury), fee);
        assertEq(token.balanceOf(provider), 200e6 - fee);
    }

    function test_CreateSLA_FeeRequiresTreasury() public {
        factory = new SLAContractFactory(address(0));
        vm.prank(provider);
        vm.expectRevert(SLAContractFactory.SLAContractFactoryFeeRequiresTreasury.selector);
        factory.createSLA(
            provider, consumer, PROVIDER_AGENT_ID, address(token), STAKE_AMOUNT, address(validationRegistry), 80, 5e6
        );
    }

    function test_CreateSLA_ZeroAddressReverts() public {
        factory = new SLAContractFactory(treasury);
        vm.prank(provider);
        vm.expectRevert(SLAContractFactory.SLAContractFactoryZeroAddress.selector);
        factory.createSLA(
            address(0), consumer, PROVIDER_AGENT_ID, address(token), STAKE_AMOUNT, address(validationRegistry), 80, 0
        );
    }

    function test_CreateSLA_ZeroValidationRegistryReverts() public {
        factory = new SLAContractFactory(treasury);
        vm.prank(provider);
        vm.expectRevert(SLAContractFactory.SLAContractFactoryZeroAddress.selector);
        factory.createSLA(provider, consumer, PROVIDER_AGENT_ID, address(token), STAKE_AMOUNT, address(0), 80, 0);
    }
}
