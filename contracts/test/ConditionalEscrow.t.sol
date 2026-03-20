// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {ConditionalEscrow} from "../src/relationships/ConditionalEscrow.sol";
import {MockERC20Full} from "./MockERC20Full.sol";
import {MockERC8004Validation} from "./MockERC8004Validation.sol";

contract ConditionalEscrowTest is Test {
    ConditionalEscrow public escrow;
    MockERC20Full public token;
    MockERC8004Validation public validationRegistry;

    address public consumer;
    address public provider;
    address public validator;
    uint256 constant PROVIDER_AGENT_ID = 1;
    uint256 constant AMOUNT = 500e6;
    bytes32 constant REQUEST_HASH = keccak256("validation-1");

    function setUp() public {
        consumer = makeAddr("consumer");
        provider = makeAddr("provider");
        validator = makeAddr("validator");

        token = new MockERC20Full();
        token.mint(consumer, 1000e6);
        validationRegistry = new MockERC8004Validation();

        escrow = new ConditionalEscrow(
            consumer,
            provider,
            PROVIDER_AGENT_ID,
            address(token),
            address(validationRegistry),
            validator,
            80,
            new uint256[](0)
        );
    }

    function test_FullFlow_Release() public {
        vm.startPrank(consumer);
        token.approve(address(escrow), AMOUNT);
        escrow.fund(AMOUNT);
        vm.stopPrank();

        assertEq(uint256(escrow.state()), 0); // FUNDED
        assertEq(token.balanceOf(address(escrow)), AMOUNT);

        vm.prank(provider);
        escrow.acknowledge();
        assertEq(uint256(escrow.state()), 1); // IN_PROGRESS

        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 90);

        vm.prank(provider);
        escrow.submitForValidation(REQUEST_HASH, 0);
        assertEq(uint256(escrow.state()), 2); // VALIDATING

        escrow.release(0);
        assertEq(uint256(escrow.state()), 3); // RELEASED
        assertEq(token.balanceOf(provider), AMOUNT);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function test_ReleaseRevertsValidationFailed() public {
        vm.startPrank(consumer);
        token.approve(address(escrow), AMOUNT);
        escrow.fund(AMOUNT);
        vm.stopPrank();

        vm.prank(provider);
        escrow.acknowledge();

        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 50); // below 80

        vm.prank(provider);
        escrow.submitForValidation(REQUEST_HASH, 0);

        vm.expectRevert(ConditionalEscrow.ConditionalEscrowValidationFailed.selector);
        escrow.release(0);
    }

    function test_ReleaseRevertsValidatorMismatch() public {
        vm.startPrank(consumer);
        token.approve(address(escrow), AMOUNT);
        escrow.fund(AMOUNT);
        vm.stopPrank();

        vm.prank(provider);
        escrow.acknowledge();

        address otherValidator = makeAddr("otherValidator");
        validationRegistry.setValidation(REQUEST_HASH, otherValidator, PROVIDER_AGENT_ID, 90);

        vm.prank(provider);
        escrow.submitForValidation(REQUEST_HASH, 0);

        vm.expectRevert(ConditionalEscrow.ConditionalEscrowValidationFailed.selector);
        escrow.release(0);
    }

    function test_ReleaseRevertsAgentMismatch() public {
        vm.startPrank(consumer);
        token.approve(address(escrow), AMOUNT);
        escrow.fund(AMOUNT);
        vm.stopPrank();

        vm.prank(provider);
        escrow.acknowledge();

        validationRegistry.setValidation(REQUEST_HASH, validator, 999, 90); // wrong agentId

        vm.prank(provider);
        escrow.submitForValidation(REQUEST_HASH, 0);

        vm.expectRevert(ConditionalEscrow.ConditionalEscrowAgentMismatch.selector);
        escrow.release(0);
    }

    function test_DisputeFromFunded() public {
        vm.startPrank(consumer);
        token.approve(address(escrow), AMOUNT);
        escrow.fund(AMOUNT);
        escrow.dispute();
        vm.stopPrank();

        assertEq(uint256(escrow.state()), 4); // DISPUTED
        assertEq(token.balanceOf(consumer), 1000e6);
    }

    function test_DisputeFromValidating_ValidationFailed() public {
        vm.startPrank(consumer);
        token.approve(address(escrow), AMOUNT);
        escrow.fund(AMOUNT);
        vm.stopPrank();

        vm.prank(provider);
        escrow.acknowledge();

        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 30);

        vm.prank(provider);
        escrow.submitForValidation(REQUEST_HASH, 0);

        vm.prank(consumer);
        escrow.dispute();

        assertEq(uint256(escrow.state()), 4); // DISPUTED
        assertEq(token.balanceOf(consumer), 1000e6);
    }

    function test_DisputeRevertsWhenValidationPassed() public {
        vm.startPrank(consumer);
        token.approve(address(escrow), AMOUNT);
        escrow.fund(AMOUNT);
        vm.stopPrank();

        vm.prank(provider);
        escrow.acknowledge();

        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 90);

        vm.prank(provider);
        escrow.submitForValidation(REQUEST_HASH, 0);

        vm.prank(consumer);
        vm.expectRevert(ConditionalEscrow.ConditionalEscrowValidationFailed.selector);
        escrow.dispute();
    }

    function test_FundRevertsNotConsumer() public {
        vm.prank(provider);
        vm.expectRevert(ConditionalEscrow.ConditionalEscrowNotConsumer.selector);
        escrow.fund(AMOUNT);
    }

    function test_AcknowledgeRevertsNotProvider() public {
        vm.startPrank(consumer);
        token.approve(address(escrow), AMOUNT);
        escrow.fund(AMOUNT);
        vm.stopPrank();

        vm.prank(consumer);
        vm.expectRevert(ConditionalEscrow.ConditionalEscrowNotProvider.selector);
        escrow.acknowledge();
    }

    function test_ConstructorRevertsZeroValidator() public {
        vm.expectRevert(ConditionalEscrow.ConditionalEscrowZeroAddress.selector);
        new ConditionalEscrow(
            consumer,
            provider,
            PROVIDER_AGENT_ID,
            address(token),
            address(validationRegistry),
            address(0),
            80,
            new uint256[](0)
        );
    }

    function test_FundRevertsZeroAmount() public {
        vm.prank(consumer);
        vm.expectRevert(ConditionalEscrow.ConditionalEscrowZeroAmount.selector);
        escrow.fund(0);
    }

    function test_Milestones_PartialRelease() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 200e6;
        amounts[1] = 300e6;
        ConditionalEscrow milestoneEscrow = new ConditionalEscrow(
            consumer, provider, PROVIDER_AGENT_ID, address(token), address(validationRegistry), validator, 80, amounts
        );
        token.mint(consumer, 500e6);

        vm.startPrank(consumer);
        token.approve(address(milestoneEscrow), 500e6);
        milestoneEscrow.fund(500e6);
        vm.stopPrank();

        vm.prank(provider);
        milestoneEscrow.acknowledge();

        bytes32 hash0 = keccak256("milestone-0");
        validationRegistry.setValidation(hash0, validator, PROVIDER_AGENT_ID, 90);
        vm.prank(provider);
        milestoneEscrow.submitForValidation(hash0, 0);
        milestoneEscrow.release(0);

        assertEq(uint256(milestoneEscrow.state()), 1); // IN_PROGRESS
        assertEq(token.balanceOf(provider), 200e6);

        bytes32 hash1 = keccak256("milestone-1");
        validationRegistry.setValidation(hash1, validator, PROVIDER_AGENT_ID, 90);
        vm.prank(provider);
        milestoneEscrow.submitForValidation(hash1, 1);
        milestoneEscrow.release(1);

        assertEq(uint256(milestoneEscrow.state()), 3); // RELEASED
        assertEq(token.balanceOf(provider), 500e6);
    }
}
