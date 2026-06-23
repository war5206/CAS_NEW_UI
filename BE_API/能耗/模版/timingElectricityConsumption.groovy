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

String selectAreaSql = "select project_type_uuid,project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, "t01");
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

// 每天0点计算月用电量、年用电量和采暖季用电量
if (hour == 0) {
    // 从PLC点位读取日用电量
    BigDecimal hpTotalDayHeating = BigDecimal.ZERO; // 热泵制热日电量
    BigDecimal hpTotalDayCooling = BigDecimal.ZERO; // 热泵制冷日电量
    BigDecimal primaryWpTotalDay = BigDecimal.ZERO; // 一次泵日电量
    BigDecimal secondaryWpTotalDay = BigDecimal.ZERO; // 二次泵日电量
    BigDecimal ohnyTotalDay = BigDecimal.ZERO; // 耦合能源日电量
    
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

    // 热泵制热日用电量点位
    String heatHPElecDayTag = "Sys\\FinforWorx\\EnergyCost\\HP_Heat_Daily_Energy_Consumption";
    try {
        String tagEscaped = heatHPElecDayTag.replace("'", "''");
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
        hpTotalDayHeating = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        hpTotalDayHeating = BigDecimal.ZERO;
    }
    
    // 热泵制冷日用电量点位
    String coolHPElecDayTag = "Sys\\FinforWorx\\EnergyCost\\HP_Cold_Daily_Energy_Consumption";
    try {
        String tagEscaped = coolHPElecDayTag.replace("'", "''");
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
        
        hpTotalDayCooling = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        hpTotalDayCooling = BigDecimal.ZERO;
    }
    
    // 一次泵日用电量点位
    String primaryWPElecDayTag = "Sys\\FinforWorx\\EnergyCost\\primary_WP_Daily_Energy_Consumption";
    try {
        String tagEscaped = primaryWPElecDayTag.replace("'", "''");
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
        primaryWpTotalDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        primaryWpTotalDay = BigDecimal.ZERO;
    }

    // 二次泵日用电量点位
    String secondaryWPElecDayTag = "Sys\\FinforWorx\\EnergyCost\\secondary_WP_Daily_Energy_Consumption";
    try {
        String tagEscaped = secondaryWPElecDayTag.replace("'", "''");
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
        secondaryWpTotalDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        secondaryWpTotalDay = BigDecimal.ZERO;
    }

    // 耦合能源日用电量点位
    String ohnyElecDayTag = "Sys\\FinforWorx\\EnergyCost\\OHNY_Daily_Energy_Consumption";
    try {
        String tagEscaped = ohnyElecDayTag.replace("'", "''");
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
        ohnyTotalDay = maxValue.setScale(2, RoundingMode.HALF_UP);
    } catch (Exception e) {
        ohnyTotalDay = BigDecimal.ZERO;
    }
    

    // 计算月用电量
    String hpTotalMonthHeatingTag = "Sys\\FinforWorx\\EnergyCost\\HP_Heat_Monthly_Energy_Consumption";
    String hpTotalMonthCoolingTag = "Sys\\FinforWorx\\EnergyCost\\HP_Cold_Monthly_Energy_Consumption";
    String primaryWpTotalMonthTag = "Sys\\FinforWorx\\EnergyCost\\primary_WP_Monthly_Energy_Consumption";
    String secondaryWpTotalMonthTag = "Sys\\FinforWorx\\EnergyCost\\secondary_WP_Monthly_Energy_Consumption";
    String ohnyTotalMonthTag = "Sys\\FinforWorx\\EnergyCost\\OHNY_Monthly_Energy_Consumption";
    
    String hpTotalMonthHeatingTagChart = "Sys\\FinforWorx\\EnergyCostChart\\HP_Heat_Monthly_Energy_Consumption_Chart";
    String hpTotalMonthCoolingTagChart = "Sys\\FinforWorx\\EnergyCostChart\\HP_Cold_Monthly_Energy_Consumption_Chart";
    String primaryWpTotalMonthTagChart = "Sys\\FinforWorx\\EnergyCostChart\\Primary_WP_Monthly_Energy_Consumption_Chart";
    String secondaryWpTotalMonthTagChart = "Sys\\FinforWorx\\EnergyCostChart\\Secondary_WP_Monthly_Energy_Consumption_Chart";
    String ohnyTotalMonthTagChart = "Sys\\FinforWorx\\EnergyCostChart\\OHNY_Monthly_Energy_Consumption_Chart";

    if (day_of_month == 2) {
        // 每月2号重置月用电量，重置为1号的日用电量
        writeData.put(hpTotalMonthHeatingTag, hpTotalDayHeating.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(hpTotalMonthCoolingTag, hpTotalDayCooling.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(primaryWpTotalMonthTag, primaryWpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(secondaryWpTotalMonthTag, secondaryWpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(ohnyTotalMonthTag, ohnyTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
    } else {
        // 其他日期累加月用电量
        // 热泵制热月用电量
        try {
            String monthTagEscaped = hpTotalMonthHeatingTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(hpTotalDayHeating).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(hpTotalMonthHeatingTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(hpTotalMonthHeatingTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        // 热泵制冷月用电量
        try {
            String monthTagEscaped = hpTotalMonthCoolingTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(hpTotalDayCooling).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(hpTotalMonthCoolingTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(hpTotalMonthCoolingTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        // 一次泵月用电量
        try {
            String monthTagEscaped = primaryWpTotalMonthTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(primaryWpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(primaryWpTotalMonthTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(primaryWpTotalMonthTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }

        // 二次泵月用电量
        try {
            String monthTagEscaped = secondaryWpTotalMonthTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(secondaryWpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(secondaryWpTotalMonthTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(secondaryWpTotalMonthTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }

        // 耦合能源月用电量
        try {
            String monthTagEscaped = ohnyTotalMonthTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + monthTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(ohnyTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(ohnyTotalMonthTag, newValue.toString());
                    if(day_of_month == 1){
                        writeData.put(ohnyTotalMonthTagChart, newValue.toString());
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
    String hpTotalYearHeatingTag = "Sys\\FinforWorx\\EnergyCost\\HP_Heat_Yearly_Energy_Consumption";
    String hpTotalYearCoolingTag = "Sys\\FinforWorx\\EnergyCost\\HP_Cold_Yearly_Energy_Consumption";
    String primaryWpTotalYearTag = "Sys\\FinforWorx\\EnergyCost\\primary_WP_Yearly_Energy_Consumption";
    String secondaryWpTotalYearTag = "Sys\\FinforWorx\\EnergyCost\\secondary_WP_Yearly_Energy_Consumption";
    String ohnyTotalYearTag = "Sys\\FinforWorx\\EnergyCost\\OHNY_Yearly_Energy_Consumption";
    
    String hpTotalYearHeatingTagChart = "Sys\\FinforWorx\\EnergyCostChart\\HP_Heat_Yearly_Energy_Consumption_Chart";
    String hpTotalYearCoolingTagChart = "Sys\\FinforWorx\\EnergyCostChart\\HP_Cold_Yearly_Energy_Consumption_Chart";
    String primaryWpTotalYearTagChart = "Sys\\FinforWorx\\EnergyCostChart\\Primary_WP_Yearly_Energy_Consumption_Chart";
    String secondaryWpTotalYearTagChart = "Sys\\FinforWorx\\EnergyCostChart\\Secondary_WP_Yearly_Energy_Consumption_Chart";
    String ohnyTotalYearTagChart = "Sys\\FinforWorx\\EnergyCostChart\\OHNY_Yearly_Energy_Consumption_Chart";
    if (day_of_month == 2 && monthOfYear == 1) {
        // 1月2号重置年用电量，重置为1号的日用电量
        writeData.put(hpTotalYearHeatingTag, hpTotalDayHeating.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(hpTotalYearCoolingTag, hpTotalDayCooling.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(primaryWpTotalYearTag, primaryWpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(secondaryWpTotalYearTag, secondaryWpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
        writeData.put(ohnyTotalYearTag, ohnyTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
    } else {
        // 其他日期累加年用电量
        // 热泵制热年用电量
        try {
            String yearTagEscaped = hpTotalYearHeatingTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(hpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(hpTotalYearHeatingTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(hpTotalYearHeatingTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        // 热泵制冷年用电量
        try {
            String yearTagEscaped = hpTotalYearCoolingTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(wshpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(hpTotalYearCoolingTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(hpTotalYearCoolingTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
        
        // 一次泵年用电量
        try {
            String yearTagEscaped = primaryWpTotalYearTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(wpTotalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(primaryWpTotalYearTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(primaryWpTotalYearTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }

        // 二次泵年用电量
        try {
            String yearTagEscaped = secondaryWpTotalYearTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(totalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(secondaryWpTotalYearTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(secondaryWpTotalYearTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }

        // 耦合能源年用电量
        try {
            String yearTagEscaped = ohnyTotalYearTag.replace("'", "''");
            String sql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + yearTagEscaped + "')";
            DataTable dt = dataService.queryListDataBySql(sql);
            if (dt.getRows().size() > 0) {
                DataRow dataRow = dt.getDataRow(0);
                Object realvalObj = dataRow.getValue(2);
                if (realvalObj != null) {
                    BigDecimal value = new BigDecimal(realvalObj.toString()).setScale(2, RoundingMode.HALF_UP);
                    BigDecimal newValue = value.add(totalDay).setScale(2, RoundingMode.HALF_UP);
                    writeData.put(ohnyTotalYearTag, newValue.toString());
                    if (day_of_month == 1 && monthOfYear == 1) {
                        writeData.put(ohnyTotalYearTagChart, newValue.toString());
                    }
                }
                // 如果realvalObj为null，不更新，保持原值，避免丢失之前的累计值
            }
            // 如果查询不到数据行，不更新，保持原值，避免丢失之前的累计值
        } catch (Exception e) {
            // 异常时，不更新，保持原值，避免丢失之前的累计值
        }
    }


    // 下置日数据到chart点位（使用已获取的日数据变量）
    String heatHPElecDayTagChart = "Sys\\FinforWorx\\EnergyCost\\HP_Heat_Daily_Energy_Consumption_Chart";
    String coolHPElecDayTagChart = "Sys\\FinforWorx\\EnergyCost\\HP_Cold_Daily_Energy_Consumption_Chart";
    String primaryWPElecDayTagChart = "Sys\\FinforWorx\\EnergyCost\\Primary_WP_Daily_Energy_Consumption_Chart";
    String secondaryWPElecDayTagChart = "Sys\\FinforWorx\\EnergyCost\\Secondary_WP_Daily_Energy_Consumption_Chart";
    String ohnyElecDayTagChart = "Sys\\FinforWorx\\EnergyCost\\OHNY_Daily_Energy_Consumption_Chart";

    if (hpTotalDayHeating != null) {
        writeData.put(heatHPElecDayTagChart, hpTotalDayHeating.setScale(2, RoundingMode.HALF_UP).toString());
    }
    if (hpTotalDayCooling != null) {
        writeData.put(coolHPElecDayTagChart, hpTotalDayCooling.setScale(2, RoundingMode.HALF_UP).toString());
    }
    if (primaryWpTotalDay != null) {
        writeData.put(primaryWPElecDayTagChart, primaryWpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
    }
    if (secondaryWpTotalDay != null) {
        writeData.put(secondaryWPElecDayTagChart, secondaryWpTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
    }
    if (ohnyTotalDay != null) {
        writeData.put(ohnyElecDayTagChart, ohnyTotalDay.setScale(2, RoundingMode.HALF_UP).toString());
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