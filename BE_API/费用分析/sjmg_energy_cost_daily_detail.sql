-- 日费用分档明细（堆叠柱状图 + 历史归档）
-- 在 Sunwayland 租户库（与 sjmg_energy_price_detail 相同，通常 dbCode=t01）执行

CREATE TABLE IF NOT EXISTS sjmg_energy_cost_daily_detail (
  id                VARCHAR(64)   NOT NULL COMMENT '主键',
  stat_date         DATE          NOT NULL COMMENT '统计日',
  device_code       VARCHAR(32)   NOT NULL COMMENT 'SYSTEM/HP_HEAT/HP_COLD/PRIMARY_WP/SECONDARY_WP/OHNY',
  tier_name         VARCHAR(32)   NOT NULL COMMENT '峰电/谷电/平电/深谷电',
  time_range        VARCHAR(32)   NOT NULL COMMENT '08:00:00-22:00:00',
  unit_price        DECIMAL(10,4) NOT NULL COMMENT '当日适用单价(元/kWh)',
  plan_start_date   VARCHAR(5)    NOT NULL COMMENT '方案开始 MM-DD',
  plan_end_date     VARCHAR(5)    NOT NULL COMMENT '方案结束 MM-DD',
  cost_amount       DECIMAL(12,2) NOT NULL COMMENT '当日该档费用(元)',
  create_time       DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stat_device (stat_date, device_code),
  KEY idx_stat_price (stat_date, unit_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日费用分档明细';
