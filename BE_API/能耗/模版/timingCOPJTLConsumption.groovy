// 定时COP计算
/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
 */
// new
// 每小时计算COP统计信息（热泵COP、水源热泵COP、系统COP）
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

String selectAreaSql = "select project_type_uuid,system_type_uuid,project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, "t01");
String projectTypeUuid = selectAreaList.get(0).get("project_type_uuid").toString(); // 1采暖，2冷暖
String systemTypeUuid = selectAreaList.get(0).get("system_type_uuid").toString(); // 1一次系统，2二次系统
String start_heating_season = selectAreaList.get(0).get("start_heating_season").toString(); // 采暖季开始时间
String end_heating_season = selectAreaList.get(0).get("end_heating_season").toString(); // 采暖季结束时间
SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"); // 时间格式化
Calendar calendar = new GregorianCalendar(); // 日历对象
int year = calendar.get(Calendar.YEAR); // 当前年份
int day_of_month = calendar.get(Calendar.DAY_OF_MONTH); // 当前日期
int hour = calendar.get(Calendar.HOUR_OF_DAY); // 当前小时
int monthOfYear = calendar.get(Calendar.MONTH)+1; // 当前月份

// 采暖季是跨年的
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
    data.put("result", "当前不在采暖季，不执行下置操作");
    data.put("currentTime", sdf.format(calendar.getTime()));
    data.put("startDate", sdf.format(startDate));
    data.put("endDate", sdf.format(endDate));
    return;
}

// 逻辑编排参数（用于下置数据）
AlgorithmProcessExecuteParam param_write_hour = new AlgorithmProcessExecuteParam();
Map<String, Object> paramMap_write_hour = new HashMap();
param_write_hour.setAlgorithmProcessId("writeRealvalByLongNames");
Map<String, Object> paramData_write_hour = new HashMap();

// 下置小时数据到zizhi点位
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

