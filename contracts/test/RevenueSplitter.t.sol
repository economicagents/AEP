// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {RevenueSplitter} from "../src/relationships/RevenueSplitter.sol";
import {MockERC20Full} from "./MockERC20Full.sol";

contract RevenueSplitterTest is Test {
    RevenueSplitter public splitter;
    MockERC20Full public token;

    address public alice;
    address public bob;
    address public carol;

    function setUp() public {
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        carol = makeAddr("carol");

        token = new MockERC20Full();
        token.mint(address(this), 1000e6);

        address[] memory recipients = new address[](3);
        recipients[0] = alice;
        recipients[1] = bob;
        recipients[2] = carol;

        uint256[] memory weights = new uint256[](3);
        weights[0] = 5000; // 50%
        weights[1] = 3000; // 30%
        weights[2] = 2000; // 20%

        splitter = new RevenueSplitter(recipients, weights, address(token));
    }

    function test_Distribute() public {
        require(token.transfer(address(splitter), 100e6), "transfer failed");
        splitter.distribute();

        assertEq(token.balanceOf(alice), 50e6);
        assertEq(token.balanceOf(bob), 30e6);
        assertEq(token.balanceOf(carol), 20e6);
        assertEq(token.balanceOf(address(splitter)), 0);
    }

    function test_DistributeEmptyBalance() public {
        splitter.distribute();
        assertEq(token.balanceOf(alice), 0);
    }

    function test_ConstructorRevertsInvalidWeights() public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = bob;

        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 4000; // sum != 10000

        vm.expectRevert(RevenueSplitter.RevenueSplitterInvalidWeights.selector);
        new RevenueSplitter(recipients, weights, address(token));
    }

    function test_ConstructorRevertsZeroRecipient() public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = address(0);

        uint256[] memory weights = new uint256[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        vm.expectRevert(RevenueSplitter.RevenueSplitterZeroAddress.selector);
        new RevenueSplitter(recipients, weights, address(token));
    }

    function test_ConstructorRevertsMismatchedLengths() public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = bob;

        uint256[] memory weights = new uint256[](1);
        weights[0] = 10000;

        vm.expectRevert(RevenueSplitter.RevenueSplitterInvalidWeights.selector);
        new RevenueSplitter(recipients, weights, address(token));
    }
}
