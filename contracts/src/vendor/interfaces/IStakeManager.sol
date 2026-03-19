// SPDX-License-Identifier: GPL-3.0-only
pragma solidity >=0.7.5;

/**
 * Manage deposits and stakes.
 * Deposit is just a balance used to pay for UserOperations (either by a paymaster or an account).
 * Stake is value locked for at least "unstakeDelay" by the staked entity.
 */
interface IStakeManager {
    event Deposited(address indexed account, uint256 totalDeposit);

    event Withdrawn(address indexed account, address withdrawAddress, uint256 amount);

    event StakeLocked(address indexed account, uint256 totalStaked, uint256 unstakeDelaySec);

    event StakeUnlocked(address indexed account, uint256 withdrawTime);

    event StakeWithdrawn(address indexed account, address withdrawAddress, uint256 amount);

    struct DepositInfo {
        uint256 deposit;
        bool staked;
        uint112 stake;
        uint32 unstakeDelaySec;
        uint48 withdrawTime;
    }

    struct StakeInfo {
        uint256 stake;
        uint256 unstakeDelaySec;
    }

    function getDepositInfo(address account) external view returns (DepositInfo memory info);

    function balanceOf(address account) external view returns (uint256);

    function depositTo(address account) external payable;

    function addStake(uint32 _unstakeDelaySec) external payable;

    function unlockStake() external;

    function withdrawStake(address payable withdrawAddress) external;

    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
}
