// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {CreditFacility} from "../src/relationships/CreditFacility.sol";
import {MockERC20Full} from "./MockERC20Full.sol";
import {MockERC8004Identity, MockERC8004Reputation} from "./MockERC8004.sol";

contract CreditFacilityTest is Test {
    CreditFacility public facility;
    MockERC20Full public token;
    MockERC8004Identity public identityRegistry;
    MockERC8004Reputation public reputationRegistry;

    address public lender;
    address public borrower;
    uint256 constant BORROWER_AGENT_ID = 1;
    uint256 constant LIMIT = 1000e6; // 1000 USDC
    uint256 constant MIN_REPUTATION = 80;

    function setUp() public {
        lender = makeAddr("lender");
        borrower = makeAddr("borrower");
        token = new MockERC20Full();
        identityRegistry = new MockERC8004Identity();
        reputationRegistry = new MockERC8004Reputation();

        token.mint(lender, 2000e6);
        identityRegistry.setAgentWallet(BORROWER_AGENT_ID, borrower);
        reputationRegistry.setReputation(BORROWER_AGENT_ID, lender, 85, 0); // 85/100

        facility = new CreditFacility(
            lender,
            borrower,
            address(token),
            LIMIT,
            MIN_REPUTATION,
            30 days,
            address(reputationRegistry),
            address(identityRegistry),
            BORROWER_AGENT_ID
        );
    }

    function test_Deposit() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();
        assertEq(token.balanceOf(address(facility)), 500e6);
    }

    function test_DepositRevertsZeroAmount() public {
        vm.prank(lender);
        vm.expectRevert(CreditFacility.CreditFacilityZeroAmount.selector);
        facility.deposit(0);
    }

    function test_DepositRevertsNotLender() public {
        vm.prank(borrower);
        vm.expectRevert(CreditFacility.CreditFacilityNotLender.selector);
        facility.deposit(100e6);
    }

    function test_Draw() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        facility.draw(200e6);

        assertEq(facility.drawn(), 200e6);
        assertEq(token.balanceOf(borrower), 200e6);
        assertEq(token.balanceOf(address(facility)), 300e6);
        assertGt(facility.repaymentDeadline(), block.timestamp);
    }

    function test_DrawRevertsExceedsLimit() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        vm.expectRevert(CreditFacility.CreditFacilityExceedsLimit.selector);
        facility.draw(600e6);
    }

    function test_DrawRevertsReputationTooLow() public {
        reputationRegistry.setReputation(BORROWER_AGENT_ID, lender, 50, 0); // below 80

        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        vm.expectRevert(CreditFacility.CreditFacilityReputationTooLow.selector);
        facility.draw(100e6);
    }

    function test_DrawRevertsBorrowerMismatch() public {
        identityRegistry.setAgentWallet(BORROWER_AGENT_ID, makeAddr("other")); // wrong wallet

        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        vm.expectRevert(CreditFacility.CreditFacilityBorrowerMismatch.selector);
        facility.draw(100e6);
    }

    function test_DrawRevertsFrozen() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        facility.freeze();
        vm.stopPrank();

        vm.prank(borrower);
        vm.expectRevert(CreditFacility.CreditFacilityFrozen.selector);
        facility.draw(100e6);
    }

    function test_Repay() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        facility.draw(200e6);

        vm.startPrank(borrower);
        token.approve(address(facility), 100e6);
        facility.repay(100e6);
        vm.stopPrank();

        assertEq(facility.drawn(), 100e6);
        assertEq(token.balanceOf(address(facility)), 400e6);
    }

    function test_RepayFullThenWithdraw() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        facility.draw(200e6);

        vm.startPrank(borrower);
        token.approve(address(facility), 200e6);
        facility.repay(200e6);
        vm.stopPrank();

        assertEq(facility.drawn(), 0);
        vm.startPrank(lender);
        facility.withdraw(500e6);
        vm.stopPrank();
        assertEq(token.balanceOf(lender), 2000e6); // back to original minus nothing (we deposited 500, drew 200, repaid 200, withdrew 500)
    }

    function test_DeclareDefault() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        facility.draw(200e6);

        vm.warp(block.timestamp + 31 days);

        vm.prank(lender);
        facility.declareDefault();

        assertTrue(facility.defaulted());
    }

    function test_DeclareDefaultRevertsBeforeDeadline() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        facility.draw(200e6);

        vm.prank(lender);
        vm.expectRevert(CreditFacility.CreditFacilityRepaymentNotDue.selector);
        facility.declareDefault();
    }

    function test_WithdrawRevertsWhenDrawnOutstanding() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        facility.draw(200e6);

        vm.prank(lender);
        vm.expectRevert(CreditFacility.CreditFacilityDrawnOutstanding.selector);
        facility.withdraw(300e6);
    }

    function test_Unfreeze() public {
        vm.prank(lender);
        facility.freeze();
        assertTrue(facility.frozen());
        vm.prank(lender);
        facility.unfreeze();
        assertFalse(facility.frozen());
    }

    function test_DrawRevertsAfterDefault() public {
        vm.startPrank(lender);
        token.approve(address(facility), 500e6);
        facility.deposit(500e6);
        vm.stopPrank();

        vm.prank(borrower);
        facility.draw(200e6);

        vm.warp(block.timestamp + 31 days);
        vm.prank(lender);
        facility.declareDefault();

        vm.prank(borrower);
        vm.expectRevert(CreditFacility.CreditFacilityDefaulted.selector);
        facility.draw(100e6);
    }
}
