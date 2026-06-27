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
// 如果项目类型是采暖，则判断是否在采暖季
if ("1".equals(projectTypeUuid) && !isno_season){
    data.put("result", "当前不在采暖季，不执行归档操作");
    data.put("currentTime", sdf.format(calendar.getTime()));
    data.put("startDate", sdf.format(startDate));
    data.put("endDate", sdf.format(endDate));
    return data;
}

// 每天0点计算日用电量并写入数据库
if (hour == 0) {
    SimpleDateFormat dateSdf = new SimpleDateFormat("yyyy-MM-dd");
    // 只处理昨天
    Calendar baseCal = Calendar.getInstance();
    baseCal.add(Calendar.DAY_OF_MONTH, -1);
    String yesterdayStr = dateSdf.format(baseCal.getTime());

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

    // 单次处理昨天
    String targetDate = yesterdayStr;

    // 1. 查询该日期已存在哪些 device_code
    String existSql = "SELECT device_code FROM sjmg_electricity_daily_detail " +
            "WHERE stat_date = '" + escapeSql(targetDate) + "' " +
            "AND device_code IN ('SYSTEM','HP_HEAT','HP_COLD','PRIMARY_WP','SECONDARY_WP','OHNY')";
    List<Map<String, Object>> existResult = dynamicDataSource.excuteTenantSqlQuery(existSql, dbCode);
    Set<String> existingCodes = new HashSet<>();
    if (existResult != null) {
        for (Map<String, Object> row : existResult) {
            if (row.get("device_code") != null) {
                existingCodes.add(row.get("device_code").toString());
            }
        }
    }
    if (existingCodes.size() >= 6) {
        totalSkippedExisting += 6;
        skippedExistingDates.add(targetDate);
    } else {
        // 2. 计算该日期的 23:55:00 - 23:59:59
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

        // 3. 只读取缺失点位的历史数据，缺失则补入（有效值或0），已有记录不动
        int dateInserted = 0;
        int dateInsertedWithData = 0;
        int dateInsertedZero = 0;
        int dateSkippedExisting = 0;
        for (int i = 0; i < deviceCodes.length; i++) {
            String deviceCode = deviceCodes[i];
            // 已存在则跳过，不刷新
            if (existingCodes.contains(deviceCode)) {
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

                String id = idWorker.nextId();
                String insertSql = "INSERT INTO sjmg_electricity_daily_detail (id, stat_date, device_code, elec_value) VALUES ('" +
                        escapeSql(id) + "','" + escapeSql(targetDate) + "','" + escapeSql(deviceCode) + "','" + escapeSql(maxValue.setScale(2, RoundingMode.HALF_UP).toPlainString()) + "')";
                dynamicDataSource.excuteTenantSql(insertSql, dbCode);
                totalInserted++;
                dateInserted++;
                if (hasData) {
                    totalInsertedWithData++;
                    dateInsertedWithData++;
                } else {
                    totalInsertedZero++;
                    dateInsertedZero++;
                }
            } catch (Exception e) {
                // 异常时仍补0，保证缺失点位有记录
                String id = idWorker.nextId();
                String insertSql = "INSERT INTO sjmg_electricity_daily_detail (id, stat_date, device_code, elec_value) VALUES ('" +
                        escapeSql(id) + "','" + escapeSql(targetDate) + "','" + escapeSql(deviceCode) + "','0.00')";
                dynamicDataSource.excuteTenantSql(insertSql, dbCode);
                totalInserted++;
                totalInsertedZero++;
                dateInserted++;
                dateInsertedZero++;
            }
        }
        if (dateInserted > 0 || dateSkippedExisting > 0) {
            processedDates.add(targetDate + "（写入" + dateInserted + "条，其中有效值" + dateInsertedWithData + "条、0值" + dateInsertedZero + "条，已存在跳过" + dateSkippedExisting + "条）");
        }
    }

    data.put("result", "日电量归档成功，共写入 " + totalInserted + " 条（有效值 " + totalInsertedWithData + " 条，0值 " + totalInsertedZero + " 条），跳过已存在 " + totalSkippedExisting + " 条");
    data.put("processedDates", processedDates);
    data.put("skippedExistingDates", skippedExistingDates);
} else {
    data.put("result", "非0点，不执行日电量归档");
}

return data;
