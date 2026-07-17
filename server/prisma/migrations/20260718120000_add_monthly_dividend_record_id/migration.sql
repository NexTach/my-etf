ALTER TABLE `tb_monthly_dividend_records`
  ADD COLUMN `record_id` VARCHAR(36) NULL;

UPDATE `tb_monthly_dividend_records`
SET `record_id` = CONCAT('mdr_', REPLACE(UUID(), '-', ''))
WHERE `record_id` IS NULL;

ALTER TABLE `tb_monthly_dividend_records`
  ADD UNIQUE INDEX `uq_monthly_dividend_records_record_id` (`record_id`);
