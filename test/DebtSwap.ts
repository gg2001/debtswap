import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import { ChainId, Token, WETH, Fetcher, Trade, Route, TokenAmount, TradeType, Percent, Pair, JSBI } from "@uniswap/sdk";

import { DebtSwap, IERC20, IUniswapV2Factory, IUniswapV2Pair, DebtSwap__factory, ERC20 } from "../typechain";
import {
  lendingPoolProviderAddress,
  lendingPool,
  uniswapFactoryAddress,
  uniswapV2Router02Address,
} from "../scripts/constants/addresses";

describe("DebtSwap", () => {
  const impersonateAccount: string = "0xD465bE4e63bD09392bAC51Fcf04AA13412B552D0";
  const daiAddress: string = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const usdcAddress: string = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const daiToken: Token = new Token(ChainId.MAINNET, daiAddress, 18);
  const usdcToken: Token = new Token(ChainId.MAINNET, usdcAddress, 6);
  const path: [Token, Token][] = [[usdcToken, daiToken]];
  const slippageTolerance: Percent = new Percent("100", "10000");

  let accounts: Signer[];
  let debtSwap: DebtSwap;
  let uniswapV2Factory: IUniswapV2Factory;
  let dai: IERC20;
  let usdc: IERC20;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
  });

  it("constructor should initialize state variables", async () => {
    const routePath: Pair[] = await Promise.all(
      path.map(pair => Fetcher.fetchPairData(pair[0], pair[1], ethers.provider)),
    );
    const route: Route = new Route(routePath, usdcToken);
    const amountOut: string = "100000000000000000000";
    const trade: Trade = new Trade(route, new TokenAmount(daiToken, amountOut), TradeType.EXACT_OUTPUT);
    const amountInMax: JSBI = trade.maximumAmountIn(slippageTolerance).raw;
    console.log(amountInMax.toString());
  });
});
