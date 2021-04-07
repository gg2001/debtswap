import { ethers, network } from "hardhat";
import { Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";
import { ChainId, Token, Fetcher, Trade, Route, TokenAmount, TradeType, Percent, Pair, JSBI } from "@uniswap/sdk";

import {
  DebtSwap,
  DebtSwap__factory,
  ERC20,
  ILendingPool,
  ILendingPoolAddressesProvider,
  IStableDebtToken,
} from "../typechain";
import {
  lendingPoolProviderAddress,
  uniswapFactoryAddress,
  uniswapV2Router02Address,
} from "../scripts/constants/addresses";

describe("DebtSwap", () => {
  const impersonateAccount: string = "0xD465bE4e63bD09392bAC51Fcf04AA13412B552D0";
  const daiAddress: string = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
  const usdcAddress: string = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const usdcVariableDebtTokenAddress: string = "0xE4922afAB0BbaDd8ab2a88E0C79d884Ad337fcA6";
  const testAmountOut: string = "1000000000000000000000";
  const slippageTolerance: Percent = new Percent("100", "10000");

  let accounts: Signer[];
  let debtSwap: DebtSwap;
  let lendingPool: ILendingPool;
  let lendingPoolAddressesProvider: ILendingPoolAddressesProvider;
  let dai: ERC20;
  let usdc: ERC20;
  let daiToken: Token;
  let usdcToken: Token;
  let path: [Token, Token][];
  let routePath: Pair[];
  let route: Route;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    const aaveFactory: DebtSwap__factory = (await ethers.getContractFactory(
      "contracts/DebtSwap.sol:DebtSwap",
      <Wallet>accounts[0],
    )) as DebtSwap__factory;
    debtSwap = await aaveFactory.deploy(lendingPoolProviderAddress, uniswapFactoryAddress, uniswapV2Router02Address);

    lendingPoolAddressesProvider = (await ethers.getContractAt(
      "contracts/interfaces/ILendingPoolAddressesProvider.sol:ILendingPoolAddressesProvider",
      lendingPoolProviderAddress,
    )) as ILendingPoolAddressesProvider;

    const lendingPoolAddress: string = await lendingPoolAddressesProvider.getLendingPool();
    lendingPool = (await ethers.getContractAt(
      "contracts/interfaces/ILendingPool.sol:ILendingPool",
      lendingPoolAddress,
    )) as ILendingPool;

    dai = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", daiAddress)) as ERC20;
    usdc = (await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", usdcAddress)) as ERC20;
    daiToken = new Token(ChainId.MAINNET, dai.address, await dai.decimals());
    usdcToken = new Token(ChainId.MAINNET, usdc.address, await usdc.decimals());
    path = [[usdcToken, daiToken]];
    routePath = await Promise.all(
      path.map((pair: [Token, Token]) => Fetcher.fetchPairData(pair[0], pair[1], ethers.provider)),
    );
    route = new Route(routePath, usdcToken);
  });

  it("should initialize state variables", async () => {
    const getAddressesProvider: string = await debtSwap.ADDRESSES_PROVIDER();
    expect(getAddressesProvider).to.equal(lendingPoolProviderAddress);
    const getLendingPool: string = await debtSwap.LENDING_POOL();
    expect(getLendingPool).to.equal(lendingPool.address);
    const getUniswapFactory: string = await debtSwap.uniswapFactory();
    expect(getUniswapFactory).to.equal(uniswapFactoryAddress);
    const getUniswapV2Router02: string = await debtSwap.uniswapV2Router02();
    expect(getUniswapV2Router02).to.equal(uniswapV2Router02Address);
  });

  it("swap debt from DAI testAmountOut to usdc", async () => {
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonateAccount],
    });
    const impersonateAccountSigner: Signer = await ethers.provider.getSigner(impersonateAccount);
    const trade: Trade = new Trade(route, new TokenAmount(daiToken, testAmountOut), TradeType.EXACT_OUTPUT);
    const amountInMax: JSBI = trade.maximumAmountIn(slippageTolerance).raw;
    const pathInput: string[] = trade.route.path.map((token: Token) => token.address);
    const debtToken = (await ethers.getContractAt(
      "contracts/interfaces/IStableDebtToken.sol:IStableDebtToken",
      usdcVariableDebtTokenAddress,
    )) as IStableDebtToken;
      console.log(amountInMax.toString());
    const debtTokenOld: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      "0x6C3c78838c761c6Ac7bE9F59fe808ea2A6E4379d",
    )) as ERC20;
    const debtTokenNew: ERC20 = (await ethers.getContractAt(
      "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
      usdcVariableDebtTokenAddress,
    )) as ERC20;
    console.log("DAI Debt", (await debtTokenOld.balanceOf(impersonateAccount)).toString());
    console.log("USDC Debt", (await debtTokenNew.balanceOf(impersonateAccount)).toString());
      console.log("Swap Debt");
    await debtToken
      .connect(impersonateAccountSigner)
      .approveDelegation(debtSwap.address, BigNumber.from(amountInMax.toString()));
    await debtSwap
      .connect(impersonateAccountSigner)
      .swapDebt(
        [usdc.address],
        pathInput,
        [1],
        testAmountOut,
        BigNumber.from(amountInMax.toString()),
        2,
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      );
      console.log("DAI Debt", (await debtTokenOld.balanceOf(impersonateAccount)).toString());
      console.log("USDC Debt", (await debtTokenNew.balanceOf(impersonateAccount)).toString());
    await network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonateAccount],
    });
  });
});
