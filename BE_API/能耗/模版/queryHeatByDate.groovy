// 按日期查询日热量
/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
 */

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

def escapeSql(String s) {
    if (s == null) return "";
    return s.replace("'", "''");
}

SimpleDateFormat dateSdf = new SimpleDateFormat("yyyy-MM-dd");
dateSdf.setLenient(false);
SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

// 1. 获取并校验日期参数
String dateParam = request.getParameter("date");
String targetDate;
if (dateParam == null || dateParam.trim().isEmpty()) {
    Calendar defaultCal = Calendar.getInstance();
    defaultCal.add(Calendar.DAY_OF_MONTH, -1);
    targetDate = dateSdf.format(defaultCal.getTime());
} else {
    try {
        targetDate = dateSdf.format(dateSdf.parse(dateParam.trim()));
    } catch (ParseException e) {
        data.put("result", "日期格式错误，应为 yyyy-MM-dd");
        data.put("date", dateParam.trim());
        return data;
    }
}

// 2. 计算该日期的 23:55:00 - 23:59:59
Calendar rangeCal = Calendar.getInstance();
try {
    rangeCal.setTime(dateSdf.parse(targetDate));
} catch (Exception e) {
    data.put("result", "日期解析异常：" + e.getMessage());
    data.put("date", targetDate);
    return data;
}
rangeCal.set(Calendar.HOUR_OF_DAY, 23);
rangeCal.set(Calendar.MINUTE, 55);
rangeCal.set(Calendar.SECOND, 0);
rangeCal.set(Calendar.MILLISECOND, 0);
String dayStart = sdf.format(rangeCal.getTime());
rangeCal.set(Calendar.MINUTE, 59);
rangeCal.set(Calendar.SECOND, 59);
String dayEnd = sdf.format(rangeCal.getTime());

// 3. 查询该日期已存在的 system_type + energy_type 组合
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

// 4. 四个维度配置
String primarySystemDailyHeatingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Primary_System_Daily_Heating_Energy";
String primarySystemDailyCoolingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Primary_System_Daily_Cooling_Energy";
String secondarySystemDailyHeatingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Secondary_System_Daily_Heating_Energy";
String secondarySystemDailyCoolingEnergyTag = "Sys\\FinforWorx\\EnergyCost\\Secondary_System_Daily_Cooling_Energy";

List<Map<String, Object>> heatRows = new ArrayList<>();
heatRows.add(["system_type": "PRIMARY", "energy_type": "HEATING", "tag": primarySystemDailyHeatingEnergyTag]);
heatRows.add(["system_type": "PRIMARY", "energy_type": "COOLING", "tag": primarySystemDailyCoolingEnergyTag]);
heatRows.add(["system_type": "SECONDARY", "energy_type": "HEATING", "tag": secondarySystemDailyHeatingEnergyTag]);
heatRows.add(["system_type": "SECONDARY", "energy_type": "COOLING", "tag": secondarySystemDailyCoolingEnergyTag]);

int inserted = 0;
int skippedExisting = 0;
int insertedZero = 0;
List<String> insertErrors = new ArrayList<>();

// 5. 缺失维度读 SCADA 补库
for (Map<String, Object> row : heatRows) {
    String systemType = row.get("system_type").toString();
    String energyType = row.get("energy_type").toString();
    String dimKey = systemType + "_" + energyType;
    String tagName = row.get("tag").toString();

    // 已存在则跳过
    if (existingKeys.contains(dimKey)) {
        skippedExisting++;
        continue;
    }

    BigDecimal heatValue = BigDecimal.ZERO;
    boolean hasData = false;
    try {
        String tagEscaped = tagName.replace("'", "''");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + dayStart + "' and a.endtime = '" + dayEnd + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        BigDecimal maxValue = BigDecimal.ZERO;
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
        heatValue = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        // 无数据或异常时补 0
        heatValue = BigDecimal.ZERO;
        hasData = false;
    }

    String id = idWorker.nextId();
    String insertSql = "INSERT INTO sjmg_heat_daily_detail (id, stat_date, system_type, energy_type, heat_value) VALUES (" +
            "'" + escapeSql(id) + "','" + escapeSql(targetDate) + "','" + escapeSql(systemType) + "','" +
            escapeSql(energyType) + "','" + escapeSql(heatValue.setScale(2, RoundingMode.HALF_UP).toPlainString()) + "')";
    try {
        dynamicDataSource.excuteTenantSql(insertSql, dbCode);
        inserted++;
        if (hasData) {
            // 有效值
        } else {
            insertedZero++;
        }
    } catch (Exception e) {
        insertErrors.add(systemType + "_" + energyType + ":" + (e.getMessage() != null ? e.getMessage() : "写入失败"));
    }
}

// 6. 查询并返回该日期完整 4 条记录
String querySql = "SELECT system_type, energy_type, heat_value FROM sjmg_heat_daily_detail " +
        "WHERE stat_date = '" + escapeSql(targetDate) + "' " +
        "AND system_type IN ('PRIMARY','SECONDARY') " +
        "AND energy_type IN ('HEATING','COOLING') " +
        "ORDER BY system_type, energy_type";
List<Map<String, Object>> queryResult = dynamicDataSource.excuteTenantSqlQuery(querySql, dbCode);
List<Map<String, Object>> resultList = new ArrayList<>();
if (queryResult != null) {
    for (Map<String, Object> row : queryResult) {
        Map<String, Object> item = new HashMap<>();
        item.put("system_type", row.get("system_type") != null ? row.get("system_type").toString() : "");
        item.put("energy_type", row.get("energy_type") != null ? row.get("energy_type").toString() : "");
        BigDecimal val = BigDecimal.ZERO;
        if (row.get("heat_value") != null) {
            try {
                val = new BigDecimal(row.get("heat_value").toString());
            } catch (Exception e) {
                val = BigDecimal.ZERO;
            }
        }
        item.put("heat_value", val.setScale(2, RoundingMode.HALF_UP));
        resultList.add(item);
    }
}

if (insertErrors.isEmpty()) {
    data.put("result", "日热量查询成功，写入 " + inserted + " 条（含补 0 共 " + insertedZero + " 条），跳过已存在 " + skippedExisting + " 条");
} else {
    data.put("result", "日热量查询完成，写入 " + inserted + " 条（含补 0 共 " + insertedZero + " 条），跳过已存在 " + skippedExisting + " 条，部分异常: " + String.join("; ", insertErrors));
}
data.put("date", targetDate);
data.put("list", resultList);
data.put("inserted", inserted);
data.put("skippedExisting", skippedExisting);
data.put("insertedZero", insertedZero);

return data;
