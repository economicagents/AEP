// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC8004Validation} from "../interfaces/IERC8004Validation.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SLAContract
 * @notice Staking-backed SLA. Provider stakes; consumer claims on breach (validation response below threshold).
 *         Uses balance-delta accounting for fee-on-transfer tokens. Unstake requires a 7-day delay after request;
 *         stake remains slashable during the delay.
 */
contract SLAContract is ReentrancyGuard {
    using SafeERC20 for IERC20;
    error SLAContractNotProvider();
    error SLAContractNotConsumer();
    error SLAContractNotStaked();
    error SLAContractAlreadyStaked();
    error SLAContractAlreadyBreached();
    error SLAContractValidationFailed();
    error SLAContractBreachThresholdNotMet();
    error SLAContractAgentMismatch();
    error SLAContractZeroAddress();
    error SLAContractZeroStakeAmount();
    error SLAContractUnstakeNotRequested();
    error SLAContractUnstakeDelayNotElapsed();

    event Staked(address indexed provider, uint256 amount);
    event BreachDeclared(address indexed consumer, bytes32 indexed requestHash, uint256 amount);
    event UnstakeRequested(address indexed provider, uint256 requestedAt);
    event Unstaked(address indexed provider, uint256 amount);

    address public immutable provider;
    address public immutable consumer;
    uint256 public immutable providerAgentId;
    IERC20 public immutable stakeToken;
    uint256 public immutable stakeAmount;
    IERC8004Validation public immutable validationRegistry;
    uint8 public immutable breachThreshold; // if validation response < this, breach

    uint256 public constant UNSTAKE_DELAY = 7 days;

    bool public staked;
    bool public breached;
    uint256 public stakedBalance;
    uint256 public unstakeRequestedAt;

    constructor(
        address _provider,
        address _consumer,
        uint256 _providerAgentId,
        address _stakeToken,
        uint256 _stakeAmount,
        address _validationRegistry,
        uint8 _breachThreshold
    ) {
        if (
            _provider == address(0) || _consumer == address(0) || _stakeToken == address(0)
                || _validationRegistry == address(0)
        ) {
            revert SLAContractZeroAddress();
        }
        if (_stakeAmount == 0) revert SLAContractZeroStakeAmount();
        provider = _provider;
        consumer = _consumer;
        providerAgentId = _providerAgentId;
        stakeToken = IERC20(_stakeToken);
        stakeAmount = _stakeAmount;
        validationRegistry = IERC8004Validation(_validationRegistry);
        breachThreshold = _breachThreshold;
    }

    modifier onlyProvider() {
        if (msg.sender != provider) revert SLAContractNotProvider();
        _;
    }

    modifier onlyConsumer() {
        if (msg.sender != consumer) revert SLAContractNotConsumer();
        _;
    }

    function stake() external onlyProvider nonReentrant {
        if (staked) revert SLAContractAlreadyStaked();
        uint256 balanceBefore = stakeToken.balanceOf(address(this));
        stakeToken.safeTransferFrom(provider, address(this), stakeAmount);
        uint256 received = stakeToken.balanceOf(address(this)) - balanceBefore;
        if (received == 0) revert SLAContractZeroStakeAmount();
        staked = true;
        stakedBalance = received;
        emit Staked(provider, received);
    }

    function declareBreach(bytes32 requestHash) external onlyConsumer nonReentrant {
        if (breached) revert SLAContractAlreadyBreached();
        if (!staked) revert SLAContractNotStaked();

        (address validator, uint256 agentId, uint8 response,,,) = validationRegistry.getValidationStatus(requestHash);
        if (validator == address(0)) revert SLAContractValidationFailed();
        if (agentId != providerAgentId) revert SLAContractAgentMismatch();
        if (response >= breachThreshold) revert SLAContractBreachThresholdNotMet();

        breached = true;
        staked = false;
        uint256 amount = stakedBalance;
        stakedBalance = 0;
        unstakeRequestedAt = 0;
        stakeToken.safeTransfer(consumer, amount);
        emit BreachDeclared(consumer, requestHash, amount);
    }

    function requestUnstake() external onlyProvider {
        if (!staked) revert SLAContractNotStaked();
        if (breached) revert SLAContractNotStaked();
        unstakeRequestedAt = block.timestamp;
        emit UnstakeRequested(provider, unstakeRequestedAt);
    }

    function unstake() external onlyProvider nonReentrant {
        if (!staked) revert SLAContractNotStaked();
        if (breached) revert SLAContractNotStaked();
        if (unstakeRequestedAt == 0) revert SLAContractUnstakeNotRequested();
        if (block.timestamp < unstakeRequestedAt + UNSTAKE_DELAY) revert SLAContractUnstakeDelayNotElapsed();
        uint256 amount = stakedBalance;
        staked = false;
        stakedBalance = 0;
        unstakeRequestedAt = 0;
        stakeToken.safeTransfer(provider, amount);
        emit Unstaked(provider, amount);
    }

    function getState()
        external
        view
        returns (bool _staked, bool _breached, uint256 _stakedBalance, uint256 _tokenBalance)
    {
        return (staked, breached, stakedBalance, stakeToken.balanceOf(address(this)));
    }
}
