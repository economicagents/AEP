// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {ConditionalEscrowFactory} from "../src/relationships/ConditionalEscrowFactory.sol";
import {ConditionalEscrow} from "../src/relationships/ConditionalEscrow.sol";
import {MockERC20Full} from "./MockERC20Full.sol";
import {MockERC8004Validation} from "./MockERC8004Validation.sol";

contract ConditionalEscrowFactoryTest is Test {
    ConditionalEscrowFactory public factory;
    MockERC20Full public token;
    MockERC8004Validation public validationRegistry;

    address public treasury;
    address public consumer;
    address public provider;
    address public validator;
    uint256 constant PROVIDER_AGENT_ID = 1;

    function setUp() public {
        treasury = makeAddr("treasury");
        consumer = makeAddr("consumer");
        provider = makeAddr("provider");
        validator = makeAddr("validator");
        token = new MockERC20Full();
        token.mint(consumer, 1000e6);
        validationRegistry = new MockERC8004Validation();
    }

    function test_CreateEscrow_NoFee() public {
        factory = new ConditionalEscrowFactory(treasury);
        vm.prank(consumer);
        address escrow = factory.createEscrow(
            consumer, provider, PROVIDER_AGENT_ID, address(token), address(validationRegistry), validator, 80, 0
        );
        assertTrue(escrow != address(0));
        assertEq(ConditionalEscrow(escrow).consumer(), consumer);
        assertEq(ConditionalEscrow(escrow).provider(), provider);
        assertEq(token.balanceOf(treasury), 0);
    }

    function test_CreateEscrow_WithSetupFee() public {
        factory = new ConditionalEscrowFactory(treasury);
        uint256 fee = 2e6; // $2
        vm.startPrank(consumer);
        token.approve(address(factory), fee);
        address escrow = factory.createEscrow(
            consumer, provider, PROVIDER_AGENT_ID, address(token), address(validationRegistry), validator, 80, fee
        );
        vm.stopPrank();
        assertTrue(escrow != address(0));
        assertEq(token.balanceOf(treasury), fee);
        assertEq(token.balanceOf(consumer), 1000e6 - fee);
    }

    function test_CreateEscrow_FeeRequiresTreasury() public {
        factory = new ConditionalEscrowFactory(address(0));
        vm.prank(consumer);
        vm.expectRevert(ConditionalEscrowFactory.ConditionalEscrowFactoryFeeRequiresTreasury.selector);
        factory.createEscrow(
            consumer, provider, PROVIDER_AGENT_ID, address(token), address(validationRegistry), validator, 80, 2e6
        );
    }

    function test_CreateEscrow_ZeroAddressReverts() public {
        factory = new ConditionalEscrowFactory(treasury);
        vm.prank(consumer);
        vm.expectRevert(ConditionalEscrowFactory.ConditionalEscrowFactoryZeroAddress.selector);
        factory.createEscrow(
            address(0), provider, PROVIDER_AGENT_ID, address(token), address(validationRegistry), validator, 80, 0
        );
    }
}
