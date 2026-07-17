ALTER TABLE `tb_monthly_dividend_records`
  MODIFY COLUMN `record_id` VARCHAR(36) NOT NULL,
  DROP COLUMN `memo`;
