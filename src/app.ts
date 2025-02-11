import { createPublicClient, createWalletClient, http, formatUnits, encodeFunctionData, parseAbi, TransactionReceipt } from 'viem';
import { optimism } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { publicActionsL2, walletActionsL2 } from 'viem/op-stack';
import 'dotenv/config';

// default: FRACTION Token
const TOKEN_ADDRESS = (process.env.TOKEN_ADDRESS || '0xbD80CFA9d93A87D1bb895f810ea348E496611cD4') as `0x${string}`;

// Minimal ERC20 ABI for balanceOf and transfer
const abi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

// Add this type before the main function
type OptimismTransactionReceipt = TransactionReceipt & {
  l1Fee?: bigint;
  l1FeeScalar?: number;
  l1BlobBaseFee?: `0x${string}`;
};

async function main() {
  console.log('CONFIG');

  const privateKey = process.env.PRIVATE_KEY;
  
  if (!privateKey) {
    console.error('Please set PRIVATE_KEY in .env file');
    process.exit(1);
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log(`  Derived Wallet Address: ${account.address}`);

  const publicClient = createPublicClient({
      chain: optimism,
      transport: http(),
  }).extend(publicActionsL2());

  const walletClient = createWalletClient({
    chain: optimism,
    transport: http(),
    account,
  }).extend(walletActionsL2());

  try {
    console.log(`  Token Contract Address: ${TOKEN_ADDRESS}`);

    const decimals = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi,
      functionName: 'decimals',
    });
    console.log(`  Token Decimals: ${decimals}`);

    const symbol = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi,
      functionName: 'symbol',
    });
    console.log(`  Token Symbol: ${symbol}`);

    const balance = await publicClient.readContract({
      address: TOKEN_ADDRESS,
      abi,
      functionName: 'balanceOf',
      args: [account.address],
    });

    const formattedBalance = formatUnits(balance, decimals);
    console.log(`  Wallet Token Balance: ${formattedBalance}`);

    const callData = encodeFunctionData({
      abi,
      functionName: 'transfer',
      args: ['0x30B125d5Fc58c1b8E3cCB2F1C71a1Cc847f024eE', 1n],
    });

    const txObject = {
      account,
      to: TOKEN_ADDRESS as `0x${string}`,
      data: callData,
      value: 0n,
    };

    console.log('ESTIMATION');

    const gasLimit = await publicClient.estimateGas(txObject);
    console.log(`  Estimated Gas Use: ${gasLimit} gas units`);

    const l2GasPrice = await publicClient.getGasPrice();
    console.log(`  Current L2 Gas Price: ${formatUnits(l2GasPrice, 9)} gwei`);

    const l2ExecutionFee = gasLimit * l2GasPrice;
    console.log(`  Estimated L2 Execution Fee: ${formatUnits(l2ExecutionFee, 15)} mETH`);

    const l1Fee = await publicClient.estimateL1Fee(txObject);
    console.log(`  Estimated L1 Data Fee: ${formatUnits(l1Fee, 15)} mETH`);

    const totalFee = await publicClient.estimateTotalFee(txObject); 
    console.log(`  Estimated Total Fee: ${formatUnits(totalFee, 15)} mETH`);

    const percentDataFee = Number((totalFee - l2ExecutionFee) * 100n) / Number(totalFee);
    console.log(`  Estimated Percent Data Fee: ${percentDataFee.toFixed(2)}%`);

    // // Calculate L1 data fee
    // const l1DataFee = totalFee - l2ExecutionFee;
    // console.log(`Estimated L1 Data Fee: ${formatEther(l1DataFee)} ETH`);

    if (process.env.SEND_TX) {
        console.log('REALITY');
        const txHash = await walletClient.sendTransaction(txObject);
        console.log(`  Transaction sent with hash: ${txHash}, waiting for receipt...`);
      
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash }) as OptimismTransactionReceipt;
        // console.log(`Transaction receipt:`, JSON.stringify(receipt, (_, value) =>
        //   typeof value === 'bigint' ? value.toString() : value, 2));
      
        const l2CostActual = receipt.effectiveGasPrice * receipt.gasUsed;
        // log as mETH (milli-ETH) mETH is 10^-15 ETH
        console.log(`  Actual L2 Execution Fee: ${formatUnits(l2CostActual, 15)} mETH`);

        // actual L2 gas price
        console.log(`  Actual L2 Gas Price: ${formatUnits(receipt.effectiveGasPrice, 9)} gwei`);

        const l1CostActual = receipt.l1Fee;
        console.log(`  Actual L1 Data Fee: ${formatUnits(l1CostActual!, 15)} mETH`);

        // Add blob gas price logging with proper hex conversion
        if (receipt.l1BlobBaseFee) {
          const blobGasPrice = BigInt(receipt.l1BlobBaseFee);
          console.log(`  Actual L1 Blob Gas Price: ${formatUnits(blobGasPrice, 9)} gwei`);
        }

        const totalCostActual = l1CostActual! + l2CostActual;
        console.log(`  Actual Total Fee: ${formatUnits(totalCostActual, 15)} mETH (${formatUnits(totalCostActual * 3500n, 18)} USD)`);
        
        const percentDataFeeActual = Number((totalCostActual - l2CostActual) * 100n) / Number(totalCostActual);
        console.log(`  Actual Percent Data Fee: ${percentDataFeeActual.toFixed(2)}%`);
      
        const percentOffFromEstimation = Number((totalCostActual - totalFee) * 100n) / Number(totalFee);
        console.log(`Difference in percent between actual and estimated: ${percentOffFromEstimation.toFixed(2)}%`);
    } else {
        console.log('Set SEND_TX=true to send a transaction and see the actual fees');
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

main(); 