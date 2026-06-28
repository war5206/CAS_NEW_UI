-- 测试数据：insert_water_test.sql
-- 生成范围：2026-06-01 ~ 2026-06-28
-- 执行前建议先清理同范围测试数据，避免主键/唯一冲突

DELETE FROM sjmg_water_daily_detail WHERE stat_date BETWEEN '2026-06-01' AND '2026-06-30';

INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260601test0000000000', '2026-06-01', 9.98);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260602test0000000000', '2026-06-02', 13.25);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260603test0000000000', '2026-06-03', 18.32);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260604test0000000000', '2026-06-04', 10.26);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260605test0000000000', '2026-06-05', 9.53);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260606test0000000000', '2026-06-06', 9.87);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260607test0000000000', '2026-06-07', 8.43);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260608test0000000000', '2026-06-08', 10.76);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260609test0000000000', '2026-06-09', 18.45);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260610test0000000000', '2026-06-10', 15.80);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260611test0000000000', '2026-06-11', 12.00);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260612test0000000000', '2026-06-12', 9.59);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260613test0000000000', '2026-06-13', 18.35);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260614test0000000000', '2026-06-14', 11.55);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260615test0000000000', '2026-06-15', 17.93);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260616test0000000000', '2026-06-16', 18.39);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260617test0000000000', '2026-06-17', 6.74);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260618test0000000000', '2026-06-18', 11.94);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260619test0000000000', '2026-06-19', 17.09);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260620test0000000000', '2026-06-20', 9.41);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260621test0000000000', '2026-06-21', 18.53);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260622test0000000000', '2026-06-22', 7.00);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260623test0000000000', '2026-06-23', 9.72);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260624test0000000000', '2026-06-24', 14.63);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260625test0000000000', '2026-06-25', 12.14);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260626test0000000000', '2026-06-26', 18.62);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260627test0000000000', '2026-06-27', 10.00);
INSERT INTO sjmg_water_daily_detail (id, stat_date, water_value) VALUES ('water20260628test0000000000', '2026-06-28', 8.99);
