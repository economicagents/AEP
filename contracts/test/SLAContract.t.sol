// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {SLAContract} from "../src/relationships/SLAContract.sol";
import {MockERC20Full} from "./MockERC20Full.sol";
import {MockERC8004Validation} from "./MockERC8004Validation.sol";

contract SLAContractTest is Test {
    SLAContract public sla;
    MockERC20Full public token;
    MockERC8004Validation public validationRegistry;

    address public provider;
    address public consumer;
    address public validator;
    uint256 constant PROVIDER_AGENT_ID = 1;
    uint256 constant STAKE_AMOUNT = 100e6;
    bytes32 constant REQUEST_HASH = keccak256("sla-breach-1");

    function setUp() public {
        provider = makeAddr("provider");
        consumer = makeAddr("consumer");
        validator = makeAddr("validator");

        token = new MockERC20Full();
        token.mint(provider, 200e6);
        validationRegistry = new MockERC8004Validation();

        sla = new SLAContract(
            provider,
            consumer,
            PROVIDER_AGENT_ID,
            address(token),
            STAKE_AMOUNT,
            address(validationRegistry),
            80 // breach if response < 80
        );
    }

    function test_StakeAndUnstake() public {
        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        assertTrue(sla.staked());
        sla.unstake();
        assertFalse(sla.staked());
        assertEq(token.balanceOf(provider), 200e6);
        vm.stopPrank();
    }

    function test_DeclareBreach() public {
        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        vm.stopPrank();

        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 50); // below 80

        vm.prank(consumer);
        sla.declareBreach(REQUEST_HASH);

        assertTrue(sla.breached());
        assertFalse(sla.staked());
        assertEq(token.balanceOf(consumer), STAKE_AMOUNT);
    }

    function test_DeclareBreachRevertsThresholdNotMet() public {
        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        vm.stopPrank();

        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 90); // above 80

        vm.prank(consumer);
        vm.expectRevert(SLAContract.SLAContractBreachThresholdNotMet.selector);
        sla.declareBreach(REQUEST_HASH);
    }

    function test_DeclareBreachRevertsZeroValidator() public {
        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        vm.stopPrank();

        validationRegistry.setValidation(REQUEST_HASH, address(0), PROVIDER_AGENT_ID, 50); // validator = 0

        vm.prank(consumer);
        vm.expectRevert(SLAContract.SLAContractValidationFailed.selector);
        sla.declareBreach(REQUEST_HASH);
    }

    function test_DeclareBreachRevertsAgentMismatch() public {
        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        vm.stopPrank();

        validationRegistry.setValidation(REQUEST_HASH, validator, 999, 50); // wrong agentId

        vm.prank(consumer);
        vm.expectRevert(SLAContract.SLAContractAgentMismatch.selector);
        sla.declareBreach(REQUEST_HASH);
    }

    function test_ConstructorRevertsZeroValidationRegistry() public {
        vm.expectRevert(SLAContract.SLAContractZeroAddress.selector);
        new SLAContract(
            provider,
            consumer,
            PROVIDER_AGENT_ID,
            address(token),
            STAKE_AMOUNT,
            address(0), // validationRegistry = 0
            80
        );
    }

    function test_StakeRevertsNotProvider() public {
        vm.prank(consumer);
        vm.expectRevert(SLAContract.SLAContractNotProvider.selector);
        sla.stake();
    }

    function test_StakeRevertsAlreadyStaked() public {
        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT * 2);
        sla.stake();
        vm.expectRevert(SLAContract.SLAContractAlreadyStaked.selector);
        sla.stake();
        vm.stopPrank();
    }

    function test_DeclareBreachRevertsAlreadyBreached() public {
        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        vm.stopPrank();

        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 50);
        vm.prank(consumer);
        sla.declareBreach(REQUEST_HASH);

        vm.prank(consumer);
        vm.expectRevert(SLAContract.SLAContractAlreadyBreached.selector);
        sla.declareBreach(REQUEST_HASH);
    }

    function test_UnstakeRevertsAfterBreach() public {
        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        vm.stopPrank();

        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 50);
        vm.prank(consumer);
        sla.declareBreach(REQUEST_HASH);

        vm.prank(provider);
        vm.expectRevert(SLAContract.SLAContractNotStaked.selector);
        sla.unstake();
    }
}
