// 按日期查询日电量；缺失点位读 SCADA 补库，无数据补 0，最终返回完整 6 条
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

def escapeSql = { String s ->
    if (s == null) return "";
    return s.replace("'", "''");
}

SimpleDateFormat dateSdf = new SimpleDateFormat("yyyy-MM-dd");
dateSdf.setLenient(false);
SimpleDateFormat timeSdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

// 1. 获取并校验日期参数
String dateParam = request.getParameter("date");
String targetDate;
if (dateParam == null || dateParam.trim().isEmpty()) {
    Calendar cal = Calendar.getInstance();
    cal.add(Calendar.DAY_OF_MONTH, -1);
    targetDate = dateSdf.format(cal.getTime());
} else {
    try {
        Date parsed = dateSdf.parse(dateParam.trim());
        targetDate = dateSdf.format(parsed);
    } catch (ParseException e) {
        data.put("result", "失败：日期格式错误，请使用 yyyy-MM-dd 格式");
        data.put("date", dateParam);
        data.put("exception", e.getMessage());
        return data;
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

// 2. 查询该日期已存在哪些 device_code
String existSql = "SELECT device_code, elec_value FROM sjmg_electricity_daily_detail " +
        "WHERE stat_date = '" + escapeSql(targetDate) + "' " +
        "AND device_code IN ('SYSTEM','HP_HEAT','HP_COLD','PRIMARY_WP','SECONDARY_WP','OHNY')";
List<Map<String, Object>> existResult = dynamicDataSource.excuteTenantSqlQuery(existSql, dbCode);
Map<String, BigDecimal> existingMap = new HashMap<>();
if (existResult != null) {
    for (Map<String, Object> row : existResult) {
        if (row.get("device_code") != null) {
            String code = row.get("device_code").toString();
            BigDecimal val = BigDecimal.ZERO;
            if (row.get("elec_value") != null) {
                try {
                    val = new BigDecimal(row.get("elec_value").toString());
                } catch (Exception ignored) {
                }
            }
            existingMap.put(code, val);
        }
    }
}

// 3. 计算 23:55:00 - 23:59:59
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
String dayStart = timeSdf.format(rangeCal.getTime());
rangeCal.set(Calendar.MINUTE, 59);
rangeCal.set(Calendar.SECOND, 59);
String dayEnd = timeSdf.format(rangeCal.getTime());

// 4. 只补缺失点位，已有记录不动；无数据或异常时补 0
int inserted = 0;
int skippedExisting = 0;
int insertedZero = 0;
List<Map<String, Object>> resultList = new ArrayList<>();

for (int i = 0; i < deviceCodes.length; i++) {
    String deviceCode = deviceCodes[i];
    if (existingMap.containsKey(deviceCode)) {
        skippedExisting++;
        resultList.add([
            "device_code": deviceCode,
            "elec_value": existingMap.get(deviceCode).setScale(2, RoundingMode.HALF_UP).toPlainString()
        ]);
        continue;
    }

    BigDecimal maxValue = BigDecimal.ZERO;
    boolean hasData = false;
    try {
        String tagEscaped = deviceTags[i].replace("'", "''");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + dayStart + "' and a.endtime = '" + dayEnd + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        for (int j = 0; j < dt.getRows().size(); j++) {
            DataRow dataRow = dt.getDataRow(j);
            Object hisvalObj = dataRow.getValue(2);
            if (hisvalObj != null) {
                BigDecimal value = new BigDecimal(hisvalObj.toString());
                if (!hasData || value.compareTo(maxValue) > 0) {
                    maxValue = value;
                }
                hasData = true;
            }
        }
    } catch (Exception e) {
        // 异常时按无数据处理，补 0
        hasData = false;
        maxValue = BigDecimal.ZERO;
    }

    if (!hasData) {
        insertedZero++;
        maxValue = BigDecimal.ZERO;
    }

    BigDecimal storeValue = maxValue.setScale(2, RoundingMode.HALF_UP);
    try {
        String id = idWorker.nextId();
        String insertSql = "INSERT INTO sjmg_electricity_daily_detail (id, stat_date, device_code, elec_value) VALUES ('" +
                escapeSql(id) + "','" + escapeSql(targetDate) + "','" + escapeSql(deviceCode) + "','" + escapeSql(storeValue.toPlainString()) + "')";
        dynamicDataSource.excuteTenantSql(insertSql, dbCode);
        inserted++;
    } catch (Exception e) {
        data.put("result", "失败：写入 device_code=" + deviceCode + " 时发生异常");
        data.put("date", targetDate);
        data.put("exception", e.getMessage());
        return data;
    }

    resultList.add([
        "device_code": deviceCode,
        "elec_value": storeValue.toPlainString()
    ]);
}

data.put("result", "日电量查询成功，写入 " + inserted + " 条（其中补 0 " + insertedZero + " 条），跳过已存在 " + skippedExisting + " 条");
data.put("date", targetDate);
data.put("list", resultList);
data.put("inserted", inserted);
data.put("skippedExisting", skippedExisting);
data.put("insertedZero", insertedZero);

return data;
