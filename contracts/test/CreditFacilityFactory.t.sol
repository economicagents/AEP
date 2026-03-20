// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {CreditFacilityFactory} from "../src/relationships/CreditFacilityFactory.sol";
import {CreditFacility} from "../src/relationships/CreditFacility.sol";
import {MockERC20Full} from "./MockERC20Full.sol";
import {MockERC8004Identity, MockERC8004Reputation} from "./MockERC8004.sol";

contract CreditFacilityFactoryTest is Test {
    CreditFacilityFactory public factory;
    MockERC20Full public token;
    MockERC8004Identity public identityRegistry;
    MockERC8004Reputation public reputationRegistry;

    address public treasury;
    address public lender;
    address public borrower;
    uint256 constant BORROWER_AGENT_ID = 1;
    uint256 constant LIMIT = 1000e6;
    uint256 constant MIN_REPUTATION = 80;

    function setUp() public {
        treasury = makeAddr("treasury");
        lender = makeAddr("lender");
        borrower = makeAddr("borrower");
        token = new MockERC20Full();
        token.mint(lender, 2000e6);
        identityRegistry = new MockERC8004Identity();
        reputationRegistry = new MockERC8004Reputation();
        identityRegistry.setAgentWallet(BORROWER_AGENT_ID, borrower);
        reputationRegistry.setReputation(BORROWER_AGENT_ID, lender, 85, 0);
    }

    function test_CreateFacility_NoFee() public {
        factory = new CreditFacilityFactory(treasury);
        vm.prank(lender);
        address facility = factory.createFacility(
            lender,
            borrower,
            address(token),
            LIMIT,
            MIN_REPUTATION,
            30 days,
            address(reputationRegistry),
            address(identityRegistry),
            BORROWER_AGENT_ID,
            0
        );
        assertTrue(facility != address(0));
        assertEq(CreditFacility(facility).lender(), lender);
        assertEq(CreditFacility(facility).borrower(), borrower);
        assertEq(token.balanceOf(treasury), 0);
    }

    function test_CreateFacility_WithOriginationFee() public {
        factory = new CreditFacilityFactory(treasury);
        uint256 fee = 5e6; // $5
        vm.startPrank(lender);
        token.approve(address(factory), fee);
        address facility = factory.createFacility(
            lender,
            borrower,
            address(token),
            LIMIT,
            MIN_REPUTATION,
            30 days,
            address(reputationRegistry),
            address(identityRegistry),
            BORROWER_AGENT_ID,
            fee
        );
        vm.stopPrank();
        assertTrue(facility != address(0));
        assertEq(token.balanceOf(treasury), fee);
        assertEq(token.balanceOf(lender), 2000e6 - fee);
    }

    function test_CreateFacility_FeeRequiresTreasury() public {
        factory = new CreditFacilityFactory(address(0));
        vm.prank(lender);
        vm.expectRevert(CreditFacilityFactory.CreditFacilityFactoryFeeRequiresTreasury.selector);
        factory.createFacility(
            lender,
            borrower,
            address(token),
            LIMIT,
            MIN_REPUTATION,
            30 days,
            address(reputationRegistry),
            address(identityRegistry),
            BORROWER_AGENT_ID,
            5e6
        );
    }

    function test_CreateFacility_FeeRequiresLenderAsCaller() public {
        factory = new CreditFacilityFactory(treasury);
        uint256 fee = 5e6;
        vm.startPrank(lender);
        token.approve(address(factory), fee);
        vm.stopPrank();
        vm.prank(borrower);
        vm.expectRevert(CreditFacilityFactory.CreditFacilityFactoryLenderMustCreate.selector);
        factory.createFacility(
            lender,
            borrower,
            address(token),
            LIMIT,
            MIN_REPUTATION,
            30 days,
            address(reputationRegistry),
            address(identityRegistry),
            BORROWER_AGENT_ID,
            fee
        );
    }

    function test_CreateFacility_FeeRevertsWithoutApproval() public {
        factory = new CreditFacilityFactory(treasury);
        vm.prank(lender);
        vm.expectRevert();
        factory.createFacility(
            lender,
            borrower,
            address(token),
            LIMIT,
            MIN_REPUTATION,
            30 days,
            address(reputationRegistry),
            address(identityRegistry),
            BORROWER_AGENT_ID,
            5e6
        );
    }

    function test_CreateFacility_ZeroAddressReverts() public {
        factory = new CreditFacilityFactory(treasury);
        vm.prank(lender);
        vm.expectRevert(CreditFacilityFactory.CreditFacilityFactoryZeroAddress.selector);
        factory.createFacility(
            address(0),
            borrower,
            address(token),
            LIMIT,
            MIN_REPUTATION,
            30 days,
            address(reputationRegistry),
            address(identityRegistry),
            BORROWER_AGENT_ID,
            0
        );
    }
}
