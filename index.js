import { ethers } from "ethers";
import { TORNADO_CASH_ETH_ABI, TORNADO_RELAYER_REGISTRY } from "./abis.js"
import { WATCHING_ADDRESS, TORNADO_CASH_0_1ETH_ADDRESS, TORNADO_CASH_100ETH_ADDRESS, TORNADO_CASH_10ETH_ADDRESS, TORNADO_CASH_1ETH_ADDRESS, TORNADO_RELAYER_REGISTRY_ADDRESS } from "./constants.js";
import noti from "./noti.js"

const provider = new ethers.getDefaultProvider();

let registryIface = new ethers.utils.Interface(TORNADO_RELAYER_REGISTRY);

const eths = [0.1, 1, 10, 100];
const addrs = [TORNADO_CASH_0_1ETH_ADDRESS, TORNADO_CASH_1ETH_ADDRESS, TORNADO_CASH_10ETH_ADDRESS, TORNADO_CASH_100ETH_ADDRESS];
for (let i=0; i<eths.length; i++) {
    const ethPool = new ethers.Contract(addrs[i], TORNADO_CASH_ETH_ABI, provider)
    ethPool.on(ethPool.filters.Withdrawal(), async (to, nullifierHash, relayer, fee, event) => {
        console.log(event);
        const formatedFee = ethers.utils.formatEther(fee);
        const tx = await event.getTransactionReceipt();
        var burnEvent = null;
        for (const log of tx.logs) {
            if (log.address == TORNADO_RELAYER_REGISTRY_ADDRESS) {
                burnEvent = registryIface.parseLog(log)
                break
            }
        }
        console.log(burnEvent);

        var burnTorn = "0"
        if (burnEvent != null && burnEvent.name == "StakeBurned") {
            burnTorn = ethers.utils.formatEther(burnEvent.args.amountBurned)
        }

        const title = `# ETH: ${eths[i]}\n`
        const info = `to: ${to} \nrelayer: ${relayer}\nfee: ${formatedFee}\nburned TORN: ${burnTorn}`
        
        noti.markdown(`${title} ${info}`);

    })
}