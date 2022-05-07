import { ethers } from "ethers";
import { TORNADO_CASH_ETH_ABI, TORNADO_RELAYER_REGISTRY } from "./abis.js"
import { WATCHING_ADDRESS, TORNADO_RELAYER_REGISTRY_ADDRESS, TORNADO_CASH_0_1BNB_ADDRESS, TORNADO_CASH_10BNB_ADDRESS, TORNADO_CASH_1BNB_ADDRESS, TORNADO_CASH_100BNB_ADDRESS } from "./constants.js";
import noti from "./noti.js";
import fs from "fs";

const LOG_FILE = "tornado_log_bsc.csv";

function ensureLogFile() {
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, "time,tx,relayer,pool,service_fee,gas_fee,burned_torn,remaining_torn,estimate_earning\n");
    }
}
ensureLogFile();

const ethProvider = new ethers.providers.InfuraProvider(1, "a48b096d52314a0b901370f43bca5cbd");
const bscProvider = new ethers.providers.JsonRpcProvider("https://bsc-dataseed.binance.org/")

const registry = new ethers.Contract(TORNADO_RELAYER_REGISTRY_ADDRESS, TORNADO_RELAYER_REGISTRY, ethProvider);

const bnbValues = [0.1, 1, 10, 100];
const addrs = [
    TORNADO_CASH_0_1BNB_ADDRESS,
    TORNADO_CASH_1BNB_ADDRESS,
    TORNADO_CASH_10BNB_ADDRESS,
    TORNADO_CASH_100BNB_ADDRESS,
];

for (let i = 0; i < bnbValues.length; i++) {
    const pool = new ethers.Contract(addrs[i], TORNADO_CASH_ETH_ABI, bscProvider)
    pool.on(pool.filters.Withdrawal(), async (to, nullifierHash, relayer, fee, event) => {

        if (fee.isZero()) {
            console.log("custom withdraw!");
            return
        }

        const formatedFee = ethers.utils.formatEther(fee);
        const tx = await event.getTransactionReceipt();
        console.log(tx);

        const gasFee = tx.gasUsed.mul("5000000000");
        const formatedGas = ethers.utils.formatEther(gasFee);
        // var burnEvent = null;
        // for (const log of tx.logs) {
        //     if (log.address == TORNADO_RELAYER_REGISTRY_ADDRESS) {
        //         burnEvent = registryIface.parseLog(log);
        //         break;
        //     }
        // }

        var burnTorn = "0"
        // if (burnEvent != null && burnEvent.name == "StakeBurned") {
        //     burnTorn = ethers.utils.formatEther(burnEvent.args.amountBurned);
        // }

        let profit = fee.sub(gasFee);
        // if (i > 0) {
        //     const burnFee = ethers.utils.parseEther(bnbValues[i].toString()).mul("3").div("1000");
        //     profit = profit.sub(burnFee);
        // }
        const formatedProfit = ethers.utils.formatEther(profit);
        const timeStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

        const remainingTorn = await registry.getRelayerBalance(relayer);
        let formatRemaining = ethers.utils.formatEther(remainingTorn);
        formatRemaining = parseFloat(formatRemaining).toFixed(2);

        ensureLogFile();
        fs.appendFileSync(LOG_FILE, `${timeStr},${tx.transactionHash},${relayer},${bnbValues[i]},${formatedFee},${formatedGas},${burnTorn},${formatRemaining},${formatedProfit}\n`);

        if (relayer == WATCHING_ADDRESS) {
            const title = `# BNB: ${bnbValues[i]}\n`;
            const txInfo = `tx: [${tx.transactionHash}](https://bscscan.com/tx/${tx.transactionHash})`;
            const info = `ServiceFee: ${formatedFee}\nGasFee: ${formatedGas}\nBurnedTORN: ${burnTorn}\nRemainingTORN: ${formatRemaining}\nEstimateEarn:${formatedProfit}\n`;
            noti.markdown(`${title} ${txInfo} ${info}`);
        }

    })
}