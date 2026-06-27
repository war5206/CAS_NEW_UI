// 按日期查询日COP；缺失类型读SCADA补库，无数据补0
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

SimpleDateFormat dateSdf = new SimpleDateFormat("yyyy-MM-dd");
SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

def escapeSql(String s) {
    if (s == null) return "";
    return s.replace("'", "''");
}

// 辅助函数：从历史数据中获取指定时间范围内靠近结束时间的大于0的值
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

def insertCopDetailNoDelete(String statDate, String copType, String cycleType, BigDecimal copValue) {
    String id = idWorker.nextId();
    String insertSql = "INSERT INTO sjmg_cop_detail (id, stat_date, cop_type, cycle_type, system_type, cop_value) VALUES (" +
            "'" + escapeSql(id) + "','" + escapeSql(statDate) + "','" + escapeSql(copType) + "','" + escapeSql(cycleType) + "'," +
            "NULL,'" + escapeSql(copValue.setScale(2, RoundingMode.HALF_UP).toPlainString()) + "')";
    dynamicDataSource.excuteTenantSql(insertSql, dbCode);
}

// 1. 获取日期参数
String dateParam = request.getParameter("date");
if (dateParam == null || dateParam.trim().isEmpty()) {
    Calendar yesterdayCal = Calendar.getInstance();
    yesterdayCal.add(Calendar.DAY_OF_MONTH, -1);
    dateParam = dateSdf.format(yesterdayCal.getTime());
}
dateParam = dateParam.trim();

// 2. 校验日期格式
try {
    dateSdf.setLenient(false);
    Date parsedDate = dateSdf.parse(dateParam);
    dateParam = dateSdf.format(parsedDate);
} catch (ParseException e) {
    data.put("result", "日期格式错误，请使用 yyyy-MM-dd 格式");
    data.put("date", dateParam);
    return data;
}

// 3. 计算 23:55:00 - 23:59:59
String dayStart = dateParam + " 23:55:00";
String dayEnd = dateParam + " 23:59:59";

String heatDailyCOP = "Sys\\FinforWorx\\EnergyCost\\Heat_Daily_COP";
String coldDailyCOP = "Sys\\FinforWorx\\EnergyCost\\Cold_Daily_COP";
String systemDailyCOP = "Sys\\FinforWorx\\EnergyCost\\System_Daily_COP";
List<String> dailyCopTypes = ['HEAT', 'COLD', 'SYSTEM'];
List<String> dailyCopTags = [heatDailyCOP, coldDailyCOP, systemDailyCOP];

// 4. 查询已存在的日COP类型
String existSql = "SELECT cop_type FROM sjmg_cop_detail " +
        "WHERE cycle_type = 'DAILY' AND stat_date = '" + escapeSql(dateParam) + "' " +
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

int inserted = 0;
int skippedExisting = existingTypes.size();
int insertedZero = 0;

// 5. 对缺失类型补库
for (int i = 0; i < dailyCopTypes.size(); i++) {
    String copType = dailyCopTypes.get(i);
    if (existingTypes.contains(copType)) {
        continue;
    }
    BigDecimal value = getValueFromHistory(dailyCopTags.get(i), dayStart, dayEnd, dataService);
    if (value != null) {
        insertCopDetailNoDelete(dateParam, copType, "DAILY", value);
        inserted++;
    } else {
        insertCopDetailNoDelete(dateParam, copType, "DAILY", BigDecimal.ZERO);
        inserted++;
        insertedZero++;
    }
}

// 6. 查询该日期完整3条日COP
String querySql = "SELECT cop_type, cop_value FROM sjmg_cop_detail " +
        "WHERE cycle_type = 'DAILY' AND stat_date = '" + escapeSql(dateParam) + "' " +
        "AND cop_type IN ('HEAT','COLD','SYSTEM') AND system_type IS NULL";
List<Map<String, Object>> queryRows = dynamicDataSource.excuteTenantSqlQuery(querySql, dbCode);
Map<String, Map<String, Object>> tempMap = new HashMap<>();
if (queryRows != null) {
    for (Map<String, Object> row : queryRows) {
        String copType = row.get("cop_type") != null ? row.get("cop_type").toString() : "";
        if (copType.isEmpty()) {
            continue;
        }
        Map<String, Object> item = new HashMap<>();
        item.put("cop_type", copType);
        Object valObj = row.get("cop_value");
        BigDecimal val = BigDecimal.ZERO;
        if (valObj != null) {
            try {
                val = new BigDecimal(valObj.toString()).setScale(2, RoundingMode.HALF_UP);
            } catch (NumberFormatException nfe) {
                val = BigDecimal.ZERO;
            }
        }
        item.put("cop_value", val);
        tempMap.put(copType, item);
    }
}
List<Map<String, Object>> resultList = new ArrayList<>();
for (String copType : dailyCopTypes) {
    Map<String, Object> item = tempMap.get(copType);
    if (item == null) {
        item = new HashMap<>();
        item.put("cop_type", copType);
        item.put("cop_value", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
    }
    resultList.add(item);
}

String resultMsg;
if (inserted == 0 && skippedExisting == 3) {
    resultMsg = "日COP记录已存在，未执行补库";
} else {
    resultMsg = "日COP补库成功，写入 " + inserted + " 条（补0 " + insertedZero + " 条），跳过已存在 " + skippedExisting + " 条";
}

data.put("result", resultMsg);
data.put("date", dateParam);
data.put("list", resultList);
data.put("inserted", inserted);
data.put("skippedExisting", skippedExisting);
data.put("insertedZero", insertedZero);
return data;
