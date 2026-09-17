// 定时COP计算
/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
 */
// 每小时计算COP统计信息（热泵COP、水源热泵COP、系统COP）
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dao.data.DataRow;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;
import java.text.SimpleDateFormat;
import java.text.ParseException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);
SnowFlake idWorker = new SnowFlake();

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser != null && ptUser.dbCode != null ? ptUser.dbCode.toString() : "t01";
if ("base".equals(dbCode)) {
    dbCode = "t01";
}

/*
 * EF 日COP历史链路测试只改变“触发时间、统计日期、历史查询窗口”。
 * 日COP点位、历史查询、取值、查重和写库全部复用正式代码。
 * 月/年COP来自MySQL汇总，不属于EF历史点位测试。
 * 全部测试完成后需把 EF_HISTORY_TEST_MODE、PERIOD_COP_TEST_MODE 都改为 false。
 */
boolean EF_HISTORY_TEST_MODE = false;
String TEST_START_TIME = "15:20:00";
String TEST_END_TIME = "15:24:59";

// 月/年COP手动测试：只改变触发条件和统计区间，计算及写库仍走正式代码。
boolean PERIOD_COP_TEST_MODE = false;
String TEST_MONTH_START_DATE = "2026-09-01";
String TEST_MONTH_END_DATE = "2026-09-01";
String TEST_YEAR_START_DATE = "2026-01-01";
String TEST_YEAR_END_DATE = "2026-09-01";
String TEST_PERIOD_STAT_DATE = "2026-09-01";
boolean SEASON_BOUNDARY_TEST_MODE = false;

def getMonthDayOrder(String monthDay) {
    if (monthDay == null || !monthDay.contains("-")) return -1;
    String[] parts = monthDay.split("-");
    return Integer.parseInt(parts[0]) * 100 + Integer.parseInt(parts[1]);
}

def isStatDateInHeatingSeason(String statDate, String seasonStart, String seasonEnd) {
    if (statDate == null || statDate.length() < 10) return false;
    int target = getMonthDayOrder(statDate.substring(5, 10));
    int start = getMonthDayOrder(seasonStart);
    int end = getMonthDayOrder(seasonEnd);
    if (target < 0 || start < 0 || end < 0) return false;
    return start <= end ? (target >= start && target <= end) : (target >= start || target <= end);
}

def shiftMonthDay(String monthDay, int days) {
    LocalDate anchor = LocalDate.parse("2000-" + monthDay, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    return anchor.plusDays(days).format(DateTimeFormatter.ofPattern("MM-dd"));
}

String selectAreaSql = "select project_type_uuid,system_type_uuid,project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, dbCode);
String projectTypeUuid = selectAreaList.get(0).get("project_type_uuid").toString(); // 1采暖，2冷暖
String systemTypeUuid = selectAreaList.get(0).get("system_type_uuid").toString(); // 1一次系统，2二次系统
String start_heating_season = selectAreaList.get(0).get("start_heating_season").toString(); // 采暖季开始时间
String end_heating_season = selectAreaList.get(0).get("end_heating_season").toString(); // 采暖季结束时间
SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"); // 时间格式化
SimpleDateFormat dateSdf = new SimpleDateFormat("yyyy-MM-dd"); // 日期格式化
Calendar calendar = new GregorianCalendar(); // 日历对象
int year = calendar.get(Calendar.YEAR); // 当前年份
int day_of_month = calendar.get(Calendar.DAY_OF_MONTH); // 当前日期
int hour = calendar.get(Calendar.HOUR_OF_DAY); // 当前小时
int monthOfYear = calendar.get(Calendar.MONTH)+1; // 当前月份

if (SEASON_BOUNDARY_TEST_MODE) {
    String beforeStart = shiftMonthDay(start_heating_season, -1);
    String afterEnd = shiftMonthDay(end_heating_season, 1);
    data.put("result", "采暖季边界判断测试完成，未读取EF、未写数据库");
    data.put("seasonBoundaryChecks", [
            [monthDay: beforeStart, inSeason: isStatDateInHeatingSeason("2000-" + beforeStart, start_heating_season, end_heating_season)],
            [monthDay: start_heating_season, inSeason: isStatDateInHeatingSeason("2000-" + start_heating_season, start_heating_season, end_heating_season)],
            [monthDay: end_heating_season, inSeason: isStatDateInHeatingSeason("2000-" + end_heating_season, start_heating_season, end_heating_season)],
            [monthDay: afterEnd, inSeason: isStatDateInHeatingSeason("2000-" + afterEnd, start_heating_season, end_heating_season)]
    ]);
    return data;
}

def escapeSql(String s) {
    if (s == null) return "";
    return s.replace("'", "''");
}

// 辅助函数：区分“EF没有记录”和“EF确实返回0”；优先取窗口末端最后一个正值
def getValueFromHistory(String tagName, String startTime, String endTime, DataService dataService) {
    try {
        String tagEscaped = tagName.replace("'", "''");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime = '" + startTime + "' and a.endtime = '" + endTime + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        int rowCount = dt != null ? dt.getRows().size() : 0;
        if (rowCount == 0) {
            return [hasData: false, value: BigDecimal.ZERO];
        }
        boolean hasNumericData = false;
        for (int j = dt.getRows().size() - 1; j >= 0; j--) {
            DataRow dataRow = dt.getDataRow(j);
            Object hisvalObj = dataRow.getValue(2);
            if (hisvalObj != null) {
                try {
                    BigDecimal value = new BigDecimal(hisvalObj.toString());
                    hasNumericData = true;
                    if (value.compareTo(BigDecimal.ZERO) > 0) {
                        return [hasData: true, value: value.setScale(2, RoundingMode.HALF_UP)];
                    }
                } catch (NumberFormatException nfe) {
                    // ignore
                }
            }
        }
        return [hasData: hasNumericData, value: BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)];
    } catch (Exception e) {
        return [hasData: false, value: BigDecimal.ZERO];
    }
}