// 辅助函数：从历史数据中获取上一个整点55-59:59的值中靠近59:59的大于1的值
def getValueFromHistory(String tagName, String startTime, String endTime, DataService dataService) {
    // // 初始化调试信息
    // if (data.get("debugInfo") == null) {
    //     data.put("debugInfo", new ArrayList<Map<String, Object>>());
    // }
    // List<Map<String, Object>> debugList = (List<Map<String, Object>>)data.get("debugInfo");
    // 
    // Map<String, Object> debugEntry = new HashMap<>();
    // debugEntry.put("function", "getValueFromHistory");
    // debugEntry.put("tagName", tagName);
    // debugEntry.put("startTime", startTime);
    // debugEntry.put("endTime", endTime);
    // debugEntry.put("steps", new ArrayList<Map<String, Object>>());
    // List<Map<String, Object>> steps = (List<Map<String, Object>>)debugEntry.get("steps");
    
    try {
        String tagEscaped = tagName.replace("'", "''");
        
        // // 步骤1：构建SQL
        // Map<String, Object> step1 = new HashMap<>();
        // step1.put("step", "1-构建SQL");
        String sql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + tagEscaped + "') and a.starttime = '" + startTime + "' and a.endtime = '" + endTime + "' limitpage 1,9999";
        // step1.put("sql", sql);
        // steps.add(step1);
        
        // // 步骤2：执行查询
        // Map<String, Object> step2 = new HashMap<>();
        // step2.put("step", "2-执行查询");
        DataTable dt = dataService.queryListDataBySql(sql);
        int rowCount = dt != null ? dt.getRows().size() : 0;
        // step2.put("rowCount", rowCount);
        // step2.put("hasData", rowCount > 0);
        // steps.add(step2);
        
        if (rowCount == 0) {
            // debugEntry.put("result", "未查询到数据");
            // debugEntry.put("reason", "SQL查询返回0条记录");
            // debugList.add(debugEntry);
            return null;
        }
        
        // // 步骤3：遍历数据查找大于1的值
        // Map<String, Object> step3 = new HashMap<>();
        // step3.put("step", "3-遍历数据");
        BigDecimal threshold = new BigDecimal("1");
        // List<Map<String, Object>> checkedValues = new ArrayList<>();
        
        for (int j = dt.getRows().size() - 1; j >= 0; j--) {
            DataRow dataRow = dt.getDataRow(j);
            Object hisvalObj = dataRow.getValue(2);
            // Object timeObj = dataRow.getValue(1);
            
            // Map<String, Object> valueInfo = new HashMap<>();
            // valueInfo.put("index", j);
            // valueInfo.put("time", timeObj != null ? timeObj.toString() : "null");
            // valueInfo.put("hisval", hisvalObj != null ? hisvalObj.toString() : "null");
            
            if (hisvalObj != null) {
                try {
                    BigDecimal value = new BigDecimal(hisvalObj.toString());
                    // valueInfo.put("value", value.toString());
                    // valueInfo.put("compareTo1", value.compareTo(threshold));
                    // valueInfo.put("isGreaterThan1", value.compareTo(threshold) > 0);
                    
                    // 找到大于1的值，返回（因为从后往前遍历，这是最靠近59:59的）
                    if (value.compareTo(threshold) > 0) {
                        BigDecimal result = value.setScale(2, RoundingMode.HALF_UP);
                        // step3.put("checkedCount", checkedValues.size() + 1);
                        // step3.put("foundValue", result.toString());
                        // step3.put("foundAtTime", timeObj != null ? timeObj.toString() : "null");
                        // step3.put("checkedValues", checkedValues);
                        // steps.add(step3);
                        // debugEntry.put("result", "成功找到值");
                        // debugEntry.put("foundValue", result.toString());
                        // debugList.add(debugEntry);
                        return result;
                    }
                } catch (NumberFormatException nfe) {
                    // valueInfo.put("error", "数值转换失败: " + nfe.getMessage());
                }
            } else {
                // valueInfo.put("error", "hisval为null");
            }
            // checkedValues.add(valueInfo);
        }
        
        // step3.put("checkedCount", checkedValues.size());
        // step3.put("foundValue", null);
        // step3.put("reason", "所有值都小于等于1或为null");
        // step3.put("checkedValues", checkedValues);
        // steps.add(step3);
        // debugEntry.put("result", "未找到大于1的值");
        // debugEntry.put("reason", "遍历了" + checkedValues.size() + "条数据，所有值都小于等于1或为null");
        // debugList.add(debugEntry);
        
    } catch (Exception e) {
        // // 异常时记录详细信息
        // Map<String, Object> errorStep = new HashMap<>();
        // errorStep.put("step", "异常");
        // errorStep.put("errorType", e.getClass().getName());
        // errorStep.put("errorMessage", e.getMessage() != null ? e.getMessage() : e.toString());
        // errorStep.put("stackTrace", getStackTrace(e));
        // steps.add(errorStep);
        // debugEntry.put("result", "执行异常");
        // debugEntry.put("error", e.getMessage() != null ? e.getMessage() : e.toString());
        // debugList.add(debugEntry);
    }
    return null;
}

// // 辅助函数：获取异常堆栈信息
// def getStackTrace(Exception e) {
//     StringWriter sw = new StringWriter();
//     PrintWriter pw = new PrintWriter(sw);
//     e.printStackTrace(pw);
//     return sw.toString();
// }


