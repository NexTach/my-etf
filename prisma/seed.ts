import { readDividendRecords } from "../src/lib/dividends";
import { readManualPortfolioStore } from "../src/lib/portfolio-store";

async function main() {
  await readManualPortfolioStore();
  await readDividendRecords();
}

main()
  .then(() => {
    console.log("Seed complete");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
