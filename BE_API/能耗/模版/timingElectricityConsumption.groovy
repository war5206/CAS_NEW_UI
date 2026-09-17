// 定时电量计算
/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
 */

// 每小时计算用电量统计信息
import cn.hutool.core.codec.Base64;
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dao.data.DataRow;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;
import java.text.SimpleDateFormat;
import com.sunwayland.platform.utils.HttpRequest;
import java.text.ParseException;
import java.text.DecimalFormat;
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

def escapeSql = { String s ->
    if (s == null) return "";
    return s.replace("'", "''");
}

/*
 * EF 历史链路测试只改变“触发时间、统计日期、历史查询窗口”。
 * 点位、历史查询、取最大值、查重和写库全部复用正式代码。
 * 测试完成后只需把 EF_HISTORY_TEST_MODE 改为 false。
 */
boolean EF_HISTORY_TEST_MODE = false;
String TEST_START_TIME = "15:16:00";
String TEST_END_TIME = "15:20:59";
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

// 执行时间由平台 Cron 控制；测试模式可在任意时间手动运行。
// EF 无历史记录或查询异常时不写 0，等待下一次 Cron 重试。
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

    String[] deviceCodes = ['SYSTEM', 'HP_HEAT', 'HP_COLD', 'PRIMARY_WP', 'SECONDARY_WP', 'OHNY'];
    String[] deviceTags = [
        "Sys\\FinforWorx\\EnergyCost\\System_Daily_Energy_Consumption",
        "Sys\\FinforWorx\\EnergyCost\\HP_Heat_Daily_Energy_Consumption",
        "Sys\\FinforWorx\\EnergyCost\\HP_Cold_Daily_Energy_Consumption",
        "Sys\\FinforWorx\\EnergyCost\\primary_WP_Daily_Energy_Consumption",
        "Sys\\FinforWorx\\EnergyCost\\secondary_WP_Daily_Energy_Consumption",
        "Sys\\FinforWorx\\EnergyCost\\OHNY_Daily_Energy_Consumption"
    ];

    int totalInserted = 0;
    int totalInsertedWithData = 0;
    int totalInsertedZero = 0;
    int totalSkippedExisting = 0;
    List<String> processedDates = new ArrayList<>();
    List<String> skippedExistingDates = new ArrayList<>();
    List<String> processedSeasonDates = new ArrayList<>();
    List<String> skippedOutOfSeasonDates = new ArrayList<>();

    int totalUpdated = 0;
    int totalMissing = 0;
    List<String> retryErrors = new ArrayList<>();

    for (String targetDate : targetDates) {
        if (!EF_HISTORY_TEST_MODE && "1".equals(projectTypeUuid)
                && !isStatDateInHeatingSeason(targetDate, start_heating_season, end_heating_season)) {
            skippedOutOfSeasonDates.add(targetDate);
            continue;
        }
        processedSeasonDates.add(targetDate);
    // 1. 查询该日期已有值；大于0的有效值直接跳过，0值允许重新向EF确认
    String existSql = "SELECT device_code, elec_value FROM sjmg_electricity_daily_detail " +
            "WHERE stat_date = '" + escapeSql(targetDate) + "' " +
            "AND device_code IN ('SYSTEM','HP_HEAT','HP_COLD','PRIMARY_WP','SECONDARY_WP','OHNY')";
    List<Map<String, Object>> existResult = dynamicDataSource.excuteTenantSqlQuery(existSql, dbCode);
    Map<String, BigDecimal> existingValues = new HashMap<>();
    if (existResult != null) {
        for (Map<String, Object> row : existResult) {
            if (row.get("device_code") != null) {
                BigDecimal existingValue = row.get("elec_value") != null
                        ? new BigDecimal(row.get("elec_value").toString()) : BigDecimal.ZERO;
                existingValues.put(row.get("device_code").toString(), existingValue);
            }
        }
    }
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

        // 3. 只读取缺失点位或数据库0值点位；EF无记录时留待下次Cron重试
        int dateInserted = 0;
        int dateInsertedWithData = 0;
        int dateInsertedZero = 0;
        int dateSkippedExisting = 0;
        for (int i = 0; i < deviceCodes.length; i++) {
            String deviceCode = deviceCodes[i];
            BigDecimal existingValue = existingValues.get(deviceCode);
            if (existingValue != null && existingValue.compareTo(BigDecimal.ZERO) > 0) {
                totalSkippedExisting++;
                dateSkippedExisting++;
                continue;
            }
            try {
                String tagEscaped = deviceTags[i].replace("'", "''");
                String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + dayStart + "' and a.endtime = '" + dayEnd + "' limitpage 1,9999";
                DataTable dt = dataService.queryListDataBySql(sql);
                BigDecimal maxValue = BigDecimal.ZERO;
                boolean hasData = false;
                for (int j = 0; j < dt.getRows().size(); j++) {
                    DataRow dataRow = dt.getDataRow(j);
                    Object hisvalObj = dataRow.getValue(2);
                    if (hisvalObj != null) {
                        hasData = true;
                        BigDecimal value = new BigDecimal(hisvalObj.toString());
                        if (value.compareTo(maxValue) > 0) {
                            maxValue = value;
                        }
                    }
                }

                if (!hasData) {
                    totalMissing++;
                    continue;
                }

                String valueStr = maxValue.setScale(2, RoundingMode.HALF_UP).toPlainString();
                if (existingValue != null) {
                    String updateSql = "UPDATE sjmg_electricity_daily_detail SET elec_value = '" + escapeSql(valueStr) + "' " +
                            "WHERE stat_date = '" + escapeSql(targetDate) + "' AND device_code = '" + escapeSql(deviceCode) + "'";
                    dynamicDataSource.excuteTenantSql(updateSql, dbCode);
                    totalUpdated++;
                } else {
                    String id = idWorker.nextId();
                    String insertSql = "INSERT INTO sjmg_electricity_daily_detail (id, stat_date, device_code, elec_value) VALUES ('" +
                            escapeSql(id) + "','" + escapeSql(targetDate) + "','" + escapeSql(deviceCode) + "','" + escapeSql(valueStr) + "')";
                    dynamicDataSource.excuteTenantSql(insertSql, dbCode);
                    totalInserted++;
                    dateInserted++;
                    totalInsertedWithData++;
                    dateInsertedWithData++;
                    if (maxValue.compareTo(BigDecimal.ZERO) == 0) {
                        totalInsertedZero++;
                        dateInsertedZero++;
                    }
                }
            } catch (Exception e) {
                totalMissing++;
                retryErrors.add(targetDate + "_" + deviceCode + ":" + (e.getMessage() != null ? e.getMessage() : "EF查询失败"));
            }
        }
        if (dateInserted > 0 || dateSkippedExisting > 0) {
            processedDates.add(targetDate + "（写入" + dateInserted + "条，其中有效值" + dateInsertedWithData + "条、0值" + dateInsertedZero + "条，已存在跳过" + dateSkippedExisting + "条）");
        }
    }
    data.put("result", "日电量归档完成，新增 " + totalInserted + " 条（EF有记录 " + totalInsertedWithData + " 条、真实0值 " + totalInsertedZero + " 条），更新0值记录 " + totalUpdated + " 条，跳过有效记录 " + totalSkippedExisting + " 条，待重试 " + totalMissing + " 条");
    data.put("processedDates", processedDates);
    data.put("skippedExistingDates", skippedExistingDates);
    data.put("processedSeasonDates", processedSeasonDates);
    data.put("skippedOutOfSeasonDates", skippedOutOfSeasonDates);
    data.put("retryErrors", retryErrors);
}

return data;