// 每天0点计算月/年/采暖季COP
if (hour == 0) {
    // 下置日数据到chart点位
    // 逻辑编排参数（用于下置日数据）
    AlgorithmProcessExecuteParam param_write_day = new AlgorithmProcessExecuteParam();
    Map<String, Object> paramMap_write_day = new HashMap();
    param_write_day.setAlgorithmProcessId("writeRealvalByLongNames");
    Map<String, Object> paramData_write_day = new HashMap();
    Map<String,String> writeData_day = new HashMap<>();

    // 计算昨天23点55-59:59的时间范围（因为是在0点执行，所以获取昨天23点的数据）
    Calendar prevDay23HourCalendar = Calendar.getInstance();
    prevDay23HourCalendar.set(Calendar.HOUR_OF_DAY, 23);
    prevDay23HourCalendar.set(Calendar.MINUTE, 55);
    prevDay23HourCalendar.set(Calendar.SECOND, 0);
    prevDay23HourCalendar.set(Calendar.MILLISECOND, 0);
    prevDay23HourCalendar.add(Calendar.DAY_OF_MONTH, -1);
    String prevDay23Hour55Start = sdf.format(prevDay23HourCalendar.getTime());
    prevDay23HourCalendar.set(Calendar.MINUTE, 59);
    prevDay23HourCalendar.set(Calendar.SECOND, 59);
    String prevDay23Hour59End = sdf.format(prevDay23HourCalendar.getTime());

    // 1. 制热日COP
    String heatDailyCOP = "Sys\\FinforWorx\\EnergyCost\\Heat_Daily_COP";
    String heatDailyCOPTagChart = "Sys\\FinforWorx\\EnergyCostChart\\Heat_Daily_COP_Chart";
    try {
        BigDecimal value = getValueFromHistory(heatDailyCOP, prevDay23Hour55Start, prevDay23Hour59End, dataService);
        if (value != null) {
            writeData_day.put(heatDailyCOPTagChart, value.toString());
        }
    } catch (Exception e) {

    }

    // 2. 制冷日COP
    String coldDailyCOP = "Sys\\FinforWorx\\EnergyCost\\Cold_Daily_COP";
    String coldDailyCOPTagChart = "Sys\\FinforWorx\\EnergyCostChart\\Cold_Daily_COP_Chart";
    try {
        BigDecimal value = getValueFromHistory(coldDailyCOP, prevDay23Hour55Start, prevDay23Hour59End, dataService);
        if (value != null) {
            writeData_day.put(coldDailyCOPTagChart, value.toString());
        }
    } catch (Exception e) {

    }

    // 3. 系统日COP
    String systemDailyCOP = "Sys\\FinforWorx\\EnergyCost\\System_Daily_COP";
    String systemDailyCOPTagChart = "Sys\\FinforWorx\\EnergyCostChart\\System_Daily_COP_Chart";
    try {
        BigDecimal value = getValueFromHistory(systemDailyCOP, prevDay23Hour55Start, prevDay23Hour59End, dataService);
        if (value != null) {
            writeData_day.put(systemDailyCOPTagChart, value.toString());
        }
    } catch (Exception e) {

    }

    // 执行日数据下置
    if (!writeData_day.isEmpty()) {
        paramMap_write_day.put("writeData", JSON.toJSONString(writeData_day));
        paramData_write_day.put("data", paramMap_write_day);
        param_write_day.setParam(paramData_write_day);
        sol.execute(param_write_day);
        if (data.get("result") == null) {
            data.put("result", "日COP下置成功，共下置 " + writeData_day.size() + " 个点位");
        } else {
            data.put("result", data.get("result") + "；日COP下置成功，共下置 " + writeData_day.size() + " 个点位");
        }
        data.put("writeData_day", writeData_day);
    } else {
        if (data.get("result") == null) {
            data.put("result", "日COP：没有数据需要下置，writeData_day为空");
        } else {
            data.put("result", data.get("result") + "；日COP：没有数据需要下置，writeData_day为空");
        }
    }

    if (day_of_month == 1) {
        // 构建需要查询的点名列表（从实时数据表读取）
        StringBuilder tagList = new StringBuilder();

        // 读取月/年/采暖季的点名
        // 月电量和热量点名
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\System_Monthly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\HP_Heat_Monthly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\HP_Cold_Monthly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Primary_WP_Monthly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Secondary_WP_Monthly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\OHNY_Monthly_Energy_Consumption_Chart',");

        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Primary_System_Monthly_Heating_Energy_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Primary_System_Monthly_Cooling_Energy_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Secondary_System_Monthly_Heating_Energy_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Secondary_System_Monthly_Cooling_Energy_Chart',");


        // 年电量和热量点名
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\System_Yearly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\HP_Heat_Yearly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\HP_Cold_Yearly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Primary_WP_Yearly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Secondary_WP_Yearly_Energy_Consumption_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\OHNY_Yearly_Energy_Consumption_Chart',");

        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Primary_System_Yearly_Heating_Energy_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Primary_System_Yearly_Cooling_Energy_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Secondary_System_Yearly_Heating_Energy_Chart',");
        tagList.append("'Sys\\FinforWorx\\EnergyCostChart\\Secondary_System_Yearly_Cooling_Energy_Chart',");

        tagList.delete(tagList.length() - 1, tagList.length());

        String real_day_sql="select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in (" + tagList.toString() + ")";

        Map<String,String> tagrealmap=new HashMap<>();
        //
        DataTable dt = dataService.queryListDataBySql(real_day_sql);
        for (int i = 0; i<dt.getRows().size(); i++){
            DataRow dataRow = dt.getDataRow(i);
            String tagName = dataRow.getValue(0).toString();
            String realval = dataRow.getValue(2) != null ? dataRow.getValue(2).toString() : "0.00";
            tagrealmap.put(tagName, realval);
        }

        // 逻辑编排参数
        AlgorithmProcessExecuteParam param_write = new AlgorithmProcessExecuteParam();
        Map<String, Object> paramMap_write = new HashMap();
        param_write.setAlgorithmProcessId("writeRealvalByLongNames");
        Map<String, Object> paramData_write = new HashMap();
        Map<String,String> writeData = new HashMap<>();
        DecimalFormat df = new DecimalFormat("0.00");

        // ========== 计算月COP ==========
        String system_monthly_energy_consumption_chart = "Sys\\FinforWorx\\EnergyCostChart\\System_Monthly_Energy_Consumption_Chart";
        String hp_heat_monthly_energy_consumption_chart = "Sys\\FinforWorx\\EnergyCostChart\\HP_Heat_Monthly_Energy_Consumption_Chart";
        String hp_cold_monthly_energy_consumption_chart = "Sys\\FinforWorx\\EnergyCostChart\\HP_Cold_Monthly_Energy_Consumption_Chart";
        String primary_wp_monthly_energy_consumption_chart = "Sys\\FinforWorx\\EnergyCostChart\\Primary_WP_Monthly_Energy_Consumption_Chart";
        String secondary_wp_monthly_energy_consumption_chart = "Sys\\FinforWorx\\EnergyCostChart\\Secondary_WP_Monthly_Energy_Consumption_Chart";
        String ohny_monthly_energy_consumption_chart = "Sys\\FinforWorx\\EnergyCostChart\\OHNY_Monthly_Energy_Consumption_Chart";
        String primary_system_monthly_heating_energy_chart = "Sys\\FinforWorx\\EnergyCostChart\\Primary_System_Monthly_Heating_Energy_Chart";
        String primary_system_monthly_cooling_energy_chart = "Sys\\FinforWorx\\EnergyCostChart\\Primary_System_Monthly_Cooling_Energy_Chart";
        String secondary_system_monthly_heating_energy_chart = "Sys\\FinforWorx\\EnergyCostChart\\Secondary_System_Monthly_Heating_Energy_Chart";
        String secondary_system_monthly_cooling_energy_chart = "Sys\\FinforWorx\\EnergyCostChart\\Secondary_System_Monthly_Cooling_Energy_Chart";

        BigDecimal system_monthly_energy_consumption = new BigDecimal("0.00");
        BigDecimal hp_heat_monthly_energy_consumption = new BigDecimal("0.00");
        BigDecimal hp_cold_monthly_energy_consumption = new BigDecimal("0.00");
        BigDecimal primary_wp_monthly_energy_consumption = new BigDecimal("0.00");
        BigDecimal secondary_wp_monthly_energy_consumption = new BigDecimal("0.00");
        BigDecimal ohny_monthly_energy_consumption = new BigDecimal("0.00");
        BigDecimal primary_system_monthly_heating_energy = new BigDecimal("0.00");
        BigDecimal primary_system_monthly_cooling_energy = new BigDecimal("0.00");
        BigDecimal secondary_system_monthly_heating_energy = new BigDecimal("0.00");
        BigDecimal secondary_system_monthly_cooling_energy = new BigDecimal("0.00");
        
        // 系统月总电量
        if (tagrealmap.containsKey(system_monthly_energy_consumption_chart)) {
            system_monthly_energy_consumption = new BigDecimal(tagrealmap.get(system_monthly_energy_consumption_chart));
        }
        // 热泵制热月总电量
        if (tagrealmap.containsKey(hp_heat_monthly_energy_consumption_chart)) {
            hp_heat_monthly_energy_consumption = new BigDecimal(tagrealmap.get(hp_heat_monthly_energy_consumption_chart));
        }
        // 热泵制冷月总电量
        if (tagrealmap.containsKey(hp_cold_monthly_energy_consumption_chart)) {
            hp_cold_monthly_energy_consumption = new BigDecimal(tagrealmap.get(hp_cold_monthly_energy_consumption_chart));
        }
        // 一次泵月总电量
        if (tagrealmap.containsKey(primary_wp_monthly_energy_consumption_chart)) {
            primary_wp_monthly_energy_consumption = new BigDecimal(tagrealmap.get(primary_wp_monthly_energy_consumption_chart));
        }
        // 二次泵月总电量
        if (tagrealmap.containsKey(secondary_wp_monthly_energy_consumption_chart)) {
            secondary_wp_monthly_energy_consumption = new BigDecimal(tagrealmap.get(secondary_wp_monthly_energy_consumption_chart));
        }
        // 耦合能源月总电量
        if (tagrealmap.containsKey(ohny_monthly_energy_consumption_chart)) {
            ohny_monthly_energy_consumption = new BigDecimal(tagrealmap.get(ohny_monthly_energy_consumption_chart));
        }
        // 一次系统月制热量
        if (tagrealmap.containsKey(primary_system_monthly_heating_energy_chart)) {
            primary_system_monthly_heating_energy = new BigDecimal(tagrealmap.get(primary_system_monthly_heating_energy_chart));
        }
        // 一次系统月制冷量
        if (tagrealmap.containsKey(primary_system_monthly_cooling_energy_chart)) {
            primary_system_monthly_cooling_energy = new BigDecimal(tagrealmap.get(primary_system_monthly_cooling_energy_chart));
        }
        // 二次系统月制热量
        if (tagrealmap.containsKey(secondary_system_monthly_heating_energy_chart)) {
            secondary_system_monthly_heating_energy = new BigDecimal(tagrealmap.get(secondary_system_monthly_heating_energy_chart));
        }
        // 二次系统月制冷量
        if (tagrealmap.containsKey(secondary_system_monthly_cooling_energy_chart)) {
            secondary_system_monthly_cooling_energy = new BigDecimal(tagrealmap.get(secondary_system_monthly_cooling_energy_chart));
        }
        
        BigDecimal heatMonthlyCOP = new BigDecimal("0.00"); // 制热COP-月
        BigDecimal coldMonthlyCOP = new BigDecimal("0.00"); // 制冷COP-月

        if ("1".equals(systemTypeUuid)){ // 一次系统
            // 制热COP-月 = 一次系统月制热量 / 系统月电量
            if (system_monthly_energy_consumption.compareTo(BigDecimal.ZERO) != 0) {
                heatMonthlyCOP = primary_system_monthly_heating_energy.divide(system_monthly_energy_consumption, 2, RoundingMode.HALF_UP);
            }

            // 制冷COP-月 = 一次系统月制冷量 / 系统月电量
            if (system_monthly_energy_consumption.compareTo(BigDecimal.ZERO) != 0) {
                coldMonthlyCOP = primary_system_monthly_cooling_energy.divide(system_monthly_energy_consumption, 2, RoundingMode.HALF_UP);
            }
        } else if ("2".equals(systemTypeUuid)){
            // 制热COP-月 = 二次系统月制热量 / 系统月电量
            if (system_monthly_energy_consumption.compareTo(BigDecimal.ZERO) != 0) {
                heatMonthlyCOP = secondary_system_monthly_heating_energy.divide(system_monthly_energy_consumption, 2, RoundingMode.HALF_UP);
            }

            // 制冷COP-月 = 二次系统月制冷量 / 系统月电量
            if (system_monthly_energy_consumption.compareTo(BigDecimal.ZERO) != 0) {
                coldMonthlyCOP = secondary_system_monthly_cooling_energy.divide(system_monthly_energy_consumption, 2, RoundingMode.HALF_UP);
            }
        }
        writeData.put("Sys\\FinforWorx\\EnergyCostChart\\Heat_Monthly_COP_Chart", heatMonthlyCOP.toString());
        writeData.put("Sys\\FinforWorx\\EnergyCostChart\\Cold_Monthly_COP_Chart", coldMonthlyCOP.toString());


        // 执行下置业务编排（只有当writeData不为空时才执行）
        if (writeData != null && writeData.size() > 0) {
            paramMap_write.put("writeData", JSON.toJSONString(writeData));
            paramData_write.put("data", paramMap_write);
            param_write.setParam(paramData_write);
            sol.execute(param_write);
            if (data.get("result") == null) {
                data.put("result", "月/年/采暖季COP下置成功，共下置 " + writeData.size() + " 个点位");
            } else {
                data.put("result", data.get("result") + "；月/年/采暖季COP下置成功，共下置 " + writeData.size() + " 个点位");
            }
            data.put("writeData_cop", writeData);
        } else {
            if (data.get("result") == null) {
                data.put("result", "月/年/采暖季COP：没有数据需要下置，writeData为空");
            } else {
                data.put("result", data.get("result") + "；月/年/采暖季COP：没有数据需要下置，writeData为空");
            }
        }
    }
}

return data;