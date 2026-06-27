import random
import uuid
from datetime import date, timedelta

random.seed(42)

YEAR = 2026
MONTH = 6
START = date(YEAR, MONTH, 1)
END = date(YEAR, MONTH, 28)  # 生成到28号，足够看到效果


def uuid_str():
    return str(uuid.uuid4()).replace("-", "")


def write_sql(filename, lines):
    with open(filename, "w", encoding="utf-8") as f:
        f.write("-- 测试数据：{}\n".format(filename))
        f.write("-- 生成范围：{} ~ {}\n".format(START, END))
        f.write("-- 执行前建议先清理同范围测试数据，避免主键/唯一冲突\n\n")
        f.write("\n".join(lines))
        f.write("\n")


def generate_electricity():
    devices = [
        ("SYSTEM", lambda d: round(80 + 40 * random.random() + 10 * (d % 7), 2)),
        ("HP_HEAT", lambda d: round(30 + 25 * random.random() + 5 * (d % 7), 2)),
        ("HP_COLD", lambda d: round(20 + 15 * random.random() + 3 * (d % 7), 2)),
        ("PRIMARY_WP", lambda d: round(10 + 8 * random.random(), 2)),
        ("SECONDARY_WP", lambda d: round(8 + 6 * random.random(), 2)),
        ("OHNY", lambda d: round(5 + 5 * random.random(), 2)),
    ]
    lines = []
    lines.append("DELETE FROM sjmg_electricity_daily_detail WHERE stat_date BETWEEN '{}-{:02d}-01' AND '{}-{:02d}-30';".format(YEAR, MONTH, YEAR, MONTH))
    lines.append("")
    d = START
    while d <= END:
        for code, fn in devices:
            val = fn(d.day)
            lines.append(
                "INSERT INTO sjmg_electricity_daily_detail (id, stat_date, device_code, elec_value) VALUES ('{}', '{}', '{}', {});".format(
                    uuid_str(), d.strftime("%Y-%m-%d"), code, val
                )
            )
        d += timedelta(days=1)
    return lines


def generate_heat():
    combos = [
        ("PRIMARY", "HEATING"),
        ("PRIMARY", "COOLING"),
        ("SECONDARY", "HEATING"),
        ("SECONDARY", "COOLING"),
    ]
    lines = []
    lines.append("DELETE FROM sjmg_heat_daily_detail WHERE stat_date BETWEEN '{}-{:02d}-01' AND '{}-{:02d}-30';".format(YEAR, MONTH, YEAR, MONTH))
    lines.append("")
    d = START
    while d <= END:
        for system_type, energy_type in combos:
            base = 50 if energy_type == "HEATING" else 25
            val = round(base + 30 * random.random() + 5 * (d.day % 7), 2)
            lines.append(
                "INSERT INTO sjmg_heat_daily_detail (id, stat_date, system_type, energy_type, heat_value) VALUES ('{}', '{}', '{}', '{}', {});".format(
                    uuid_str(), d.strftime("%Y-%m-%d"), system_type, energy_type, val
                )
            )
        d += timedelta(days=1)
    return lines


def generate_cop():
    lines = []
    lines.append("DELETE FROM sjmg_cop_detail WHERE stat_date BETWEEN '{}-{:02d}-01' AND '{}-{:02d}-30';".format(YEAR, MONTH, YEAR, MONTH))
    lines.append("")

    # 日 COP：system_type IS NULL
    d = START
    while d <= END:
        for cop_type, base in [("SYSTEM", 3.0), ("HEAT", 3.2), ("COLD", 2.8)]:
            val = round(base + 0.5 * random.random() - 0.25 + 0.05 * (d.day % 5), 2)
            lines.append(
                "INSERT INTO sjmg_cop_detail (id, stat_date, cop_type, cycle_type, system_type, cop_value) VALUES ('{}', '{}', '{}', 'DAILY', NULL, {});".format(
                    uuid_str(), d.strftime("%Y-%m-%d"), cop_type, val
                )
            )
        d += timedelta(days=1)

    # 月 COP：stat_date 取月末，system_type 分 PRIMARY/SECONDARY
    month_end = date(YEAR, MONTH, 30)
    for system_type in ["PRIMARY", "SECONDARY"]:
        for cop_type, base in [("HEAT", 3.2), ("COLD", 2.8)]:
            val = round(base + 0.3 * random.random() - 0.15, 2)
            lines.append(
                "INSERT INTO sjmg_cop_detail (id, stat_date, cop_type, cycle_type, system_type, cop_value) VALUES ('{}', '{}', '{}', 'MONTHLY', '{}', {});".format(
                    uuid_str(), month_end.strftime("%Y-%m-%d"), cop_type, system_type, val
                )
            )

    # 年 COP：stat_date 取年末，system_type 分 PRIMARY/SECONDARY
    year_end = date(YEAR, 12, 31)
    for system_type in ["PRIMARY", "SECONDARY"]:
        for cop_type, base in [("HEAT", 3.2), ("COLD", 2.8)]:
            val = round(base + 0.3 * random.random() - 0.15, 2)
            lines.append(
                "INSERT INTO sjmg_cop_detail (id, stat_date, cop_type, cycle_type, system_type, cop_value) VALUES ('{}', '{}', '{}', 'YEARLY', '{}', {});".format(
                    uuid_str(), year_end.strftime("%Y-%m-%d"), cop_type, system_type, val
                )
            )

    return lines


if __name__ == "__main__":
    write_sql("insert_electricity_test.sql", generate_electricity())
    write_sql("insert_heat_test.sql", generate_heat())
    write_sql("insert_cop_test.sql", generate_cop())
    print("测试 SQL 文件已生成：")
    print("  - insert_electricity_test.sql")
    print("  - insert_heat_test.sql")
    print("  - insert_cop_test.sql")
