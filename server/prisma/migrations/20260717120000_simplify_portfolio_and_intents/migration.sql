UPDATE `tb_investment_intents`
SET `status` = 'COMPLETED'
WHERE `status` = 'ACCEPTED';

DROP TABLE `tb_investor_distribution_allocations`;
DROP TABLE `tb_monthly_distribution_settlements`;
DROP TABLE `tb_underlying_distribution_receipt_reversals`;
DROP TABLE `tb_underlying_distribution_receipts`;
DROP TABLE `tb_capital_deployments`;
DROP TABLE `tb_capital_source_returns`;
DROP TABLE `tb_investor_withdrawal_settlements`;
DROP TABLE `tb_portfolio_cash_entries`;
DROP TABLE `tb_investor_capital_sources`;
DROP TABLE `tb_investor_compliance_profiles`;

ALTER TABLE `tb_portfolio_trade_executions`
  DROP COLUMN `investor_deployed_krw`,
  DROP COLUMN `non_investor_funded_krw`;

UPDATE `tb_withdrawal_intents`
SET `status` = 'COMPLETED'
WHERE `status` = 'ACCEPTED';
