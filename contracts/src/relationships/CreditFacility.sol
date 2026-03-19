// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC8004Identity} from "../interfaces/IERC8004Identity.sol";
import {IERC8004Reputation} from "../interfaces/IERC8004Reputation.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title CreditFacility
 * @notice On-chain credit line between two AEP accounts. Lender deposits USDC; borrower draws against limit.
 *         Reputation check via ERC-8004 before each draw. Default triggers lender to submit negative feedback.
 *         Uses SafeERC20 for compatibility with non-standard ERC-20 (e.g. USDT) and fee-on-transfer tokens.
 */
contract CreditFacility is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error CreditFacilityNotLender();
    error CreditFacilityNotBorrower();
    error CreditFacilityFrozen();
    error CreditFacilityDefaulted();
    error CreditFacilityExceedsLimit();
    error CreditFacilityReputationTooLow();
    error CreditFacilityBorrowerMismatch();
    error CreditFacilityZeroAmount();
    error CreditFacilityRepaymentNotDue();
    error CreditFacilityDrawnOutstanding();
    error CreditFacilityZeroAddress();
    error CreditFacilityMinReputationOverflow();

    event Deposited(address indexed lender, uint256 amount);
    event Drawn(address indexed borrower, uint256 amount);
    event Repaid(address indexed borrower, uint256 amount);
    event Frozen(bool frozen);
    event DefaultDeclared(address indexed borrower);
    event Withdrawn(address indexed lender, uint256 amount);

    address public immutable lender;
    address public immutable borrower;
    IERC20 public immutable token;
    IERC8004Identity public immutable identityRegistry;
    IERC8004Reputation public immutable reputationRegistry;

    uint256 public immutable limit;
    uint256 public drawn;
    uint256 public immutable minReputation; // 0-100 scale
    uint256 public immutable repaymentInterval; // seconds; 0 = use DEFAULT_REPAYMENT_DAYS
    uint256 public repaymentDeadline; // set on first draw
    uint256 public immutable borrowerAgentId;

    bool public frozen;
    bool public defaulted;

    uint256 constant DEFAULT_REPAYMENT_DAYS = 30;
    uint256 constant SECONDS_PER_DAY = 86400;

    constructor(
        address _lender,
        address _borrower,
        address _token,
        uint256 _limit,
        uint256 _minReputation,
        uint256 _repaymentInterval,
        address _reputationRegistry,
        address _identityRegistry,
        uint256 _borrowerAgentId
    ) {
        if (_lender == address(0) || _borrower == address(0) || _token == address(0)) {
            revert CreditFacilityZeroAddress();
        }
        if (_minReputation > uint256(type(int256).max)) revert CreditFacilityMinReputationOverflow();
        lender = _lender;
        borrower = _borrower;
        token = IERC20(_token);
        limit = _limit;
        minReputation = _minReputation;
        repaymentInterval = _repaymentInterval;
        reputationRegistry = IERC8004Reputation(_reputationRegistry);
        identityRegistry = IERC8004Identity(_identityRegistry);
        borrowerAgentId = _borrowerAgentId;
    }

    modifier onlyLender() {
        if (msg.sender != lender) revert CreditFacilityNotLender();
        _;
    }

    modifier onlyBorrower() {
        if (msg.sender != borrower) revert CreditFacilityNotBorrower();
        _;
    }

    function deposit(uint256 amount) external onlyLender nonReentrant {
        if (amount == 0) revert CreditFacilityZeroAmount();
        token.safeTransferFrom(lender, address(this), amount);
        emit Deposited(lender, amount);
    }

    function draw(uint256 amount) external onlyBorrower nonReentrant {
        if (amount == 0) revert CreditFacilityZeroAmount();
        if (frozen) revert CreditFacilityFrozen();
        if (defaulted) revert CreditFacilityDefaulted();
        if (amount > limit - drawn) revert CreditFacilityExceedsLimit();
        uint256 balance = token.balanceOf(address(this));
        if (amount > balance) revert CreditFacilityExceedsLimit();

        if (address(identityRegistry) != address(0)) {
            if (identityRegistry.getAgentWallet(borrowerAgentId) != borrower) revert CreditFacilityBorrowerMismatch();
        }
        if (minReputation > 0 && address(reputationRegistry) != address(0)) {
            address[] memory clients = reputationRegistry.getClients(borrowerAgentId);
            if (clients.length == 0) revert CreditFacilityReputationTooLow();
            (, int128 summaryValue, uint8 summaryValueDecimals) =
                reputationRegistry.getSummary(borrowerAgentId, clients, "", "");
            int256 summaryScaled;
            if (summaryValueDecimals < 18) {
                summaryScaled = int256(summaryValue) * int256(10 ** uint256(18 - summaryValueDecimals));
            } else if (summaryValueDecimals > 18) {
                summaryScaled = (int256(summaryValue) * 1e18) / int256(10 ** uint256(summaryValueDecimals));
            } else {
                summaryScaled = int256(summaryValue);
            }
            // minReputation is 0-100 scale (no decimals); constructor enforces <= type(int256).max
            // forge-lint: disable-next-line(unsafe-typecast)
            int256 minScaled = int256(minReputation) * 1e18;
            if (summaryScaled < minScaled) revert CreditFacilityReputationTooLow();
        }

        drawn += amount;
        if (repaymentDeadline == 0) {
            uint256 interval = repaymentInterval > 0 ? repaymentInterval : DEFAULT_REPAYMENT_DAYS * SECONDS_PER_DAY;
            repaymentDeadline = block.timestamp + interval;
        }
        token.safeTransfer(borrower, amount);
        emit Drawn(borrower, amount);
    }

    function repay(uint256 amount) external onlyBorrower nonReentrant {
        if (amount == 0) revert CreditFacilityZeroAmount();
        if (amount > drawn) revert CreditFacilityExceedsLimit();
        drawn -= amount;
        token.safeTransferFrom(borrower, address(this), amount);
        emit Repaid(borrower, amount);
    }

    function freeze() external onlyLender {
        frozen = true;
        emit Frozen(true);
    }

    function unfreeze() external onlyLender {
        frozen = false;
        emit Frozen(false);
    }

    function declareDefault() external onlyLender nonReentrant {
        if (defaulted) revert CreditFacilityDefaulted();
        if (drawn == 0) revert CreditFacilityExceedsLimit();
        if (block.timestamp <= repaymentDeadline) revert CreditFacilityRepaymentNotDue();
        defaulted = true;
        emit DefaultDeclared(borrower);
    }

    function withdraw(uint256 amount) external onlyLender nonReentrant {
        if (amount == 0) revert CreditFacilityZeroAmount();
        if (drawn > 0) revert CreditFacilityDrawnOutstanding();
        uint256 balance = token.balanceOf(address(this));
        if (amount > balance) revert CreditFacilityExceedsLimit();
        token.safeTransfer(lender, amount);
        emit Withdrawn(lender, amount);
    }

    function getState()
        external
        view
        returns (
            uint256 _limit,
            uint256 _drawn,
            uint256 _balance,
            bool _frozen,
            bool _defaulted,
            uint256 _repaymentDeadline
        )
    {
        return (limit, drawn, token.balanceOf(address(this)), frozen, defaulted, repaymentDeadline);
    }
}
