import { ethers } from "ethers";
import { TORNADO_CASH_ETH_ABI, TORNADO_RELAYER_REGISTRY } from "./abis.js"
import { WATCHING_ADDRESS, TORNADO_RELAYER_REGISTRY_ADDRESS, TORNADO_CASH_0_1BNB_ADDRESS, TORNADO_CASH_10BNB_ADDRESS, TORNADO_CASH_1BNB_ADDRESS, TORNADO_CASH_100BNB_ADDRESS, TORNADO_CASH_100MATIC_ADDRESS, TORNADO_CASH_1000MATIC_ADDRESS, TORNADO_CASH_10000MATIC_ADDRESS, TORNADO_CASH_100000MATIC_ADDRESS } from "./constants.js";
import noti from "./noti.js";
import fs from "fs";

const LOG_FILE = "tornado_log_polygon.csv";

function ensureLogFile() {
    if (!fs.existsSync(LOG_FILE)) {
        fs.writeFileSync(LOG_FILE, "time,tx,relayer,pool,service_fee,gas_fee,burned_torn,remaining_torn,estimate_earning\n");
    }
}
ensureLogFile();

const ethProvider = new ethers.providers.InfuraProvider(1, "a48b096d52314a0b901370f43bca5cbd");
const polygonProvider = new ethers.providers.InfuraProvider(137, "a48b096d52314a0b901370f43bca5cbd");

const registry = new ethers.Contract(TORNADO_RELAYER_REGISTRY_ADDRESS, TORNADO_RELAYER_REGISTRY, ethProvider);

const maticValues = ["100", "1000", "1万", "10万"];
const addrs = [
    TORNADO_CASH_100MATIC_ADDRESS,
    TORNADO_CASH_1000MATIC_ADDRESS,
    TORNADO_CASH_10000MATIC_ADDRESS,
    TORNADO_CASH_100000MATIC_ADDRESS,
];

for (let i = 0; i < maticValues.length; i++) {
    const pool = new ethers.Contract(addrs[i], TORNADO_CASH_ETH_ABI, polygonProvider)
    pool.on(pool.filters.Withdrawal(), async (to, nullifierHash, relayer, fee, event) => {

        if (fee.isZero()) {
            console.log("custom withdraw!");
            return
        }

        const formatedFee = ethers.utils.formatEther(fee);
        const tx = await event.getTransactionReceipt();
        console.log(tx);

        const gasFee = tx.effectiveGasPrice.mul(tx.gasUsed);
        const formatedGas = ethers.utils.formatEther(gasFee);

        var burnTorn = "0"

        let profit = fee.sub(gasFee);

        const formatedProfit = ethers.utils.formatEther(profit);
        const timeStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

        const remainingTorn = await registry.getRelayerBalance(relayer);
        let formatRemaining = ethers.utils.formatEther(remainingTorn);
        formatRemaining = parseFloat(formatRemaining).toFixed(2);

        ensureLogFile();
        fs.appendFileSync(LOG_FILE, `${timeStr},${tx.transactionHash},${relayer},${maticValues[i]},${formatedFee},${formatedGas},${burnTorn},${formatRemaining},${formatedProfit}\n`);

        if (relayer == WATCHING_ADDRESS) {
            const title = `# MATIC: ${maticValues[i]}\n`;
            const txInfo = `tx: [${tx.transactionHash}](https://polygonscan.com/tx/${tx.transactionHash})`;
            const info = `ServiceFee: ${formatedFee}\nGasFee: ${formatedGas}\nBurnedTORN: ${burnTorn}\nRemainingTORN: ${formatRemaining}\nEstimateEarn:${formatedProfit}\n`;
            noti.markdown(`${title} ${txInfo} ${info}`);
        }

    })
}