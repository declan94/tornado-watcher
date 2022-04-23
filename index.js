import { ethers } from "ethers";
import { TORNADO_CASH_ETH_ABI, TORNADO_RELAYER_REGISTRY } from "./abis.js"
import { WATCHING_ADDRESS, TORNADO_CASH_0_1ETH_ADDRESS, TORNADO_CASH_100ETH_ADDRESS, TORNADO_CASH_10ETH_ADDRESS, TORNADO_CASH_1ETH_ADDRESS, TORNADO_RELAYER_REGISTRY_ADDRESS } from "./constants.js";
import noti from "./noti.js";
import fs from "fs";

const LOG_FILE = "tornado_log_eth.csv";

if (!fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, "time,tx,relayer,pool,service_fee,gas_fee,burned_torn,estimate_earning\n");
}

const provider = new ethers.getDefaultProvider();

let registryIface = new ethers.utils.Interface(TORNADO_RELAYER_REGISTRY);

const eths = [0.1, 1, 10, 100];
const addrs = [
    TORNADO_CASH_0_1ETH_ADDRESS, 
    TORNADO_CASH_1ETH_ADDRESS, 
    TORNADO_CASH_10ETH_ADDRESS, 
    TORNADO_CASH_100ETH_ADDRESS
];

for (let i = 0; i < eths.length; i++) {
    const ethPool = new ethers.Contract(addrs[i], TORNADO_CASH_ETH_ABI, provider)
    ethPool.on(ethPool.filters.Withdrawal(), async (to, nullifierHash, relayer, fee, event) => {
        const formatedFee = ethers.utils.formatEther(fee);
        const tx = await event.getTransactionReceipt();
        console.log(tx);

        const gasFee = tx.effectiveGasPrice.mul(tx.gasUsed);
        const formatedGas = ethers.utils.formatEther(gasFee);
        var burnEvent = null;
        for (const log of tx.logs) {
            if (log.address == TORNADO_RELAYER_REGISTRY_ADDRESS) {
                burnEvent = registryIface.parseLog(log);
                break;
            }
        }

        var burnTorn = "0"
        if (burnEvent != null && burnEvent.name == "StakeBurned") {
            burnTorn = ethers.utils.formatEther(burnEvent.args.amountBurned);
        }
        
        var profit = fee.sub(gasFee);
        if (i > 0) {
            const burnFee = ethers.utils.parseEther(eths[i].toString()).mul("3").div("1000");
            profit = profit.sub(burnFee);
        }
        const formatedProfit = ethers.utils.formatEther(profit);
        const timeStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        fs.appendFileSync(LOG_FILE, `${timeStr},${tx.transactionHash},${relayer},${eths[i]},${formatedFee},${formatedGas},${burnTorn},${formatedProfit}\n`);

        if (relayer == WATCHING_ADDRESS) {
            const title = `# ETH: ${eths[i]}\n`;
            const txInfo = `tx: [${tx.transactionHash}](https://etherscan.io/tx/${tx.transactionHash})`;
            const info = `ServiceFee: ${formatedFee}\nGasFee: ${formatedGas}\nBurnedTORN: ${burnTorn}\nEstimateEarn:${formatedProfit}\n`;
            noti.markdown(`${title} ${txInfo} ${info}`);
        }

    })
}