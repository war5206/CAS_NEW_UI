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

//每小时热量点长名
String tag_long_name_hour_1 = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_hour";
String tag_long_name_hour_2 = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_hour";
//每天热量点长名
String tag_long_name_day_1 = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_day";
String tag_long_name_day_2 = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_day";
//每月热量点长名
String tag_long_name_month_1 = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_month";
String tag_long_name_month_2 = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_month";
//每年热量点长名
String tag_long_name_year_1 = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_year";
String tag_long_name_year_2 = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_year";
//采暖季热量点长名
String tag_long_name_season_1 = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_season";
String tag_long_name_season_2 = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_season";

Map<String,String> writeData = new HashMap<>();

// 下置小时数据到zizhi点位（获取上一个整点55-59:59的最大值）
// 计算上一个整点的时间范围：例如现在是1点，则查询0点55分-0点59分59秒
Calendar prevHourCalendar = Calendar.getInstance();
prevHourCalendar.set(Calendar.MINUTE, 0);
prevHourCalendar.set(Calendar.SECOND, 0);
prevHourCalendar.set(Calendar.MILLISECOND, 0);
prevHourCalendar.add(Calendar.HOUR_OF_DAY, -1);
// 上一个整点的55分
prevHourCalendar.set(Calendar.MINUTE, 55);
prevHourCalendar.set(Calendar.SECOND, 0);
String prevHour55Start = sdf.format(prevHourCalendar.getTime());
// 上一个整点的59分59秒
prevHourCalendar.set(Calendar.MINUTE, 59);
prevHourCalendar.set(Calendar.SECOND, 59);
String prevHour59End = sdf.format(prevHourCalendar.getTime());

String heatMeter1HourTag = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_hour";
String heatMeter1HourZizhiTag = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_hour_zizhi";
try {
    String tagEscaped = heatMeter1HourTag.replace("'", "''");
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

    writeData.put(heatMeter1HourZizhiTag, maxValue.setScale(2, RoundingMode.HALF_UP).toString());

} catch (Exception e) {
    // 异常时跳过，记录异常信息到返回数据中
    if (data.get("debugInfo") == null) {
        data.put("debugInfo", new ArrayList<Map<String, Object>>());
    }
    Map<String, Object> errorInfo = new HashMap<>();
    errorInfo.put("tag", heatMeter1HourTag);
    errorInfo.put("error", e.getMessage());
    ((List<Map<String, Object>>)data.get("debugInfo")).add(errorInfo);
}

String heatMeter2HourTag = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_hour";
String heatMeter2HourZizhiTag = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_hour_zizhi";
try {
    String tagEscaped = heatMeter2HourTag.replace("'", "''");
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
    writeData.put(heatMeter2HourZizhiTag, maxValue.setScale(2, RoundingMode.HALF_UP).toString());
} catch (Exception e) {
    // 异常时跳过，记录异常信息到返回数据中
    if (data.get("debugInfo") == null) {
        data.put("debugInfo", new ArrayList<Map<String, Object>>());
    }
    Map<String, Object> errorInfo = new HashMap<>();
    errorInfo.put("tag", heatMeter2HourTag);
    errorInfo.put("error", e.getMessage());
    ((List<Map<String, Object>>)data.get("debugInfo")).add(errorInfo);
}