def insertCopDetail(String statDate, String copType, String cycleType, String systemType, BigDecimal copValue,
                    DynamicDataSource dynamicDataSource, String dbCode, SnowFlake idWorker) {
    String id = idWorker.nextId();
    String sysTypeCondition;
    String sysTypeValue;
    if (systemType == null) {
        sysTypeCondition = "AND system_type IS NULL";
        sysTypeValue = "NULL";
    } else {
        String sysTypeEscaped = escapeSql(systemType);
        sysTypeCondition = "AND system_type = '" + sysTypeEscaped + "'";
        sysTypeValue = "'" + sysTypeEscaped + "'";
    }
    String deleteSql = "DELETE FROM sjmg_cop_detail WHERE stat_date = '" + escapeSql(statDate) + "' " +
            "AND cop_type = '" + escapeSql(copType) + "' " +
            "AND cycle_type = '" + escapeSql(cycleType) + "' " +
            sysTypeCondition;
    dynamicDataSource.excuteTenantSql(deleteSql, dbCode);
    String insertSql = "INSERT INTO sjmg_cop_detail (id, stat_date, cop_type, cycle_type, system_type, cop_value) VALUES (" +
            "'" + escapeSql(id) + "','" + escapeSql(statDate) + "','" + escapeSql(copType) + "','" + escapeSql(cycleType) + "'," +
            sysTypeValue + ",'" + escapeSql(copValue.setScale(2, RoundingMode.HALF_UP).toPlainString()) + "')";
    dynamicDataSource.excuteTenantSql(insertSql, dbCode);
}

def queryBigDecimal(String sql, DynamicDataSource dynamicDataSource, String dbCode) {
    List<Map<String, Object>> rows = dynamicDataSource.excuteTenantSqlQuery(sql, dbCode);
    if (rows != null && !rows.isEmpty() && rows.get(0).get("total") != null) {
        return new BigDecimal(rows.get(0).get("total").toString());
    }
    return BigDecimal.ZERO;
}

def querySumAndCount(String sql, DynamicDataSource dynamicDataSource, String dbCode) {
    List<Map<String, Object>> rows = dynamicDataSource.excuteTenantSqlQuery(sql, dbCode);
    Map<String, Object> result = new HashMap<>();
    if (rows != null && !rows.isEmpty()) {
        Map<String, Object> row = rows.get(0);
        result.put("total", row.get("total") != null ? new BigDecimal(row.get("total").toString()) : BigDecimal.ZERO);
        result.put("cnt", row.get("cnt") != null ? new BigDecimal(row.get("cnt").toString()).intValue() : 0);
    } else {
        result.put("total", BigDecimal.ZERO);
        result.put("cnt", 0);
    }
    return result;
}

