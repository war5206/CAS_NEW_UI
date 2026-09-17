// 定时热量计算
/* 注意!以下包无需导入 默认可以使用
*java.io.*
*java.lang.*
*java.math.BigDecimal*
*java.math.BigInteger
*java.net.*
*java.util.*
* 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
*/

// 每小时计算热量统计信息
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
 * EF 历史链路测试只改变“触发时间、统计日期、历史查询窗口”。
 * 点位、历史查询、取最大值、查重和写库全部复用正式代码。
 * 测试完成后只需把 EF_HISTORY_TEST_MODE 改为 false。
 */
boolean EF_HISTORY_TEST_MODE = false;
String TEST_START_TIME = "15:00:00";
String TEST_END_TIME = "15:04:59";
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

String selectAreaSql = "select project_type_uuid,project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, dbCode);
String projectTypeUuid = selectAreaList.get(0).get("project_type_uuid").toString();
String start_heating_season = selectAreaList.get(0).get("start_heating_season").toString();
String end_heating_season = selectAreaList.get(0).get("end_heating_season").toString();
SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

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

// 执行时间由平台 Cron 控制；EF 无记录或查询异常时等待下一次 Cron 重试。
if (true) {
    SimpleDateFormat dateSdf = new SimpleDateFormat("yyyy-MM-dd");
    List<String> targetDates = new ArrayList<>();
    if (EF_HISTORY_TEST_MODE) {
        targetDates.add(dateSdf.format(Calendar.getInstance().getTime()));
    } else {
        // 正式模式检查最近3天，弥补平台停机或EF历史文件延迟
        for (int offset = 1; offset <= 3; offset++) {
            Calendar targetCal = Calendar.getInstance();
            targetCal.add(Calendar.DAY_OF_MONTH, -offset);
            targetDates.add(dateSdf.format(targetCal.getTime()));
        }
    }

    // 每天热量点长名
    String primarySystemDailyHeatingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Primary_System_Daily_Heating_Energy";
    String primarySystemDailyCoolingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Primary_System_Daily_Cooling_Energy";
    String secondarySystemDailyHeatingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Secondary_System_Daily_Heating_Energy";
    String secondarySystemDailyCoolingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Secondary_System_Daily_Cooling_Energy";

    int totalArchived = 0;
    int totalArchivedWithData = 0;
    int totalArchivedZero = 0;
    int totalUpdated = 0;
    int totalMissing = 0;
    int totalSkippedExisting = 0;
    List<String> processedDates = new ArrayList<>();
    List<String> skippedExistingDates = new ArrayList<>();
    List<String> processedSeasonDates = new ArrayList<>();
    List<String> skippedOutOfSeasonDates = new ArrayList<>();
    List<String> archiveErrors = new ArrayList<>();

    for (String targetDate : targetDates) {
    if (!EF_HISTORY_TEST_MODE && "1".equals(projectTypeUuid)
            && !isStatDateInHeatingSeason(targetDate, start_heating_season, end_heating_season)) {
        skippedOutOfSeasonDates.add(targetDate);
        continue;
    }
    processedSeasonDates.add(targetDate);
    // 1. 查询该日期已存在哪些维度组合
    String existSql = "SELECT system_type, energy_type, heat_value FROM sjmg_heat_daily_detail " +
            "WHERE stat_date = '" + escapeSql(targetDate) + "' " +
            "AND system_type IN ('PRIMARY','SECONDARY') " +
            "AND energy_type IN ('HEATING','COOLING')";
    List<Map<String, Object>> existResult = dynamicDataSource.excuteTenantSqlQuery(existSql, dbCode);
    Map<String, BigDecimal> existingValues = new HashMap<>();
    if (existResult != null) {
        for (Map<String, Object> row : existResult) {
            String st = row.get("system_type") != null ? row.get("system_type").toString() : "";
            String et = row.get("energy_type") != null ? row.get("energy_type").toString() : "";
            if (!st.isEmpty() && !et.isEmpty()) {
                BigDecimal existingValue = row.get("heat_value") != null
                        ? new BigDecimal(row.get("heat_value").toString()) : BigDecimal.ZERO;
                existingValues.put(st + "_" + et, existingValue);
            }
        }
    }
    boolean allExistingValuesValid = existingValues.size() >= 4 && existingValues.values().every {
        it != null && it.compareTo(BigDecimal.ZERO) > 0
    };
    if (allExistingValuesValid) {
        totalSkippedExisting += 4;
        skippedExistingDates.add(targetDate);
    } else {
        // 2. 测试模式使用指定窗口；正式模式使用 23:55:00 - 23:59:59
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

        // 3. 从系统点位读取日热量（查询历史数据表）
        BigDecimal primaryHeatDay = BigDecimal.ZERO;
        boolean primaryHeatHasData = false;
        BigDecimal primaryCoolDay = BigDecimal.ZERO;
        boolean primaryCoolHasData = false;
        BigDecimal secondaryHeatDay = BigDecimal.ZERO;
        boolean secondaryHeatHasData = false;
        BigDecimal secondaryCoolDay = BigDecimal.ZERO;
        boolean secondaryCoolHasData = false;

        // 一次系统日制热量
        try {
            String tagEscaped = primarySystemDailyHeatingEnergyTag.replace("'", "''");
            // 查询历史数据表，使用starttime和endtime字段
            String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + dayStart + "' and a.endtime = '" + dayEnd + "' limitpage 1,9999";
            DataTable dt = dataService.queryListDataBySql(sql);
            // 取最大值
            BigDecimal maxValue = BigDecimal.ZERO;
            for (int j = 0; j < dt.getRows().size(); j++) {
                DataRow dataRow = dt.getDataRow(j);
                Object hisvalObj = dataRow.getValue(2);
                if (hisvalObj != null) {
                    primaryHeatHasData = true;
                    BigDecimal value = new BigDecimal(hisvalObj.toString());
                    if (value.compareTo(maxValue) > 0) {
                        maxValue = value;
                    }
                }
            }
            primaryHeatDay = maxValue.setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            // 异常时保持为0
        }

        // 一次系统日制冷量
        try {
            String tagEscaped = primarySystemDailyCoolingEnergyTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + dayStart + "' and a.endtime = '" + dayEnd + "' limitpage 1,9999";
            DataTable dt = dataService.queryListDataBySql(sql);
            BigDecimal maxValue = BigDecimal.ZERO;
            for (int j = 0; j < dt.getRows().size(); j++) {
                DataRow dataRow = dt.getDataRow(j);
                Object hisvalObj = dataRow.getValue(2);
                if (hisvalObj != null) {
                    primaryCoolHasData = true;
                    BigDecimal value = new BigDecimal(hisvalObj.toString());
                    if (value.compareTo(maxValue) > 0) {
                        maxValue = value;
                    }
                }
            }
            primaryCoolDay = maxValue.setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            // 异常时保持为0
        }

        // 二次系统日制热量
        try {
            String tagEscaped = secondarySystemDailyHeatingEnergyTag.replace("'", "''");
            // 查询历史数据表，使用starttime和endtime字段
            String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + dayStart + "' and a.endtime = '" + dayEnd + "' limitpage 1,9999";
            DataTable dt = dataService.queryListDataBySql(sql);
            // 取最大值
            BigDecimal maxValue = BigDecimal.ZERO;
            for (int j = 0; j < dt.getRows().size(); j++) {
                DataRow dataRow = dt.getDataRow(j);
                Object hisvalObj = dataRow.getValue(2);
                if (hisvalObj != null) {
                    secondaryHeatHasData = true;
                    BigDecimal value = new BigDecimal(hisvalObj.toString());
                    if (value.compareTo(maxValue) > 0) {
                        maxValue = value;
                    }
                }
            }
            secondaryHeatDay = maxValue.setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            // 异常时保持为0
        }

        // 二次系统日制冷量
        try {
            String tagEscaped = secondarySystemDailyCoolingEnergyTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + dayStart + "' and a.endtime = '" + dayEnd + "' limitpage 1,9999";
            DataTable dt = dataService.queryListDataBySql(sql);
            BigDecimal maxValue = BigDecimal.ZERO;
            for (int j = 0; j < dt.getRows().size(); j++) {
                DataRow dataRow = dt.getDataRow(j);
                Object hisvalObj = dataRow.getValue(2);
                if (hisvalObj != null) {
                    secondaryCoolHasData = true;
                    BigDecimal value = new BigDecimal(hisvalObj.toString());
                    if (value.compareTo(maxValue) > 0) {
                        maxValue = value;
                    }
                }
            }
            secondaryCoolDay = maxValue.setScale(2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            // 异常时保持为0
        }

        // 4. 写入 sjmg_heat_daily_detail：有效值不动，0值重新确认，无EF记录则等待重试
        List<Map<String, Object>> heatRows = new ArrayList<>();
        heatRows.add(["system_type": "PRIMARY", "energy_type": "HEATING", "heat_value": primaryHeatDay, "hasData": primaryHeatHasData]);
        heatRows.add(["system_type": "PRIMARY", "energy_type": "COOLING", "heat_value": primaryCoolDay, "hasData": primaryCoolHasData]);
        heatRows.add(["system_type": "SECONDARY", "energy_type": "HEATING", "heat_value": secondaryHeatDay, "hasData": secondaryHeatHasData]);
        heatRows.add(["system_type": "SECONDARY", "energy_type": "COOLING", "heat_value": secondaryCoolDay, "hasData": secondaryCoolHasData]);

        int dateArchived = 0;
        int dateArchivedWithData = 0;
        int dateArchivedZero = 0;
        int dateSkippedExisting = 0;
        for (Map<String, Object> row : heatRows) {
            String systemType = row.get("system_type").toString();
            String energyType = row.get("energy_type").toString();
            String dimKey = systemType + "_" + energyType;
            BigDecimal existingValue = existingValues.get(dimKey);
            if (existingValue != null && existingValue.compareTo(BigDecimal.ZERO) > 0) {
                totalSkippedExisting++;
                dateSkippedExisting++;
                continue;
            }
            BigDecimal heatValue = (BigDecimal) row.get("heat_value");
            boolean hasData = Boolean.valueOf(row.get("hasData").toString());
            if (!hasData) {
                totalMissing++;
                continue;
            }
            try {
                String valueStr = heatValue.setScale(2, RoundingMode.HALF_UP).toPlainString();
                if (existingValue != null) {
                    String updateSql = "UPDATE sjmg_heat_daily_detail SET heat_value = '" + escapeSql(valueStr) + "' " +
                            "WHERE stat_date = '" + escapeSql(targetDate) + "' AND system_type = '" + escapeSql(systemType) + "' " +
                            "AND energy_type = '" + escapeSql(energyType) + "'";
                    dynamicDataSource.excuteTenantSql(updateSql, dbCode);
                    totalUpdated++;
                } else {
                    String id = idWorker.nextId();
                    String insertSql = "INSERT INTO sjmg_heat_daily_detail (id, stat_date, system_type, energy_type, heat_value) VALUES (" +
                            "'" + escapeSql(id) + "','" + escapeSql(targetDate) + "','" + escapeSql(systemType) + "','" +
                            escapeSql(energyType) + "','" + escapeSql(valueStr) + "')";
                    dynamicDataSource.excuteTenantSql(insertSql, dbCode);
                    totalArchived++;
                    dateArchived++;
                    totalArchivedWithData++;
                    dateArchivedWithData++;
                    if (heatValue.compareTo(BigDecimal.ZERO) == 0) {
                        totalArchivedZero++;
                        dateArchivedZero++;
                    }
                }
            } catch (Exception e) {
                archiveErrors.add(targetDate + "_" + systemType + "_" + energyType + ":" + (e.getMessage() != null ? e.getMessage() : "写入失败"));
            }
        }
        if (dateArchived > 0 || dateSkippedExisting > 0) {
            processedDates.add(targetDate + "（写入" + dateArchived + "条，其中有效值" + dateArchivedWithData + "条、0值" + dateArchivedZero + "条，已存在跳过" + dateSkippedExisting + "条）");
        }
    }
    }

    if (archiveErrors.isEmpty()) {
        data.put("result", "热量归档完成，新增 " + totalArchived + " 条（EF有记录 " + totalArchivedWithData + " 条、真实0值 " + totalArchivedZero + " 条），更新0值记录 " + totalUpdated + " 条，跳过有效记录 " + totalSkippedExisting + " 条，待重试 " + totalMissing + " 条");
    } else {
        data.put("result", "热量归档完成，新增 " + totalArchived + " 条，更新 " + totalUpdated + " 条，跳过有效记录 " + totalSkippedExisting + " 条，待重试 " + totalMissing + " 条，部分异常: " + String.join("; ", archiveErrors));
    }
    data.put("processedDates", processedDates);
    data.put("skippedExistingDates", skippedExistingDates);
    data.put("processedSeasonDates", processedSeasonDates);
    data.put("skippedOutOfSeasonDates", skippedOutOfSeasonDates);
    data.put("statDates", targetDates);
    data.put("archiveCount", totalArchived);
}

return data;


// {
//     "writeData":{
//         "Sys\\FinforWorx\\EnergyCost\\Primary_System_Daily_Heating_Energy":"970",
//         "Sys\\FinforWorx\\EnergyCost\\Primary_System_Daily_Cooling_Energy":"756",
//         "Sys\\FinforWorx\\EnergyCost\\Secondary_System_Daily_Heating_Energy":"931",
//         "Sys\\FinforWorx\\EnergyCost\\Secondary_System_Daily_Cooling_Energy":"1242"
//     }
// }
