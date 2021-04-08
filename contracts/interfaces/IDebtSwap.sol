// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.7.6;

interface IDebtSwap {
    /// @dev Swaps debt, must approveDelegation maxAmountIn of assets[0] before calling
    /// @param assets Must be length 1, [<the asset you are swapping to>]
    /// @param path Uniswap router path, path[0] == assets[0],
    ///             path[path.length - 1] == asset you are swapping from
    /// @param modes Mode of new debt, must be 1 (stable) or 2 (variable)
    /// @param repayAmount Amount of asset you are swapping from
    /// @param maxAmountIn Maximum amount you want to swap to
    /// @param repayMode Mode of debt you are swapping from, must be 1 (stable) or 2 (variable)
    /// @param debtTokenAddress Debt token address of asset you are swapping from
    ///                         (optional, should be passed when repayAmount = type(uint256).max)
    /// @param uniswapFactory address of Uniswap/Sushiswap factory
    function swapDebt(
        address[] calldata assets,
        address[] calldata path,
        uint256[] calldata modes,
        uint256 repayAmount,
        uint256 maxAmountIn,
        uint256 repayMode,
        address debtTokenAddress,
        address uniswapFactory
    ) external;
}