// 每天0点归档日/月/年COP
int dailyCount = 0;
int dailyCountWithData = 0;
int dailyCountZero = 0;
int dailySkippedExisting = 0;
int dailyUpdated = 0;
int dailyMissing = 0;
int monthlyCount = 0;
int monthlySkipped = 0;
int yearlyCount = 0;
int yearlySkipped = 0;
List<String> dailyProcessedDates = new ArrayList<>();
List<String> dailySkippedExistingDates = new ArrayList<>();
List<String> processedSeasonDates = new ArrayList<>();
List<String> skippedOutOfSeasonDates = new ArrayList<>();

// 执行时间由平台 Cron 控制；EF无记录时不落0，等待下一次Cron重试。
if (true) {
    // 测试模式处理今天；正式模式在0点处理昨天
    Calendar yesterdayCal = Calendar.getInstance();
    if (!EF_HISTORY_TEST_MODE) {
        yesterdayCal.add(Calendar.DAY_OF_MONTH, -1);
    }
    String yesterdayDateStr = dateSdf.format(yesterdayCal.getTime());

    // 月/年手动测试不重复执行日COP；其他模式保持原有日COP正式路径。
    if (!PERIOD_COP_TEST_MODE) {
        List<String> dailyTargetDates = new ArrayList<>();
        if (EF_HISTORY_TEST_MODE) {
            dailyTargetDates.add(yesterdayDateStr);
        } else {
            // 正式模式检查最近3天，弥补平台停机或EF历史文件延迟
            for (int offset = 1; offset <= 3; offset++) {
                Calendar targetCal = Calendar.getInstance();
                targetCal.add(Calendar.DAY_OF_MONTH, -offset);
                dailyTargetDates.add(dateSdf.format(targetCal.getTime()));
            }
        }

    String heatDailyCOP = "Sys\\FinforWorx\\EnergyCost\\Heat_Daily_COP";
    String coldDailyCOP = "Sys\\FinforWorx\\EnergyCost\\Cold_Daily_COP";
    String systemDailyCOP = "Sys\\FinforWorx\\EnergyCost\\System_Daily_COP";
    List<String> dailyCopTypes = ['HEAT', 'COLD', 'SYSTEM'];
    List<String> dailyCopTags = [heatDailyCOP, coldDailyCOP, systemDailyCOP];

    for (String targetDate : dailyTargetDates) {
    if (!EF_HISTORY_TEST_MODE && "1".equals(projectTypeUuid)
            && !isStatDateInHeatingSeason(targetDate, start_heating_season, end_heating_season)) {
        skippedOutOfSeasonDates.add(targetDate);
        continue;
    }
    processedSeasonDates.add(targetDate);
    // 测试模式使用指定窗口；正式模式使用 23:55:00 - 23:59:59
    String dayStart;
    String dayEnd;
    if (EF_HISTORY_TEST_MODE) {
        dayStart = targetDate + " " + TEST_START_TIME;
        dayEnd = targetDate + " " + TEST_END_TIME;
    } else {
        Calendar rangeCal = Calendar.getInstance();
        try {
            rangeCal.setTime(dateSdf.parse(targetDate));
        } catch (Exception e) {
            // ignore, keep current date
        }
        rangeCal.set(Calendar.HOUR_OF_DAY, 23);
        rangeCal.set(Calendar.MINUTE, 55);
        rangeCal.set(Calendar.SECOND, 0);
        rangeCal.set(Calendar.MILLISECOND, 0);
        dayStart = sdf.format(rangeCal.getTime());
        rangeCal.set(Calendar.MINUTE, 59);
        rangeCal.set(Calendar.SECOND, 59);
        dayEnd = sdf.format(rangeCal.getTime());
    }

    data.put("testMode", EF_HISTORY_TEST_MODE);
    data.put("statDate", targetDate);
    data.put("historyStart", dayStart);
    data.put("historyEnd", dayEnd);

    // 查询已存在的日COP类型
    String existSql = "SELECT cop_type, cop_value FROM sjmg_cop_detail " +
            "WHERE cycle_type = 'DAILY' AND stat_date = '" + escapeSql(targetDate) + "' " +
            "AND cop_type IN ('HEAT','COLD','SYSTEM') AND system_type IS NULL";
    List<Map<String, Object>> existRows = dynamicDataSource.excuteTenantSqlQuery(existSql, dbCode);
    Map<String, BigDecimal> existingValues = new HashMap<>();
    if (existRows != null) {
        for (Map<String, Object> row : existRows) {
            if (row.get("cop_type") != null) {
                BigDecimal existingValue = row.get("cop_value") != null
                        ? new BigDecimal(row.get("cop_value").toString()) : BigDecimal.ZERO;
                existingValues.put(row.get("cop_type").toString(), existingValue);
            }
        }
    }

    boolean allDailyValuesValid = existingValues.size() >= 3 && existingValues.values().every {
        it != null && it.compareTo(BigDecimal.ZERO) > 0
    };
    if (!allDailyValuesValid) {
        int dateInserted = 0;
        int dateInsertedWithData = 0;
        int dateInsertedZero = 0;
        for (int i = 0; i < dailyCopTypes.size(); i++) {
            String copType = dailyCopTypes.get(i);
            BigDecimal existingValue = existingValues.get(copType);
            if (existingValue != null && existingValue.compareTo(BigDecimal.ZERO) > 0) {
                dailySkippedExisting++;
                continue;
            }
            Map<String, Object> historyResult = getValueFromHistory(dailyCopTags.get(i), dayStart, dayEnd, dataService);
            boolean hasData = Boolean.valueOf(historyResult.get("hasData").toString());
            if (hasData) {
                BigDecimal value = (BigDecimal) historyResult.get("value");
                insertCopDetail(targetDate, copType, "DAILY", null, value, dynamicDataSource, dbCode, idWorker);
                if (existingValue != null) {
                    dailyUpdated++;
                } else {
                    dailyCount++;
                    dailyCountWithData++;
                    dateInserted++;
                    dateInsertedWithData++;
                    if (value.compareTo(BigDecimal.ZERO) == 0) {
                        dailyCountZero++;
                        dateInsertedZero++;
                    }
                }
            } else {
                dailyMissing++;
            }
        }
        if (dateInserted > 0) {
            dailyProcessedDates.add(targetDate + "（写入" + dateInserted + "条，其中有效值" + dateInsertedWithData + "条、0值" + dateInsertedZero + "条）");
        }
    } else {
        dailySkippedExisting += 3;
        dailySkippedExistingDates.add(targetDate);
    }
    }

    }

    if (PERIOD_COP_TEST_MODE || (!EF_HISTORY_TEST_MODE && day_of_month == 1)) {
        // 月COP：以上月（昨天所在的月份）为统计周期
        String monthStartStr;
        String monthEndStr;
        String periodStatDate;
        if (PERIOD_COP_TEST_MODE) {
            monthStartStr = TEST_MONTH_START_DATE;
            monthEndStr = TEST_MONTH_END_DATE;
            periodStatDate = TEST_PERIOD_STAT_DATE;
        } else {
            Calendar monthStartCal = (Calendar) yesterdayCal.clone();
            monthStartCal.set(Calendar.DAY_OF_MONTH, 1);
            monthStartStr = dateSdf.format(monthStartCal.getTime());
            monthEndStr = yesterdayDateStr;
            periodStatDate = yesterdayDateStr;
        }

        data.put("periodTestMode", PERIOD_COP_TEST_MODE);
        data.put("periodStatDate", periodStatDate);
        data.put("monthStart", monthStartStr);
        data.put("monthEnd", monthEndStr);

        String systemTypeStr = "1".equals(systemTypeUuid) ? "PRIMARY" : "SECONDARY";
        data.put("periodSystemType", systemTypeStr);

        String systemMonthlyElecSql = "SELECT IFNULL(SUM(elec_value),0) AS total, COUNT(*) AS cnt FROM sjmg_electricity_daily_detail " +
                "WHERE stat_date >= '" + escapeSql(monthStartStr) + "' AND stat_date <= '" + escapeSql(monthEndStr) + "' " +
                "AND device_code = 'SYSTEM'";
        Map<String, Object> systemMonthlyElecResult = querySumAndCount(systemMonthlyElecSql, dynamicDataSource, dbCode);
        BigDecimal systemMonthlyElec = (BigDecimal) systemMonthlyElecResult.get("total");
        int systemMonthlyElecCnt = (Integer) systemMonthlyElecResult.get("cnt");

        String heatMonthlySql = "SELECT IFNULL(SUM(heat_value),0) AS total, COUNT(*) AS cnt FROM sjmg_heat_daily_detail " +
                "WHERE stat_date >= '" + escapeSql(monthStartStr) + "' AND stat_date <= '" + escapeSql(monthEndStr) + "' " +
                "AND system_type = '" + escapeSql(systemTypeStr) + "' AND energy_type = 'HEATING'";
        Map<String, Object> heatMonthlyResult = querySumAndCount(heatMonthlySql, dynamicDataSource, dbCode);
        BigDecimal heatMonthly = (BigDecimal) heatMonthlyResult.get("total");
        int heatMonthlyCnt = (Integer) heatMonthlyResult.get("cnt");

        String coldMonthlySql = "SELECT IFNULL(SUM(heat_value),0) AS total, COUNT(*) AS cnt FROM sjmg_heat_daily_detail " +
                "WHERE stat_date >= '" + escapeSql(monthStartStr) + "' AND stat_date <= '" + escapeSql(monthEndStr) + "' " +
                "AND system_type = '" + escapeSql(systemTypeStr) + "' AND energy_type = 'COOLING'";
        Map<String, Object> coldMonthlyResult = querySumAndCount(coldMonthlySql, dynamicDataSource, dbCode);
        BigDecimal coldMonthly = (BigDecimal) coldMonthlyResult.get("total");
        int coldMonthlyCnt = (Integer) coldMonthlyResult.get("cnt");

        data.put("monthSystemElecTotal", systemMonthlyElec);
        data.put("monthSystemElecCount", systemMonthlyElecCnt);
        data.put("monthHeatTotal", heatMonthly);
        data.put("monthHeatCount", heatMonthlyCnt);
        data.put("monthColdTotal", coldMonthly);
        data.put("monthColdCount", coldMonthlyCnt);

        boolean hasMonthlySystemElec = systemMonthlyElecCnt > 0 && systemMonthlyElec.compareTo(BigDecimal.ZERO) != 0;
        if (hasMonthlySystemElec && heatMonthlyCnt > 0) {
            BigDecimal heatMonthlyCOP = heatMonthly.divide(systemMonthlyElec, 2, RoundingMode.HALF_UP);
            data.put("monthHeatCOP", heatMonthlyCOP);
            insertCopDetail(periodStatDate, "HEAT", "MONTHLY", systemTypeStr, heatMonthlyCOP, dynamicDataSource, dbCode, idWorker);
            monthlyCount++;
        } else {
            monthlySkipped++;
        }
        if (hasMonthlySystemElec && coldMonthlyCnt > 0) {
            BigDecimal coldMonthlyCOP = coldMonthly.divide(systemMonthlyElec, 2, RoundingMode.HALF_UP);
            data.put("monthColdCOP", coldMonthlyCOP);
            insertCopDetail(periodStatDate, "COLD", "MONTHLY", systemTypeStr, coldMonthlyCOP, dynamicDataSource, dbCode, idWorker);
            monthlyCount++;
        } else {
            monthlySkipped++;
        }

        if (PERIOD_COP_TEST_MODE || monthOfYear == 1) {
            // 年COP：以上一年1月1日至12月31日为统计周期
            String yearStartStr;
            String yearEndStr;
            if (PERIOD_COP_TEST_MODE) {
                yearStartStr = TEST_YEAR_START_DATE;
                yearEndStr = TEST_YEAR_END_DATE;
            } else {
                int prevYear = year - 1;
                yearStartStr = prevYear + "-01-01";
                yearEndStr = prevYear + "-12-31";
            }
            data.put("yearStart", yearStartStr);
            data.put("yearEnd", yearEndStr);

            String systemYearlyElecSql = "SELECT IFNULL(SUM(elec_value),0) AS total, COUNT(*) AS cnt FROM sjmg_electricity_daily_detail " +
                    "WHERE stat_date >= '" + escapeSql(yearStartStr) + "' AND stat_date <= '" + escapeSql(yearEndStr) + "' " +
                    "AND device_code = 'SYSTEM'";
            Map<String, Object> systemYearlyElecResult = querySumAndCount(systemYearlyElecSql, dynamicDataSource, dbCode);
            BigDecimal systemYearlyElec = (BigDecimal) systemYearlyElecResult.get("total");
            int systemYearlyElecCnt = (Integer) systemYearlyElecResult.get("cnt");

            String heatYearlySql = "SELECT IFNULL(SUM(heat_value),0) AS total, COUNT(*) AS cnt FROM sjmg_heat_daily_detail " +
                    "WHERE stat_date >= '" + escapeSql(yearStartStr) + "' AND stat_date <= '" + escapeSql(yearEndStr) + "' " +
                    "AND system_type = '" + escapeSql(systemTypeStr) + "' AND energy_type = 'HEATING'";
            Map<String, Object> heatYearlyResult = querySumAndCount(heatYearlySql, dynamicDataSource, dbCode);
            BigDecimal heatYearly = (BigDecimal) heatYearlyResult.get("total");
            int heatYearlyCnt = (Integer) heatYearlyResult.get("cnt");

            String coldYearlySql = "SELECT IFNULL(SUM(heat_value),0) AS total, COUNT(*) AS cnt FROM sjmg_heat_daily_detail " +
                    "WHERE stat_date >= '" + escapeSql(yearStartStr) + "' AND stat_date <= '" + escapeSql(yearEndStr) + "' " +
                    "AND system_type = '" + escapeSql(systemTypeStr) + "' AND energy_type = 'COOLING'";
            Map<String, Object> coldYearlyResult = querySumAndCount(coldYearlySql, dynamicDataSource, dbCode);
            BigDecimal coldYearly = (BigDecimal) coldYearlyResult.get("total");
            int coldYearlyCnt = (Integer) coldYearlyResult.get("cnt");

            data.put("yearSystemElecTotal", systemYearlyElec);
            data.put("yearSystemElecCount", systemYearlyElecCnt);
            data.put("yearHeatTotal", heatYearly);
            data.put("yearHeatCount", heatYearlyCnt);
            data.put("yearColdTotal", coldYearly);
            data.put("yearColdCount", coldYearlyCnt);

            boolean hasYearlySystemElec = systemYearlyElecCnt > 0 && systemYearlyElec.compareTo(BigDecimal.ZERO) != 0;
            if (hasYearlySystemElec && heatYearlyCnt > 0) {
                BigDecimal heatYearlyCOP = heatYearly.divide(systemYearlyElec, 2, RoundingMode.HALF_UP);
                data.put("yearHeatCOP", heatYearlyCOP);
                insertCopDetail(periodStatDate, "HEAT", "YEARLY", systemTypeStr, heatYearlyCOP, dynamicDataSource, dbCode, idWorker);
                yearlyCount++;
            } else {
                yearlySkipped++;
            }
            if (hasYearlySystemElec && coldYearlyCnt > 0) {
                BigDecimal coldYearlyCOP = coldYearly.divide(systemYearlyElec, 2, RoundingMode.HALF_UP);
                data.put("yearColdCOP", coldYearlyCOP);
                insertCopDetail(periodStatDate, "COLD", "YEARLY", systemTypeStr, coldYearlyCOP, dynamicDataSource, dbCode, idWorker);
                yearlyCount++;
            } else {
                yearlySkipped++;
            }
        }
    }
}

data.put("result", "COP归档完成，日COP新增 " + dailyCount + " 条（EF有记录 " + dailyCountWithData + " 条、真实0值 " + dailyCountZero + " 条），更新0值记录 " + dailyUpdated + " 条，跳过有效记录 " + dailySkippedExisting + " 条，待重试 " + dailyMissing + " 条；月COP " + monthlyCount + " 条（跳过无数据 " + monthlySkipped + " 条），年COP " + yearlyCount + " 条（跳过无数据 " + yearlySkipped + " 条）");
data.put("dailyProcessedDates", dailyProcessedDates);
data.put("dailySkippedExistingDates", dailySkippedExistingDates);
data.put("processedSeasonDates", processedSeasonDates);
data.put("skippedOutOfSeasonDates", skippedOutOfSeasonDates);
return data;
