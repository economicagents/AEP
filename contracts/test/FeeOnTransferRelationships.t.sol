// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {SLAContract} from "../src/relationships/SLAContract.sol";
import {CreditFacility} from "../src/relationships/CreditFacility.sol";
import {ConditionalEscrow} from "../src/relationships/ConditionalEscrow.sol";
import {MockFeeOnTransferERC20} from "./MockFeeOnTransferERC20.sol";
import {MockERC8004Validation} from "./MockERC8004Validation.sol";

contract FeeOnTransferRelationshipsTest is Test {
    MockFeeOnTransferERC20 public token;
    MockERC8004Validation public validationRegistry;

    address public provider;
    address public consumer;
    address public lender;
    address public borrower;
    address public validator;

    uint256 constant PROVIDER_AGENT_ID = 1;
    uint256 constant BORROWER_AGENT_ID = 2;
    uint256 constant FEE_BPS = 100; // 1%
    uint256 constant STAKE_AMOUNT = 100e6;
    bytes32 constant REQUEST_HASH = keccak256("fot-request");

    function setUp() public {
        provider = makeAddr("provider");
        consumer = makeAddr("consumer");
        lender = makeAddr("lender");
        borrower = makeAddr("borrower");
        validator = makeAddr("validator");

        token = new MockFeeOnTransferERC20(FEE_BPS);
        validationRegistry = new MockERC8004Validation();

        token.mint(provider, 200e6);
        token.mint(lender, 2000e6);
        token.mint(borrower, 2000e6);
        token.mint(consumer, 2000e6);
    }

    function test_SLA_StakeUsesReceivedBalance() public {
        SLAContract sla = new SLAContract(
            provider,
            consumer,
            PROVIDER_AGENT_ID,
            address(token),
            STAKE_AMOUNT,
            address(validationRegistry),
            80
        );

        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        vm.stopPrank();

        uint256 expectedReceived = STAKE_AMOUNT - (STAKE_AMOUNT * FEE_BPS / 10_000);
        assertEq(sla.stakedBalance(), expectedReceived);
        assertEq(token.balanceOf(address(sla)), expectedReceived);
    }

    function test_SLA_BreachPaysConsumerStakedBalance() public {
        SLAContract sla = new SLAContract(
            provider,
            consumer,
            PROVIDER_AGENT_ID,
            address(token),
            STAKE_AMOUNT,
            address(validationRegistry),
            80
        );

        vm.startPrank(provider);
        token.approve(address(sla), STAKE_AMOUNT);
        sla.stake();
        vm.stopPrank();

        uint256 expectedReceived = STAKE_AMOUNT - (STAKE_AMOUNT * FEE_BPS / 10_000);
        validationRegistry.setValidation(REQUEST_HASH, validator, PROVIDER_AGENT_ID, 50);

        vm.prank(consumer);
        sla.declareBreach(REQUEST_HASH);

        uint256 expectedNetToConsumer = expectedReceived - (expectedReceived * FEE_BPS / 10_000);
        assertEq(token.balanceOf(consumer), 2000e6 + expectedNetToConsumer);
    }

    function test_CreditFacility_DepositCreditsReceivedAmount() public {
        CreditFacility facility = new CreditFacility(
            lender,
            borrower,
            address(token),
            1000e6,
            0,
            30 days,
            address(0),
            address(0),
            BORROWER_AGENT_ID
        );

        uint256 depositAmount = 500e6;
        vm.startPrank(lender);
        token.approve(address(facility), depositAmount);
        facility.deposit(depositAmount);
        vm.stopPrank();

        uint256 expectedReceived = depositAmount - (depositAmount * FEE_BPS / 10_000);
        assertEq(token.balanceOf(address(facility)), expectedReceived);
    }

    function test_CreditFacility_RepayCreditsReceivedAmount() public {
        CreditFacility facility = new CreditFacility(
            lender,
            borrower,
            address(token),
            1000e6,
            0,
            30 days,
            address(0),
            address(0),
            BORROWER_AGENT_ID
        );

        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        uint256 drawAmount = 200e6;
        vm.prank(borrower);
        facility.draw(drawAmount);

        uint256 repayNominal = 100e6;
        vm.startPrank(borrower);
        token.approve(address(facility), repayNominal);
        facility.repay(repayNominal);
        vm.stopPrank();

        uint256 expectedRepaid = repayNominal - (repayNominal * FEE_BPS / 10_000);
        assertEq(facility.drawn(), drawAmount - expectedRepaid);
    }

    function test_ConditionalEscrow_FundUsesReceivedBalance() public {
        ConditionalEscrow escrow = new ConditionalEscrow(
            consumer,
            provider,
            PROVIDER_AGENT_ID,
            address(token),
            address(validationRegistry),
            validator,
            80,
            new uint256[](0)
        );

        uint256 fundAmount = 500e6;
        vm.startPrank(consumer);
        token.approve(address(escrow), fundAmount);
        escrow.fund(fundAmount);
        vm.stopPrank();

        uint256 expectedReceived = fundAmount - (fundAmount * FEE_BPS / 10_000);
        assertEq(escrow.amount(), expectedReceived);
        assertEq(token.balanceOf(address(escrow)), expectedReceived);
    }

    function test_ConditionalEscrow_DisputeReturnsRemainingBalance() public {
        ConditionalEscrow escrow = new ConditionalEscrow(
            consumer,
            provider,
            PROVIDER_AGENT_ID,
            address(token),
            address(validationRegistry),
            validator,
            80,
            new uint256[](0)
        );

        uint256 fundAmount = 500e6;
        vm.startPrank(consumer);
        token.approve(address(escrow), fundAmount);
        escrow.fund(fundAmount);
        escrow.dispute();
        vm.stopPrank();

        uint256 expectedReceived = fundAmount - (fundAmount * FEE_BPS / 10_000);
        uint256 expectedNetToConsumer = expectedReceived - (expectedReceived * FEE_BPS / 10_000);
        assertEq(token.balanceOf(consumer), 2000e6 - fundAmount + expectedNetToConsumer);
    }
}
