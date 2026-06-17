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
import com.alibaba.fastjson.JSON;
import com.sunwayland.algorithm.feign.FeignSolAlgorithmProcess;
import com.sunwayland.algorithm.pojo.AlgorithmProcessExecuteParam
import com.sunwayland.common.core.constant.PlatformConst;
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dao.impl.PsSqlImpl;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;
import java.text.SimpleDateFormat;
import com.sunwayland.platform.utils.HttpRequest;
import com.sunwayland.platform.dao.data.DataRow;
import java.text.ParseException;
import java.text.DecimalFormat;
import java.math.BigDecimal;
import java.math.RoundingMode;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);
// 调用逻辑编排
FeignSolAlgorithmProcess sol = ApplicationContextProvider.getBean(FeignSolAlgorithmProcess.class);

String selectAreaSql = "select project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, "t01");
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

if (!isno_season){
    data.put("result", "当前不在采暖季，不执行下置操作");
    data.put("currentTime", sdf.format(calendar.getTime()));
    data.put("startDate", sdf.format(startDate));
    data.put("endDate", sdf.format(endDate));
    return;
}

// 逻辑编排参数
AlgorithmProcessExecuteParam param_write = new AlgorithmProcessExecuteParam();
Map<String, Object> paramMap_write = new HashMap();
param_write.setAlgorithmProcessId("writeRealvalByLongNames");
Map<String, Object> paramData_write = new HashMap();

Map<String,String> writeData = new HashMap<>();

// 下置小时数据到zizhi点位（获取上一个整点55-59:59的最大值）
// 计算上一个整点的时间范围：例如现在是1点，则查询0点55分-0点59分59秒
Calendar prevHourCalendar = Calendar.getInstance();
prevHourCalendar.set(Calendar.MINUTE, 0);
prevHourCalendar.set(Calendar.SECOND, 0);
prevHourCalendar.set(Calendar.MILLISECOND, 0);
prevHourCalendar.add(Calendar.HOUR_OF_DAY, -1);
// 上一个整点（例如：0点）
String prevHourStart = sdf.format(prevHourCalendar.getTime());
// 上一个整点的55分
prevHourCalendar.set(Calendar.MINUTE, 55);
prevHourCalendar.set(Calendar.SECOND, 0);
String prevHour55Start = sdf.format(prevHourCalendar.getTime());
// 上一个整点的59分59秒
prevHourCalendar.set(Calendar.MINUTE, 59);
prevHourCalendar.set(Calendar.SECOND, 59);
String prevHour59End = sdf.format(prevHourCalendar.getTime());

String hpElecHourTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_hour";
String hpElecHourZizhiTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_hour_zizhi";
try {
    String tagEscaped = hpElecHourTag.replace("'", "''");
    // 查询历史数据表，获取上一个整点55-59:59的最大值
    String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime = '" + prevHour55Start + "' and a.endtime = '" + prevHour59End + "' limitpage 1,999";
    
    DataTable dt = dataService.queryListDataBySql(sql);
    
    BigDecimal maxValue = BigDecimal.ZERO;
    for (int j = 0; j < dt.getRows().size(); j++) {
        DataRow dataRow = dt.getDataRow(j);
        Object hisvalObj = dataRow.getValue(2);
        if (hisvalObj != null) {
            BigDecimal value = new BigDecimal(hisvalObj.toString());
            if (value.compareTo(maxValue) > 0) {
                maxValue = value;
            }
        }
    }
    
    writeData.put(hpElecHourZizhiTag, maxValue.setScale(2, RoundingMode.HALF_UP).toString());
    
} catch (Exception e) {
    // 异常时跳过
}

String wpElecHourTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_hour";
String wpElecHourZizhiTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_hour_zizhi";
try {
    String tagEscaped = wpElecHourTag.replace("'", "''");
    // 查询历史数据表，获取上一个整点55-59:59的最大值
    String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime = '" + prevHour55Start + "' and a.endtime = '" + prevHour59End + "' limitpage 1,9999";
    
    DataTable dt = dataService.queryListDataBySql(sql);
    
    BigDecimal maxValue = BigDecimal.ZERO;
    for (int j = 0; j < dt.getRows().size(); j++) {
        DataRow dataRow = dt.getDataRow(j);
        Object hisvalObj = dataRow.getValue(2);
        if (hisvalObj != null) {
            BigDecimal value = new BigDecimal(hisvalObj.toString());
            if (value.compareTo(maxValue) > 0) {
                maxValue = value;
            }
        }
    }
    
    writeData.put(wpElecHourZizhiTag, maxValue.setScale(2, RoundingMode.HALF_UP).toString());

} catch (Exception e) {
    // 异常时跳过
}

String wshpElecHourTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_hour";
String wshpElecHourZizhiTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_hour_zizhi";
try {
    String tagEscaped = wshpElecHourTag.replace("'", "''");
    // 查询历史数据表，获取上一个整点55-59:59的最大值
    String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime = '" + prevHour55Start + "' and a.endtime = '" + prevHour59End + "' limitpage 1,9999";
    
    DataTable dt = dataService.queryListDataBySql(sql);
    
    BigDecimal maxValue = BigDecimal.ZERO;
    for (int j = 0; j < dt.getRows().size(); j++) {
        DataRow dataRow = dt.getDataRow(j);
        Object hisvalObj = dataRow.getValue(2);
        if (hisvalObj != null) {
            BigDecimal value = new BigDecimal(hisvalObj.toString());
            if (value.compareTo(maxValue) > 0) {
                maxValue = value;
            }
        }
    }

    writeData.put(wshpElecHourZizhiTag, maxValue.setScale(2, RoundingMode.HALF_UP).toString());

} catch (Exception e) {
    // 异常时跳过
}

String totalElecHourTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_hour";
String totalElecHourZizhiTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_hour_zizhi";
try {
    String tagEscaped = totalElecHourTag.replace("'", "''");
    // 查询历史数据表，获取上一个整点55-59:59的最大值
    String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime = '" + prevHour55Start + "' and a.endtime = '" + prevHour59End + "' limitpage 1,9999";
    
    DataTable dt = dataService.queryListDataBySql(sql);
    
    BigDecimal maxValue = BigDecimal.ZERO;
    for (int j = 0; j < dt.getRows().size(); j++) {
        DataRow dataRow = dt.getDataRow(j);
        Object hisvalObj = dataRow.getValue(2);
        if (hisvalObj != null) {
            BigDecimal value = new BigDecimal(hisvalObj.toString());
            if (value.compareTo(maxValue) > 0) {
                maxValue = value;
            }
        }
    }

    writeData.put(totalElecHourZizhiTag, maxValue.setScale(2, RoundingMode.HALF_UP).toString());

} catch (Exception e) {
    // 异常时跳过
}

