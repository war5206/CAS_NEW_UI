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

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);
SnowFlake idWorker = new SnowFlake();

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser != null && ptUser.dbCode != null ? ptUser.dbCode.toString() : "t01";
if ("base".equals(dbCode)) {
    dbCode = "t01";
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

// 采暖季是跨年的
Date startDate = null;
Date endDate = null;
try {
    if (monthOfYear<7){
        startDate = sdf.parse((year-1)+"-"+start_heating_season+" 00:00:00");
        endDate = sdf.parse(year+"-"+end_heating_season+" 23:59:59");
    }else {
        startDate = sdf.parse(year+"-"+start_heating_season+" 00:00:00");
        endDate = sdf.parse((year+1)+"-"+end_heating_season+" 23:59:59");
    }
} catch (ParseException e) {
    e.printStackTrace();
}

//是否在采暖季
boolean isno_season = calendar.getTime().compareTo(startDate) >= 0 && calendar.getTime().compareTo(endDate) <= 0;
if ("1".equals(projectTypeUuid) && !isno_season){
    data.put("result", "当前不在采暖季，不执行归档操作");
    data.put("currentTime", sdf.format(calendar.getTime()));
    data.put("startDate", sdf.format(startDate));
    data.put("endDate", sdf.format(endDate));
    return;
}

def escapeSql(String s) {
    if (s == null) return "";
    return s.replace("'", "''");
}

// 辅助函数：从历史数据中获取指定时间范围内靠近结束时间的大于1的值
def getValueFromHistory(String tagName, String startTime, String endTime, DataService dataService) {
    try {
        String tagEscaped = tagName.replace("'", "''");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime = '" + startTime + "' and a.endtime = '" + endTime + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        int rowCount = dt != null ? dt.getRows().size() : 0;
        if (rowCount == 0) {
            return null;
        }
        for (int j = dt.getRows().size() - 1; j >= 0; j--) {
            DataRow dataRow = dt.getDataRow(j);
            Object hisvalObj = dataRow.getValue(2);
            if (hisvalObj != null) {
                try {
                    BigDecimal value = new BigDecimal(hisvalObj.toString());
                    if (value.compareTo(BigDecimal.ZERO) > 0) {
                        return value.setScale(2, RoundingMode.HALF_UP);
                    }
                } catch (NumberFormatException nfe) {
                    // ignore
                }
            }
        }
    } catch (Exception e) {
        // ignore
    }
    return null;
}

def insertCopDetail(String statDate, String copType, String cycleType, String systemType, BigDecimal copValue) {
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

def queryBigDecimal(String sql) {
    List<Map<String, Object>> rows = dynamicDataSource.excuteTenantSqlQuery(sql, dbCode);
    if (rows != null && !rows.isEmpty() && rows.get(0).get("total") != null) {
        return new BigDecimal(rows.get(0).get("total").toString());
    }
    return BigDecimal.ZERO;
}

def querySumAndCount(String sql) {
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
int monthlyCount = 0;
int monthlySkipped = 0;
int yearlyCount = 0;
int yearlySkipped = 0;
List<String> dailyProcessedDates = new ArrayList<>();
List<String> dailySkippedExistingDates = new ArrayList<>();

if (hour == 0) {
    // 昨天日期（因为0点执行，统计的是昨天）
    Calendar yesterdayCal = Calendar.getInstance();
    yesterdayCal.add(Calendar.DAY_OF_MONTH, -1);
    String yesterdayDateStr = dateSdf.format(yesterdayCal.getTime());

    // 日COP只处理昨天
    String dailyYesterdayStr = yesterdayDateStr;

    String heatDailyCOP = "Sys\\FinforWorx\\EnergyCost\\Heat_Daily_COP";
    String coldDailyCOP = "Sys\\FinforWorx\\EnergyCost\\Cold_Daily_COP";
    String systemDailyCOP = "Sys\\FinforWorx\\EnergyCost\\System_Daily_COP";
    List<String> dailyCopTypes = ['HEAT', 'COLD', 'SYSTEM'];
    List<String> dailyCopTags = [heatDailyCOP, coldDailyCOP, systemDailyCOP];

    String targetDate = dailyYesterdayStr;
    // 计算 targetDate 的 23:55:00 - 23:59:59
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
    String dayStart = sdf.format(rangeCal.getTime());
    rangeCal.set(Calendar.MINUTE, 59);
    rangeCal.set(Calendar.SECOND, 59);
    String dayEnd = sdf.format(rangeCal.getTime());

    // 查询已存在的日COP类型
    String existSql = "SELECT cop_type FROM sjmg_cop_detail " +
            "WHERE cycle_type = 'DAILY' AND stat_date = '" + escapeSql(targetDate) + "' " +
            "AND cop_type IN ('HEAT','COLD','SYSTEM') AND system_type IS NULL";
    List<Map<String, Object>> existRows = dynamicDataSource.excuteTenantSqlQuery(existSql, dbCode);
    Set<String> existingTypes = new HashSet<>();
    if (existRows != null) {
        for (Map<String, Object> row : existRows) {
            if (row.get("cop_type") != null) {
                existingTypes.add(row.get("cop_type").toString());
            }
        }
    }

    // 如果 3 条都存在，跳过该日期
    if (existingTypes.size() < 3) {
        int dateInserted = 0;
        int dateInsertedWithData = 0;
        int dateInsertedZero = 0;
        for (int i = 0; i < dailyCopTypes.size(); i++) {
            String copType = dailyCopTypes.get(i);
            if (existingTypes.contains(copType)) {
                dailySkippedExisting++;
                continue;
            }
            BigDecimal value = getValueFromHistory(dailyCopTags.get(i), dayStart, dayEnd, dataService);
            if (value != null) {
                insertCopDetail(targetDate, copType, "DAILY", null, value);
                dailyCount++;
                dailyCountWithData++;
                dateInserted++;
                dateInsertedWithData++;
            } else {
                // 缺失且无有效历史数据，补0
                insertCopDetail(targetDate, copType, "DAILY", null, BigDecimal.ZERO);
                dailyCount++;
                dailyCountZero++;
                dateInserted++;
                dateInsertedZero++;
            }
        }
        if (dateInserted > 0) {
            dailyProcessedDates.add(targetDate + "（写入" + dateInserted + "条，其中有效值" + dateInsertedWithData + "条、0值" + dateInsertedZero + "条）");
        }
    } else {
        dailySkippedExisting += 3;
        dailySkippedExistingDates.add(targetDate);
    }

    if (day_of_month == 1) {
        // 月COP：以上月（昨天所在的月份）为统计周期
        Calendar monthStartCal = (Calendar) yesterdayCal.clone();
        monthStartCal.set(Calendar.DAY_OF_MONTH, 1);
        String monthStartStr = dateSdf.format(monthStartCal.getTime());
        String monthEndStr = yesterdayDateStr;

        String systemTypeStr = "1".equals(systemTypeUuid) ? "PRIMARY" : "SECONDARY";

        String systemMonthlyElecSql = "SELECT IFNULL(SUM(elec_value),0) AS total, COUNT(*) AS cnt FROM sjmg_electricity_daily_detail " +
                "WHERE stat_date >= '" + escapeSql(monthStartStr) + "' AND stat_date <= '" + escapeSql(monthEndStr) + "' " +
                "AND device_code = 'SYSTEM'";
        Map<String, Object> systemMonthlyElecResult = querySumAndCount(systemMonthlyElecSql);
        BigDecimal systemMonthlyElec = (BigDecimal) systemMonthlyElecResult.get("total");
        int systemMonthlyElecCnt = (Integer) systemMonthlyElecResult.get("cnt");

        String heatMonthlySql = "SELECT IFNULL(SUM(heat_value),0) AS total, COUNT(*) AS cnt FROM sjmg_heat_daily_detail " +
                "WHERE stat_date >= '" + escapeSql(monthStartStr) + "' AND stat_date <= '" + escapeSql(monthEndStr) + "' " +
                "AND system_type = '" + escapeSql(systemTypeStr) + "' AND energy_type = 'HEATING'";
        Map<String, Object> heatMonthlyResult = querySumAndCount(heatMonthlySql);
        BigDecimal heatMonthly = (BigDecimal) heatMonthlyResult.get("total");
        int heatMonthlyCnt = (Integer) heatMonthlyResult.get("cnt");

        String coldMonthlySql = "SELECT IFNULL(SUM(heat_value),0) AS total, COUNT(*) AS cnt FROM sjmg_heat_daily_detail " +
                "WHERE stat_date >= '" + escapeSql(monthStartStr) + "' AND stat_date <= '" + escapeSql(monthEndStr) + "' " +
                "AND system_type = '" + escapeSql(systemTypeStr) + "' AND energy_type = 'COOLING'";
        Map<String, Object> coldMonthlyResult = querySumAndCount(coldMonthlySql);
        BigDecimal coldMonthly = (BigDecimal) coldMonthlyResult.get("total");
        int coldMonthlyCnt = (Integer) coldMonthlyResult.get("cnt");

        if (systemMonthlyElecCnt > 0 && heatMonthlyCnt > 0 && coldMonthlyCnt > 0) {
            BigDecimal heatMonthlyCOP = BigDecimal.ZERO;
            BigDecimal coldMonthlyCOP = BigDecimal.ZERO;
            if (systemMonthlyElec.compareTo(BigDecimal.ZERO) != 0) {
                heatMonthlyCOP = heatMonthly.divide(systemMonthlyElec, 2, RoundingMode.HALF_UP);
                coldMonthlyCOP = coldMonthly.divide(systemMonthlyElec, 2, RoundingMode.HALF_UP);
            }
            insertCopDetail(yesterdayDateStr, "HEAT", "MONTHLY", systemTypeStr, heatMonthlyCOP);
            insertCopDetail(yesterdayDateStr, "COLD", "MONTHLY", systemTypeStr, coldMonthlyCOP);
            monthlyCount = 2;
        } else {
            monthlySkipped = 2;
        }

        if (monthOfYear == 1) {
            // 年COP：以上一年1月1日至12月31日为统计周期
            int prevYear = year - 1;
            String yearStartStr = prevYear + "-01-01";
            String yearEndStr = prevYear + "-12-31";

            String systemYearlyElecSql = "SELECT IFNULL(SUM(elec_value),0) AS total, COUNT(*) AS cnt FROM sjmg_electricity_daily_detail " +
                    "WHERE stat_date >= '" + escapeSql(yearStartStr) + "' AND stat_date <= '" + escapeSql(yearEndStr) + "' " +
                    "AND device_code = 'SYSTEM'";
            Map<String, Object> systemYearlyElecResult = querySumAndCount(systemYearlyElecSql);
            BigDecimal systemYearlyElec = (BigDecimal) systemYearlyElecResult.get("total");
            int systemYearlyElecCnt = (Integer) systemYearlyElecResult.get("cnt");

            String heatYearlySql = "SELECT IFNULL(SUM(heat_value),0) AS total, COUNT(*) AS cnt FROM sjmg_heat_daily_detail " +
                    "WHERE stat_date >= '" + escapeSql(yearStartStr) + "' AND stat_date <= '" + escapeSql(yearEndStr) + "' " +
                    "AND system_type = '" + escapeSql(systemTypeStr) + "' AND energy_type = 'HEATING'";
            Map<String, Object> heatYearlyResult = querySumAndCount(heatYearlySql);
            BigDecimal heatYearly = (BigDecimal) heatYearlyResult.get("total");
            int heatYearlyCnt = (Integer) heatYearlyResult.get("cnt");

            String coldYearlySql = "SELECT IFNULL(SUM(heat_value),0) AS total, COUNT(*) AS cnt FROM sjmg_heat_daily_detail " +
                    "WHERE stat_date >= '" + escapeSql(yearStartStr) + "' AND stat_date <= '" + escapeSql(yearEndStr) + "' " +
                    "AND system_type = '" + escapeSql(systemTypeStr) + "' AND energy_type = 'COOLING'";
            Map<String, Object> coldYearlyResult = querySumAndCount(coldYearlySql);
            BigDecimal coldYearly = (BigDecimal) coldYearlyResult.get("total");
            int coldYearlyCnt = (Integer) coldYearlyResult.get("cnt");

            if (systemYearlyElecCnt > 0 && heatYearlyCnt > 0 && coldYearlyCnt > 0) {
                BigDecimal heatYearlyCOP = BigDecimal.ZERO;
                BigDecimal coldYearlyCOP = BigDecimal.ZERO;
                if (systemYearlyElec.compareTo(BigDecimal.ZERO) != 0) {
                    heatYearlyCOP = heatYearly.divide(systemYearlyElec, 2, RoundingMode.HALF_UP);
                    coldYearlyCOP = coldYearly.divide(systemYearlyElec, 2, RoundingMode.HALF_UP);
                }
                insertCopDetail(yesterdayDateStr, "HEAT", "YEARLY", systemTypeStr, heatYearlyCOP);
                insertCopDetail(yesterdayDateStr, "COLD", "YEARLY", systemTypeStr, coldYearlyCOP);
                yearlyCount = 2;
            } else {
                yearlySkipped = 2;
            }
        }
    }
}

data.put("result", "COP归档成功，日COP " + dailyCount + " 条（有效值 " + dailyCountWithData + " 条，0值 " + dailyCountZero + " 条，跳过已存在 " + dailySkippedExisting + " 条），月COP " + monthlyCount + " 条（跳过无数据 " + monthlySkipped + " 条），年COP " + yearlyCount + " 条（跳过无数据 " + yearlySkipped + " 条）");
data.put("dailyProcessedDates", dailyProcessedDates);
data.put("dailySkippedExistingDates", dailySkippedExistingDates);
return data;
