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

String selectAreaSql = "select project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, "t01");
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
if (!isno_season){
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
Map<String,String> writeData_hour = new HashMap<>();

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

// 1. 获取COP_hour的数据，下置到COP_hour_zizhi
String copHourTag = "Sys\\FinforWorx\\EC\\COP_hour";
String copHourZizhiTag = "Sys\\FinforWorx\\EC\\COP_hour_zizhi";
try {
    BigDecimal value = getValueFromHistory(copHourTag, prevHour55Start, prevHour59End, dataService);
    if (value != null) {
        writeData_hour.put(copHourZizhiTag, value.toString());
    }
} catch (Exception e) {
    // 异常时跳过，记录异常信息到返回数据中
    // if (data.get("debugInfo") == null) {
    //     data.put("debugInfo", new ArrayList<Map<String, Object>>());
    // }
    // Map<String, Object> errorInfo = new HashMap<>();
    // errorInfo.put("tag", copHourTag);
    // errorInfo.put("error", e.getMessage());
    // ((List<Map<String, Object>>)data.get("debugInfo")).add(errorInfo);
}

// 2. 获取HP_COP_hour的数据，下置到HP_COP_hour_zizhi
String hpCopHourTag = "Sys\\FinforWorx\\EC\\HP_COP_hour";
String hpCopHourZizhiTag = "Sys\\FinforWorx\\EC\\HP_COP_hour_zizhi";
try {
    BigDecimal value = getValueFromHistory(hpCopHourTag, prevHour55Start, prevHour59End, dataService);
    if (value != null) {
        writeData_hour.put(hpCopHourZizhiTag, value.toString());
    }
} catch (Exception e) {
    // 异常时跳过，记录异常信息到返回数据中
    // if (data.get("debugInfo") == null) {
    //     data.put("debugInfo", new ArrayList<Map<String, Object>>());
    // }
    // Map<String, Object> errorInfo = new HashMap<>();
    // errorInfo.put("tag", hpCopHourTag);
    // errorInfo.put("error", e.getMessage());
    // ((List<Map<String, Object>>)data.get("debugInfo")).add(errorInfo);
}

// 3. 获取WSHP_COP_hour的数据，下置到WSHP_COP_hour_zizhi
String wshpCopHourTag = "Sys\\FinforWorx\\EC\\WSHP_COP_hour";
String wshpCopHourZizhiTag = "Sys\\FinforWorx\\EC\\WSHP_COP_hour_zizhi";
try {
    BigDecimal value = getValueFromHistory(wshpCopHourTag, prevHour55Start, prevHour59End, dataService);
    if (value != null) {
        writeData_hour.put(wshpCopHourZizhiTag, value.toString());
    }
} catch (Exception e) {
    // 异常时跳过，记录异常信息到返回数据中
    // if (data.get("debugInfo") == null) {
    //     data.put("debugInfo", new ArrayList<Map<String, Object>>());
    // }
    // Map<String, Object> errorInfo = new HashMap<>();
    // errorInfo.put("tag", wshpCopHourTag);
    // errorInfo.put("error", e.getMessage());
    // ((List<Map<String, Object>>)data.get("debugInfo")).add(errorInfo);
}

// 执行小时数据下置
if (!writeData_hour.isEmpty()) {
    paramMap_write_hour.put("writeData", JSON.toJSONString(writeData_hour));
    paramData_write_hour.put("data", paramMap_write_hour);
    param_write_hour.setParam(paramData_write_hour);
    sol.execute(param_write_hour);
    if (data.get("result") == null) {
        data.put("result", "小时数据下置成功，共下置 " + writeData_hour.size() + " 个点位");
    } else {
        data.put("result", data.get("result") + "；小时数据下置成功，共下置 " + writeData_hour.size() + " 个点位");
    }
    data.put("writeData_hour", writeData_hour);
} else {
    if (data.get("result") == null) {
        data.put("result", "小时数据：没有数据需要下置，writeData_hour为空");
    } else {
        data.put("result", data.get("result") + "；小时数据：没有数据需要下置，writeData_hour为空");
    }
}

// 每天0点计算月/年/采暖季COP
if (hour == 0) {
    // 构建需要查询的点名列表（从实时数据表读取）
    StringBuilder tagList = new StringBuilder();

    // 读取月/年/采暖季的点名
    // 月电量和热量点名
    tagList.append("'Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_month',");
    tagList.append("'Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_month',");
    tagList.append("'Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_month',");
    tagList.append("'Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_month',");
    tagList.append("'Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_month',");

    // 年电量和热量点名
    tagList.append("'Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_year',");
    tagList.append("'Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_year',");
    tagList.append("'Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_year',");
    tagList.append("'Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_year',");
    tagList.append("'Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_year',");

    // 采暖季电量和热量点名
    tagList.append("'Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_season',");
    tagList.append("'Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_season',");
    tagList.append("'Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_season',");
    tagList.append("'Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_season',");
    tagList.append("'Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_season',");

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
    // 获取月电量总表数据（2号时已经是1号的日电量值）
    String hp_total_elec_month_tag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_month";
    String wshp_total_elec_month_tag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_month";
    String total_elec_month_tag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_month";

    BigDecimal hp_total_elec_month = new BigDecimal("0.00");
    BigDecimal wshp_total_elec_month = new BigDecimal("0.00");
    BigDecimal total_elec_month = new BigDecimal("0.00");

    if (tagrealmap.containsKey(hp_total_elec_month_tag)) {
        hp_total_elec_month = new BigDecimal(tagrealmap.get(hp_total_elec_month_tag));
    }
    if (tagrealmap.containsKey(wshp_total_elec_month_tag)) {
        wshp_total_elec_month = new BigDecimal(tagrealmap.get(wshp_total_elec_month_tag));
    }
    if (tagrealmap.containsKey(total_elec_month_tag)) {
        total_elec_month = new BigDecimal(tagrealmap.get(total_elec_month_tag));
    }

    // 获取月热量（一次侧和二次侧）
    String heat1_month_tag = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_month";
    String heat2_month_tag = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_month";
    BigDecimal heat1_month = new BigDecimal("0.00");
    BigDecimal heat2_month = new BigDecimal("0.00");

    if (tagrealmap.containsKey(heat1_month_tag)) {
        heat1_month = new BigDecimal(tagrealmap.get(heat1_month_tag));
    }
    if (tagrealmap.containsKey(heat2_month_tag)) {
        heat2_month = new BigDecimal(tagrealmap.get(heat2_month_tag));
    }

    // 计算热泵COP-月 = 一次侧热表1 / 热泵总电表
    BigDecimal hp_cop_month = new BigDecimal("0.00");
    if (hp_total_elec_month.compareTo(BigDecimal.ZERO) != 0) {
        hp_cop_month = heat1_month.divide(hp_total_elec_month, 2, RoundingMode.HALF_UP);
    }
    writeData.put("Sys\\FinforWorx\\EC\\HP_COP_month", hp_cop_month.toString());

    // 计算水源热泵COP-月 = 二次侧热表2 / 水源热泵总电表
    BigDecimal wshp_cop_month = new BigDecimal("0.00");
    if (wshp_total_elec_month.compareTo(BigDecimal.ZERO) != 0) {
        wshp_cop_month = heat2_month.divide(wshp_total_elec_month, 2, RoundingMode.HALF_UP);
    }
    writeData.put("Sys\\FinforWorx\\EC\\WSHP_COP_month", wshp_cop_month.toString());

    // 计算系统COP-月 = 二次侧热表2 / 总电表
    BigDecimal cop_month = new BigDecimal("0.00");
    if (total_elec_month.compareTo(BigDecimal.ZERO) != 0) {
        cop_month = heat2_month.divide(total_elec_month, 2, RoundingMode.HALF_UP);
    }
    writeData.put("Sys\\FinforWorx\\EC\\COP_month", cop_month.toString());

    // 如果是每月1号，将计算出的月COP值下置到zizhi点位
    if (day_of_month == 1) {
        writeData.put("Sys\\FinforWorx\\EC\\COP_month_zizhi", cop_month.toString());
        writeData.put("Sys\\FinforWorx\\EC\\HP_COP_month_zizhi", hp_cop_month.toString());
        writeData.put("Sys\\FinforWorx\\EC\\WSHP_COP_month_zizhi", wshp_cop_month.toString());
    }

    // ========== 计算年COP ==========
    // 获取年电量总表数据（1月2号时已经是1号的日电量值）
    String hp_total_elec_year_tag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_year";
    String wshp_total_elec_year_tag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_year";
    String total_elec_year_tag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_year";

    BigDecimal hp_total_elec_year = new BigDecimal("0.00");
    BigDecimal wshp_total_elec_year = new BigDecimal("0.00");
    BigDecimal total_elec_year = new BigDecimal("0.00");

    if (tagrealmap.containsKey(hp_total_elec_year_tag)) {
        hp_total_elec_year = new BigDecimal(tagrealmap.get(hp_total_elec_year_tag));
    }
    if (tagrealmap.containsKey(wshp_total_elec_year_tag)) {
        wshp_total_elec_year = new BigDecimal(tagrealmap.get(wshp_total_elec_year_tag));
    }
    if (tagrealmap.containsKey(total_elec_year_tag)) {
        total_elec_year = new BigDecimal(tagrealmap.get(total_elec_year_tag));
    }

    // 获取年热量（一次侧和二次侧）
    String heat1_year_tag = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_year";
    String heat2_year_tag = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_year";
    BigDecimal heat1_year = new BigDecimal("0.00");
    BigDecimal heat2_year = new BigDecimal("0.00");

    if (tagrealmap.containsKey(heat1_year_tag)) {
        heat1_year = new BigDecimal(tagrealmap.get(heat1_year_tag));
    }
    if (tagrealmap.containsKey(heat2_year_tag)) {
        heat2_year = new BigDecimal(tagrealmap.get(heat2_year_tag));
    }

    // 计算热泵COP-年 = 一次侧热表1 / 热泵总电表
    BigDecimal hp_cop_year = new BigDecimal("0.00");
    if (hp_total_elec_year.compareTo(BigDecimal.ZERO) != 0) {
        hp_cop_year = heat1_year.divide(hp_total_elec_year, 2, RoundingMode.HALF_UP);
    }
    writeData.put("Sys\\FinforWorx\\EC\\HP_COP_year", hp_cop_year.toString());

    // 计算水源热泵COP-年 = 二次侧热表2 / 水源热泵总电表
    BigDecimal wshp_cop_year = new BigDecimal("0.00");
    if (wshp_total_elec_year.compareTo(BigDecimal.ZERO) != 0) {
        wshp_cop_year = heat2_year.divide(wshp_total_elec_year, 2, RoundingMode.HALF_UP);
    }
    writeData.put("Sys\\FinforWorx\\EC\\WSHP_COP_year", wshp_cop_year.toString());

    // 计算系统COP-年 = 二次侧热表2 / 总电表
    BigDecimal cop_year = new BigDecimal("0.00");
    if (total_elec_year.compareTo(BigDecimal.ZERO) != 0) {
        cop_year = heat2_year.divide(total_elec_year, 2, RoundingMode.HALF_UP);
    }
    writeData.put("Sys\\FinforWorx\\EC\\COP_year", cop_year.toString());

    // 如果是1月1号，将计算出的年COP值下置到zizhi点位
    if (day_of_month == 1 && monthOfYear == 1) {
        writeData.put("Sys\\FinforWorx\\EC\\COP_year_zizhi", cop_year.toString());
        writeData.put("Sys\\FinforWorx\\EC\\HP_COP_year_zizhi", hp_cop_year.toString());
        writeData.put("Sys\\FinforWorx\\EC\\WSHP_COP_year_zizhi", wshp_cop_year.toString());
    }

    // ========== 计算采暖季COP ==========
    // 获取采暖季电量总表数据（采暖季第一天时已经是当天的日电量值）
    String hp_total_elec_season_tag = "Sys\\FinforWorx\\EC\\HP_Total_Meter_Elec_Consumption_season";
    String wshp_total_elec_season_tag = "Sys\\FinforWorx\\EC\\WSHP_Total_Meter_Elec_Consumption_season";
    String total_elec_season_tag = "Sys\\FinforWorx\\EC\\Total_Meter_Elec_Consumption_season";

    BigDecimal hp_total_elec_season = new BigDecimal("0.00");
    BigDecimal wshp_total_elec_season = new BigDecimal("0.00");
    BigDecimal total_elec_season = new BigDecimal("0.00");

    if (tagrealmap.containsKey(hp_total_elec_season_tag)) {
        hp_total_elec_season = new BigDecimal(tagrealmap.get(hp_total_elec_season_tag));
    }
    if (tagrealmap.containsKey(wshp_total_elec_season_tag)) {
        wshp_total_elec_season = new BigDecimal(tagrealmap.get(wshp_total_elec_season_tag));
    }
    if (tagrealmap.containsKey(total_elec_season_tag)) {
        total_elec_season = new BigDecimal(tagrealmap.get(total_elec_season_tag));
    }

    // 获取采暖季热量（一次侧和二次侧）
    String heat1_season_tag = "Sys\\FinforWorx\\EC\\Heat_Meter1_Elec_Consumption_season";
    String heat2_season_tag = "Sys\\FinforWorx\\EC\\Heat_Meter2_Elec_Consumption_season";
    BigDecimal heat1_season = new BigDecimal("0.00");
    BigDecimal heat2_season = new BigDecimal("0.00");

    if (tagrealmap.containsKey(heat1_season_tag)) {
        heat1_season = new BigDecimal(tagrealmap.get(heat1_season_tag));
    }
    if (tagrealmap.containsKey(heat2_season_tag)) {
        heat2_season = new BigDecimal(tagrealmap.get(heat2_season_tag));
    }

    // 计算热泵COP-采暖季 = 一次侧热表1 / 热泵总电表
    BigDecimal hp_cop_season = new BigDecimal("0.00");
    if (hp_total_elec_season.compareTo(BigDecimal.ZERO) != 0) {
        hp_cop_season = heat1_season.divide(hp_total_elec_season, 2, RoundingMode.HALF_UP);
    }
    writeData.put("Sys\\FinforWorx\\EC\\HP_COP_season", hp_cop_season.toString());

    // 计算水源热泵COP-采暖季 = 二次侧热表2 / 水源热泵总电表
    // BigDecimal wshp_cop_season = new BigDecimal("0.00");
    // if (wshp_total_elec_season.compareTo(BigDecimal.ZERO) != 0) {
    //     wshp_cop_season = heat2_season.divide(wshp_total_elec_season, 2, RoundingMode.HALF_UP);
    // }
    // writeData.put("Sys\\FinforWorx\\EC\\WSHP_COP_season", wshp_cop_season.toString());

    // 计算系统COP-采暖季 = 二次侧热表2 / 总电表
    BigDecimal cop_season = new BigDecimal("0.00");
    if (total_elec_season.compareTo(BigDecimal.ZERO) != 0) {
        cop_season = heat2_season.divide(total_elec_season, 2, RoundingMode.HALF_UP);
    }
    writeData.put("Sys\\FinforWorx\\EC\\COP_season", cop_season.toString());

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

    // 下置日数据到zizhi点位
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

    // 1. 获取COP_day的数据，下置到COP_day_zizhi
    String copDayTag = "Sys\\FinforWorx\\EC\\COP_day";
    String copDayZizhiTag = "Sys\\FinforWorx\\EC\\COP_day_zizhi";
    try {
        BigDecimal value = getValueFromHistory(copDayTag, prevDay23Hour55Start, prevDay23Hour59End, dataService);
        if (value != null) {
            writeData_day.put(copDayZizhiTag, value.toString());
        }
    } catch (Exception e) {
        // 异常时跳过，记录异常信息到返回数据中
        // if (data.get("debugInfo") == null) {
        //     data.put("debugInfo", new ArrayList<Map<String, Object>>());
        // }
        // Map<String, Object> errorInfo = new HashMap<>();
        // errorInfo.put("tag", copDayTag);
        // errorInfo.put("error", e.getMessage());
        // ((List<Map<String, Object>>)data.get("debugInfo")).add(errorInfo);
    }

    // 2. 获取HP_COP_day的数据，下置到HP_COP_day_zizhi
    String hpCopDayTag = "Sys\\FinforWorx\\EC\\HP_COP_day";
    String hpCopDayZizhiTag = "Sys\\FinforWorx\\EC\\HP_COP_day_zizhi";
    try {
        BigDecimal value = getValueFromHistory(hpCopDayTag, prevDay23Hour55Start, prevDay23Hour59End, dataService);
        if (value != null) {
            writeData_day.put(hpCopDayZizhiTag, value.toString());
        }
    } catch (Exception e) {
        // 异常时跳过，记录异常信息到返回数据中
        // if (data.get("debugInfo") == null) {
        //     data.put("debugInfo", new ArrayList<Map<String, Object>>());
        // }
        // Map<String, Object> errorInfo = new HashMap<>();
        // errorInfo.put("tag", hpCopDayTag);
        // errorInfo.put("error", e.getMessage());
        // ((List<Map<String, Object>>)data.get("debugInfo")).add(errorInfo);
    }

    // 3. 获取WSHP_COP_day的数据，下置到WSHP_COP_day_zizhi
    String wshpCopDayTag = "Sys\\FinforWorx\\EC\\WSHP_COP_day";
    String wshpCopDayZizhiTag = "Sys\\FinforWorx\\EC\\WSHP_COP_day_zizhi";
    try {
        BigDecimal value = getValueFromHistory(wshpCopDayTag, prevDay23Hour55Start, prevDay23Hour59End, dataService);
        if (value != null) {
            writeData_day.put(wshpCopDayZizhiTag, value.toString());
        }
    } catch (Exception e) {
        // 异常时跳过，记录异常信息到返回数据中
        // if (data.get("debugInfo") == null) {
        //     data.put("debugInfo", new ArrayList<Map<String, Object>>());
        // }
        // Map<String, Object> errorInfo = new HashMap<>();
        // errorInfo.put("tag", wshpCopDayTag);
        // errorInfo.put("error", e.getMessage());
        // ((List<Map<String, Object>>)data.get("debugInfo")).add(errorInfo);
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
}

return data;