// 每天0点计算月用电量、年用电量和采暖季用电量
if (hour == 0) {
    // 从PLC点位读取日用电量
    BigDecimal hpTotalDay = BigDecimal.ZERO;
    BigDecimal wshpTotalDay = BigDecimal.ZERO;
    BigDecimal wpTotalDay = BigDecimal.ZERO;
    BigDecimal totalDay = BigDecimal.ZERO;
    
    // 计算时间范围：昨天23:55到23:59:59
    Calendar calendar_now = Calendar.getInstance();
    calendar_now.add(Calendar.DAY_OF_MONTH, -1);
    calendar_now.set(Calendar.HOUR_OF_DAY, 23);
    calendar_now.set(Calendar.MINUTE, 55);
    calendar_now.set(Calendar.SECOND, 0);
    calendar_now.set(Calendar.MILLISECOND, 0);
    // 昨天23:55:00
    String lastday_start = sdf.format(calendar_now.getTime());
    calendar_now.set(Calendar.MINUTE, 59);
    calendar_now.set(Calendar.SECOND, 59);
    // 昨天23:59:59
    String lastday_end = sdf.format(calendar_now.getTime());

    // 热泵日用电量点位
    String hpElecDayTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_day";
    try {
        String tagEscaped = hpElecDayTag.replace("'", "''");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + lastday_start + "' and a.endtime = '" + lastday_end + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        BigDecimal maxValue = BigDecimal.ZERO;
        for (int j = 0; j < dt.getRows().size(); j++) {
            DataRow dataRow = dt.getDataRow(j);
            Object hisvalObj = dataRow.getValue(2);
            if (hisvalObj != null) {
                BigDecimal value = new BigDecimal(hisvalObj.toString());
                if (value.compareTo(maxValue) > 0) {
                    maxValue = value;
                }
            }
        }
        hpTotalDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        // 异常时保持为0
    }
    
    // 水泵日用电量点位
    String wpElecDayTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_day";
    try {
        String tagEscaped = wpElecDayTag.replace("'", "''");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + lastday_start + "' and a.endtime = '" + lastday_end + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        
        BigDecimal maxValue = BigDecimal.ZERO;
        for (int j = 0; j < dt.getRows().size(); j++) {
            DataRow dataRow = dt.getDataRow(j);
            Object hisvalObj = dataRow.getValue(2);
            if (hisvalObj != null) {
                BigDecimal value = new BigDecimal(hisvalObj.toString());
                if (value.compareTo(maxValue) > 0) {
                    maxValue = value;
                }
            }
        }
        
        wpTotalDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        // 异常时保持为0
    }
    
    // 水源热泵日用电量点位
    String wshpElecDayTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_day";
    try {
        String tagEscaped = wshpElecDayTag.replace("'", "''");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + lastday_start + "' and a.endtime = '" + lastday_end + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        BigDecimal maxValue = BigDecimal.ZERO;
        for (int j = 0; j < dt.getRows().size(); j++) {
            DataRow dataRow = dt.getDataRow(j);
            Object hisvalObj = dataRow.getValue(2);
            if (hisvalObj != null) {
                BigDecimal value = new BigDecimal(hisvalObj.toString());
                if (value.compareTo(maxValue) > 0) {
                    maxValue = value;
                }
            }
        }
        wshpTotalDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        // 异常时保持为0
    }

    // 总日用电量点位
    String totalElecDayTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_day";
    try {
        String tagEscaped = totalElecDayTag.replace("'", "''");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + lastday_start + "' and a.endtime = '" + lastday_end + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        BigDecimal maxValue = BigDecimal.ZERO;
        for (int j = 0; j < dt.getRows().size(); j++) {
            DataRow dataRow = dt.getDataRow(j);
            Object hisvalObj = dataRow.getValue(2);
            if (hisvalObj != null) {
                BigDecimal value = new BigDecimal(hisvalObj.toString());
                if (value.compareTo(maxValue) > 0) {
                    maxValue = value;
                }
            }
        }
        totalDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        // 异常时保持为0
    }
    
    // 计算月用电量
    String hpTotalMonthTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_month";
    String wshpTotalMonthTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_month";
    String wpTotalMonthTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_month";
    String totalMonthTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_month";
    
    String hpTotalMonthZizhiTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_month_zizhi";
    String wshpTotalMonthZizhiTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_month_zizhi";
    String wpTotalMonthZizhiTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_month_zizhi";
    String totalMonthZizhiTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_month_zizhi";
    if (day_of_month == 2) {    
        // 每月2号重置月用电量，重置为1号的日用电量
        writeData.put(hpTotalMonthTag, hpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(wshpTotalMonthTag, wshpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(wpTotalMonthTag, wpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(totalMonthTag, totalDay.setScale(2, RoundingMode.HALF_UP).toString());
    } else {
        // 其他日期累加月用电量
        try {
            String monthTagEscaped = hpTotalMonthTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(hpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(hpTotalMonthTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(hpTotalMonthZizhiTag, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String monthTagEscaped = wshpTotalMonthTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(wshpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(wshpTotalMonthTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(wshpTotalMonthZizhiTag, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String monthTagEscaped = wpTotalMonthTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(wpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(wpTotalMonthTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(wpTotalMonthZizhiTag, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }

        try {
            String monthTagEscaped = totalMonthTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(totalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(totalMonthTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(totalMonthZizhiTag, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
    }
    
    // 计算年用电量
    String hpTotalYearTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_year";
    String wshpTotalYearTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_year";
    String wpTotalYearTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_year";
    String totalYearTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_year";

    String hpTotalYearZizhiTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_year_zizhi";
    String wshpTotalYearZizhiTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_year_zizhi";
    String wpTotalYearZizhiTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_year_zizhi";
    String totalYearZizhiTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_year_zizhi";
    if (day_of_month == 2 && monthOfYear == 1) {
        // 1月2号重置年用电量，重置为1号的日用电量
        writeData.put(hpTotalYearTag, hpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(wshpTotalYearTag, wshpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(wpTotalYearTag, wpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(totalYearTag, totalDay.setScale(2, RoundingMode.HALF_UP).toString());
    } else {
        // 其他日期累加年用电量
        try {
            String yearTagEscaped = hpTotalYearTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(hpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(hpTotalYearTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(hpTotalYearZizhiTag, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String yearTagEscaped = wshpTotalYearTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(wshpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(wshpTotalYearTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(wshpTotalYearZizhiTag, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String yearTagEscaped = wpTotalYearTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(wpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(wpTotalYearTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(wpTotalYearZizhiTag, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }

        try {
            String yearTagEscaped = totalYearTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(totalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(totalYearTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(totalYearZizhiTag, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
    }
    
    // 计算采暖季用电量
    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
    String currentDateStr = dateFormat.format(calendar.getTime());
    String startDateStr = dateFormat.format(startDate);
    boolean isFirstDayOfSeason = currentDateStr.equals(startDateStr);
    String hpTotalSeasonTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_season";
    String wshpTotalSeasonTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_season";
    String wpTotalSeasonTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_season";
    String totalSeasonTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_season";
    
    if (isFirstDayOfSeason) {
        // 采暖季第一天，重置为当天的日用电量
        writeData.put(hpTotalSeasonTag, hpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(wshpTotalSeasonTag, wshpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(wpTotalSeasonTag, wpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(totalSeasonTag, totalDay.setScale(2, RoundingMode.HALF_UP).toString());
    } else {
        // 非采暖季第一天，累加采暖季用电量
        try {
            String seasonTagEscaped = hpTotalSeasonTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + seasonTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(hpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(hpTotalSeasonTag, newValue.toString());
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String seasonTagEscaped = wshpTotalSeasonTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + seasonTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(wshpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(wshpTotalSeasonTag, newValue.toString());
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String seasonTagEscaped = wpTotalSeasonTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + seasonTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(wpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(wpTotalSeasonTag, newValue.toString());
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String seasonTagEscaped = totalSeasonTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + seasonTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(totalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(totalSeasonTag, newValue.toString());
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
    }
    
    // 下置日数据到zizhi点位（使用已获取的日数据变量）
    String hpElecDayZizhiTag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_day_zizhi";
    String wpElecDayZizhiTag = "Sys\\FinforWorx\\EC\\WP_Total_Meter_Elec_Consumption_day_zizhi";
    String wshpElecDayZizhiTag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_day_zizhi";
    String totalElecDayZizhiTag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_day_zizhi";
    if (hpTotalDay != null) {
        writeData.put(hpElecDayZizhiTag, hpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
    }
    if (wpTotalDay != null) {
        writeData.put(wpElecDayZizhiTag, wpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
    }
    if (wshpTotalDay != null) {
        writeData.put(wshpElecDayZizhiTag, wshpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
    }
    if (totalDay != null) {
        writeData.put(totalElecDayZizhiTag, totalDay.setScale(2, RoundingMode.HALF_UP).toString());
    }
}

// 执行下置业务编排（只有当writeData不为空时才执行）
if (writeData != null && writeData.size() > 0) {
    paramMap_write.put("writeData", JSON.toJSONString(writeData));
    paramData_write.put("data", paramMap_write);
    param_write.setParam(paramData_write);
    try {
        sol.execute(param_write);
        data.put("result", "下置成功，共下置 " + writeData.size() + " 个点位");
        data.put("writeData", writeData);
    } catch (Exception e) {
        data.put("result", "下置执行异常: " + e.getMessage());
        data.put("writeData", writeData);
    }
} else {
    data.put("result", "没有数据需要下置，writeData为空");
    data.put("writeData", writeData);
}
return data;