// 每天0点计算月热量、年热量和采暖季热量
if (hour == 0) {
    // 从系统点位读取日热量（查询历史数据表）
    BigDecimal primaryHeatDay = BigDecimal.ZERO;
    BigDecimal secondHeatDay = BigDecimal.ZERO;
    
    // 计算时间范围：昨天23:55到昨天23:59:59
    Calendar calendar_now = Calendar.getInstance();
    calendar_now.set(Calendar.MINUTE, 0);
    calendar_now.set(Calendar.SECOND, 0);
    calendar_now.set(Calendar.MILLISECOND, 0);
    calendar_now.add(Calendar.DAY_OF_MONTH, -1);
    // 昨天23:55:00
    calendar_now.set(Calendar.HOUR_OF_DAY, 23);
    calendar_now.set(Calendar.MINUTE, 55);
    calendar_now.set(Calendar.SECOND, 0);
    String lastday_start = sdf.format(calendar_now.getTime());
    // 昨天23:59:59
    calendar_now.set(Calendar.MINUTE, 59);
    calendar_now.set(Calendar.SECOND, 59);
    String lastday_end = sdf.format(calendar_now.getTime());
    
    try {
        String tagEscaped = tag_long_name_day_1.replace("'", "''");
        // 查询历史数据表，使用starttime和endtime字段
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime ='" + lastday_start + "' and a.endtime = '" + lastday_end + "' limitpage 1,9999";
        DataTable dt = dataService.queryListDataBySql(sql);
        // 取最大值
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
        primaryHeatDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        // 异常时保持为0
    }
    
    try {
        String tagEscaped = tag_long_name_day_2.replace("'", "''");
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
        secondHeatDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        // 异常时保持为0
    }

    // 计算月热量
    if (day_of_month == 2) {
        // 每月2号重置月热量，重置为1号的日热量
        writeData.put(tag_long_name_month_1, primaryHeatDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(tag_long_name_month_2, secondHeatDay.setScale(2, RoundingMode.HALF_UP).toString());
    } else {
        String heatMeter1MonthZizhiTag = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_month_zizhi";
        String heatMeter2MonthZizhiTag = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_month_zizhi";
        // 其他日期累加月热量
        try {
            String monthTagEscaped = tag_long_name_month_1.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(primaryHeatDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(tag_long_name_month_1, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(heatMeter1MonthZizhiTag, newValue.toString());
                    }
                }
            }
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String monthTagEscaped = tag_long_name_month_2.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(secondHeatDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(tag_long_name_month_2, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(heatMeter2MonthZizhiTag, newValue.toString());
                    }
                }
            }
        } catch (Exception e) {
           // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
    }
    
    // 计算年热量
    if (day_of_month == 2 && monthOfYear == 1) {
        // 1月2号重置年热量，重置为1号的日热量
        writeData.put(tag_long_name_year_1, primaryHeatDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(tag_long_name_year_2, secondHeatDay.setScale(2, RoundingMode.HALF_UP).toString());
    } else {
        String heatMeter1YearZizhiTag = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_year_zizhi";
        String heatMeter2YearZizhiTag = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_year_zizhi";
        // 其他日期累加年热量
        try {
            String yearTagEscaped = tag_long_name_year_1.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(primaryHeatDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(tag_long_name_year_1, newValue.toString());
                    if(day_of_month == 1 && monthOfYear == 1){
                        writeData.put(heatMeter1YearZizhiTag, newValue.toString());
                    }
                }
            }
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String yearTagEscaped = tag_long_name_year_2.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(tag_long_name_year_2, value.add(secondHeatDay).setScale(2, RoundingMode.HALF_UP).toString());
                    if(day_of_month == 1 && monthOfYear == 1){
                        writeData.put(heatMeter2YearZizhiTag, value.add(secondHeatDay).setScale(2, RoundingMode.HALF_UP).toString());
                    }
                }
            }
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
    }
    
    // 计算采暖季热量
    SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
    String currentDateStr = dateFormat.format(calendar.getTime());
    String startDateStr = dateFormat.format(startDate);
    boolean isFirstDayOfSeason = currentDateStr.equals(startDateStr);
    
    if (isFirstDayOfSeason) {
        // 采暖季第一天，重置为当天的日热量
        writeData.put(tag_long_name_season_1, primaryHeatDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(tag_long_name_season_2, secondHeatDay.setScale(2, RoundingMode.HALF_UP).toString());
    } else {
        // 非采暖季第一天，累加采暖季热量
        try {
            String seasonTagEscaped = tag_long_name_season_1.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + seasonTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(tag_long_name_season_1, value.add(primaryHeatDay).setScale(2, RoundingMode.HALF_UP).toString());
                }
            }
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        try {
            String seasonTagEscaped = tag_long_name_season_2.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + seasonTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(tag_long_name_season_2, value.add(secondHeatDay).setScale(2, RoundingMode.HALF_UP).toString());
                }
            }
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
    }

    // 下置日数据到zizhi点位（使用已获取的日数据变量）
    String heatMeter1DayZizhiTag = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_day_zizhi";
    String heatMeter2DayZizhiTag = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_day_zizhi";
    
    if (primaryHeatDay != null) {
        writeData.put(heatMeter1DayZizhiTag, primaryHeatDay.setScale(2, RoundingMode.HALF_UP).toString());
    }
    if (secondHeatDay != null) {
        writeData.put(heatMeter2DayZizhiTag, secondHeatDay.setScale(2, RoundingMode.HALF_UP).toString());
    }
}

// 执行下置业务编排（只有当writeData不为空时才执行）
if (writeData != null && writeData.size() > 0) {
    paramMap_write.put("writeData", JSON.toJSONString(writeData));
    paramData_write.put("data", paramMap_write);
    param_write.setParam(paramData_write);
    sol.execute(param_write);
    data.put("result", "下置成功，共下置 " + writeData.size() + " 个点位");
    data.put("writeData", writeData);
} else {
    data.put("result", "没有数据需要下置，writeData为空");
    data.put("writeData", writeData);
}
return data;