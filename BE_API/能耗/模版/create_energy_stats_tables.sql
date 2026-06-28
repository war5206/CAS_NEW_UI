-- 日电量/日热量/COP 统计表
-- 在对应租户库执行（通常为 t01）
-- 执行方式：
--   1) mysql -u<user> -p<password> -D <tenant_db>
--   2) source /path/to/create_energy_stats_tables.sql
-- 或在 MySQL 客户端中逐条执行以下 3 条 CREATE TABLE 语句。

-- 日电量明细
CREATE TABLE IF NOT EXISTS sjmg_electricity_daily_detail (
  id          VARCHAR(64)   NOT NULL COMMENT '主键',
  stat_date   DATE          NOT NULL COMMENT '统计日',
  device_code VARCHAR(32)   NOT NULL COMMENT 'SYSTEM/HP_HEAT/HP_COLD/PRIMARY_WP/SECONDARY_WP/OHNY',
  elec_value  DECIMAL(12,2) NOT NULL COMMENT '日电量(kWh)',
  create_time DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stat_device (stat_date, device_code),
  KEY idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日电量明细';

-- 日热量明细
CREATE TABLE IF NOT EXISTS sjmg_heat_daily_detail (
  id           VARCHAR(64)   NOT NULL COMMENT '主键',
  stat_date    DATE          NOT NULL COMMENT '统计日',
  system_type  VARCHAR(16)   NOT NULL COMMENT 'PRIMARY/SECONDARY（一次/二次系统）',
  energy_type  VARCHAR(16)   NOT NULL COMMENT 'HEATING/COOLING（制热/制冷）',
  heat_value   DECIMAL(12,2) NOT NULL COMMENT '日热量(与点位单位一致)',
  create_time  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stat_system_energy (stat_date, system_type, energy_type),
  KEY idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日热量明细';

-- 日用水明细
CREATE TABLE IF NOT EXISTS sjmg_water_daily_detail (
  id          VARCHAR(64)   NOT NULL COMMENT '主键',
  stat_date   DATE          NOT NULL COMMENT '统计日',
  water_value DECIMAL(12,2) NOT NULL COMMENT '日用水量(t)',
  create_time DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stat_date (stat_date),
  KEY idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日用水明细';

-- COP 明细
CREATE TABLE IF NOT EXISTS sjmg_cop_detail (
  id           VARCHAR(64)   NOT NULL COMMENT '主键',
  stat_date    DATE          NOT NULL COMMENT '统计日（月/年数据取该周期最后一天）',
  cop_type     VARCHAR(16)   NOT NULL COMMENT 'HEAT/COLD/SYSTEM（制热/制冷/系统）',
  cycle_type   VARCHAR(16)   NOT NULL COMMENT 'DAILY/MONTHLY/YEARLY',
  system_type  VARCHAR(16)   DEFAULT NULL COMMENT 'PRIMARY/SECONDARY，月/年COP记录一次/二次系统来源',
  cop_value    DECIMAL(8,2)  NOT NULL COMMENT 'COP值',
  create_time  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_stat_type_cycle_system (stat_date, cop_type, cycle_type, system_type),
  KEY idx_stat_date (stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='COP明细';
