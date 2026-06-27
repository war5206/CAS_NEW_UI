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

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);
SnowFlake idWorker = new SnowFlake();

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser != null && ptUser.dbCode != null ? ptUser.dbCode.toString() : "t01";
if ("base".equals(dbCode)) {
    dbCode = "t01";
}

String selectAreaSql = "select project_type_uuid,project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, dbCode);
String projectTypeUuid = selectAreaList.get(0).get("project_type_uuid").toString();
String start_heating_season = selectAreaList.get(0).get("start_heating_season").toString();
String end_heating_season = selectAreaList.get(0).get("end_heating_season").toString();
SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
Calendar calendar = new GregorianCalendar();
int year = calendar.get(Calendar.YEAR);
int day_of_month = calendar.get(Calendar.DAY_OF_MONTH);
int hour = calendar.get(Calendar.HOUR_OF_DAY);
int monthOfYear = calendar.get(Calendar.MONTH)+1;

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

// 每天0点计算日热量并写入 sjmg_heat_daily_detail
if (hour == 0) {
    SimpleDateFormat dateSdf = new SimpleDateFormat("yyyy-MM-dd");
    // 只处理昨天
    Calendar baseCal = Calendar.getInstance();
    baseCal.add(Calendar.DAY_OF_MONTH, -1);
    String yesterdayStr = dateSdf.format(baseCal.getTime());
    String targetDate = yesterdayStr;

    // 每天热量点长名
    String primarySystemDailyHeatingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Primary_System_Daily_Heating_Energy";
    String primarySystemDailyCoolingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Primary_System_Daily_Cooling_Energy";
    String secondarySystemDailyHeatingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Secondary_System_Daily_Heating_Energy";
    String secondarySystemDailyCoolingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Secondary_System_Daily_Cooling_Energy";

    int totalArchived = 0;
    int totalArchivedWithData = 0;
    int totalArchivedZero = 0;
    int totalSkippedExisting = 0;
    List<String> processedDates = new ArrayList<>();
    List<String> skippedExistingDates = new ArrayList<>();
    List<String> archiveErrors = new ArrayList<>();

    // 1. 查询该日期已存在哪些维度组合
    String existSql = "SELECT system_type, energy_type FROM sjmg_heat_daily_detail " +
            "WHERE stat_date = '" + escapeSql(targetDate) + "' " +
            "AND system_type IN ('PRIMARY','SECONDARY') " +
            "AND energy_type IN ('HEATING','COOLING')";
    List<Map<String, Object>> existResult = dynamicDataSource.excuteTenantSqlQuery(existSql, dbCode);
    Set<String> existingKeys = new HashSet<>();
    if (existResult != null) {
        for (Map<String, Object> row : existResult) {
            String st = row.get("system_type") != null ? row.get("system_type").toString() : "";
            String et = row.get("energy_type") != null ? row.get("energy_type").toString() : "";
            if (!st.isEmpty() && !et.isEmpty()) {
                existingKeys.add(st + "_" + et);
            }
        }
    }
    if (existingKeys.size() >= 4) {
        totalSkippedExisting += 4;
        skippedExistingDates.add(targetDate);
    } else {
        // 2. 计算昨天的 23:55:00 - 23:59:59
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

        // 4. 写入 sjmg_heat_daily_detail：已有维度不动，缺失维度补入（有效值或0）
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
            // 已存在则跳过，不刷新
            if (existingKeys.contains(dimKey)) {
                totalSkippedExisting++;
                dateSkippedExisting++;
                continue;
            }
            BigDecimal heatValue = (BigDecimal) row.get("heat_value");
            boolean hasData = Boolean.valueOf(row.get("hasData").toString());
            String id = idWorker.nextId();
            String insertSql = "INSERT INTO sjmg_heat_daily_detail (id, stat_date, system_type, energy_type, heat_value) VALUES (" +
                    "'" + escapeSql(id) + "','" + escapeSql(targetDate) + "','" + escapeSql(systemType) + "','" +
                    escapeSql(energyType) + "','" + escapeSql(heatValue.setScale(2, RoundingMode.HALF_UP).toPlainString()) + "')";
            try {
                dynamicDataSource.excuteTenantSql(insertSql, dbCode);
                totalArchived++;
                dateArchived++;
                if (hasData) {
                    totalArchivedWithData++;
                    dateArchivedWithData++;
                } else {
                    totalArchivedZero++;
                    dateArchivedZero++;
                }
            } catch (Exception e) {
                archiveErrors.add(targetDate + "_" + systemType + "_" + energyType + ":" + (e.getMessage() != null ? e.getMessage() : "写入失败"));
            }
        }
        if (dateArchived > 0 || dateSkippedExisting > 0) {
            processedDates.add(targetDate + "（写入" + dateArchived + "条，其中有效值" + dateArchivedWithData + "条、0值" + dateArchivedZero + "条，已存在跳过" + dateSkippedExisting + "条）");
        }
    }

    if (archiveErrors.isEmpty()) {
        data.put("result", "热量归档成功，共写入 " + totalArchived + " 条日热量明细（有效值 " + totalArchivedWithData + " 条，0值 " + totalArchivedZero + " 条），跳过已存在 " + totalSkippedExisting + " 条");
    } else {
        data.put("result", "热量归档完成，写入 " + totalArchived + " 条（有效值 " + totalArchivedWithData + " 条，0值 " + totalArchivedZero + " 条），跳过已存在 " + totalSkippedExisting + " 条，部分异常: " + String.join("; ", archiveErrors));
    }
    data.put("processedDates", processedDates);
    data.put("skippedExistingDates", skippedExistingDates);
    data.put("statDate", yesterdayStr);
    data.put("archiveCount", totalArchived);
} else {
    data.put("result", "非0点，不执行热量归档");
}

return data;