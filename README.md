# About

Showcase for how to do proper tx cost estimation (including both L2 and L1 cost) on [op-stack](https://docs.optimism.io/stack/getting-started) based L2s (currently hardcoded to use Optimism).

In the first months after [EIP-4337](https://eips.ethereum.org/EIPS/eip-4844) was activated, the L1 cost was so low that it could be ignored. But eventually the (inelastic) blob supply got fully utilized more and more frequently, with the well known supply/demand market dynamics playing out.

On https://blobscan.com/blocks, the blob gas price can be monitored.
This price is governed by a mechanism similar to [EIP-1559](https://eips.ethereum.org/EIPS/eip-1559), the price reacts to high or low demand quite quickly.

Note: etherscan-based explorers like https://optimistic.etherscan.io/ still show _L1 Gas Price_ in the details section of the transaction view ([example](https://optimistic.etherscan.io/tx/0xb6b078d072584414980af34c3c30dc810263dd978cb9460d1ecbe810899b2ade)). This price is **not** relevant for the transaction cost. It's likely a remnant from pre-EIP-4844 days when it was relevant.

Now only the _L1 blob gas price_ is relevant. The way it is applied to individual L2 transactions is far from trivial, there's no simple function like _gas amount x gas price_ or _calldata size x gas price_. But as a rule of thumb, it's _compressed calldata size x blob gas price_.

In order to have a pretty accurate estimation, the op-stack specific functionality provided by viem can be used, as shown in this application.

# Run

Install dependencies with `npm ci`.
Then prepare a file `.env` - see .env.example.
You will need the private key for an account holding an ERC20 token.
Then run with `npm run dev`.

This will run the estimations.
If you also want to do an actual transfer transaction and compare the actual costs with the esimates, set `SEND_TX=true`.

Example run:
```
$ SEND_TX=true npm run dev

> l2-gastimation@1.0.0 dev
> tsx src/app.ts

CONFIG
  Derived Wallet Address: 0x4ee5D45eB79aEa04C02961a2e543bbAf5cec81B3
  Token Contract Address: 0xbD80CFA9d93A87D1bb895f810ea348E496611cD4
  Token Decimals: 18
  Token Symbol: FRACTION
  Wallet Token Balance: 0.000000000000143284
ESTIMATION
  Estimated Gas Use: 192390 gas units
  Current L2 Gas Price: 0.00100083 gwei
  Estimated L2 Execution Fee: 0.0001925496837 mETH
  Estimated L1 Data Fee: 0.002572891340925 mETH
  Estimated Total Fee: 0.002765441024625 mETH
  Estimated Percent Data Fee: 93.04%
REALITY
  Transaction sent with hash: 0xf703360e57401cd35c032a5b3ca964243f49089c08356ff0771618b8af0b9925, waiting for receipt...
  Actual L2 Execution Fee: 0.000189995996853 mETH
  Actual L2 Gas Price: 0.001000827 gwei
  Actual L1 Data Fee: 0.002782013295879 mETH
  Actual L1 Blob Gas Price: 27.234271276 gwei
  Actual Total Fee: 0.002972009292732 mETH (0.010402032524562 USD)
  Actual Percent Data Fee: 93.61%
Difference in percent between actual and estimated: 7.47%
```