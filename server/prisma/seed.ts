import { syncScheduledDividendRecords } from "../src/infrastructure/dividends.js";

async function main() {
  await syncScheduledDividendRecords();
}

main()
  .then(() => {
    console.log("Seed complete");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
