/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
 */

import com.alibaba.fastjson.JSON;
import com.sunwayland.algorithm.feign.FeignSolAlgorithmProcess;
import com.sunwayland.algorithm.pojo.AlgorithmProcessExecuteParam
import com.sunwayland.common.core.constant.PlatformConst;
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dao.data.DataRow;
import com.sunwayland.platform.dao.impl.PsSqlImpl;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);

// 登录用户信息
PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String userUuid = ptUser.userUuid;
String niceName = ptUser.niceName;
String dbCode = ptUser.dbCode;
if (dbCode.equals("base")) {
    dbCode = "t01"
}

// 获取请求参数
Map<String, Object> paramMap = data.get("param");
Map<String, Object> requestData = paramMap != null ? (Map<String, Object>) paramMap.get("data") : new HashMap();

// 尝试从多个位置获取date值（优先级：requestData > data顶层 > paramMap）
Object dateObj = null;
// 1. 先从requestData中获取
dateObj = requestData.get("date");
// 2. 如果requestData中没有，尝试从data的顶层获取（有些系统可能会把参数放在顶层）
if (dateObj == null) {
    dateObj = data.get("date");
}
// 3. 如果还是没有，尝试从paramMap中获取
if (dateObj == null && paramMap != null) {
    dateObj = paramMap.get("date");
}

// 调试：记录原始参数
data.put("debug_dateObj_raw", dateObj != null ? dateObj.toString() : "null");
data.put("debug_dateObj_class", dateObj != null ? dateObj.getClass().getName() : "null");
data.put("debug_dateObj_from_requestData", requestData.get("date") != null ? requestData.get("date").toString() : "null");
data.put("debug_dateObj_from_data", data.get("date") != null ? data.get("date").toString() : "null");
data.put("debug_dateObj_from_paramMap", (paramMap != null && paramMap.get("date") != null) ? paramMap.get("date").toString() : "null");

String selectedDate = dateObj != null ? dateObj.toString().trim() : "";

// 尝试从多个位置获取comparison值（优先级：requestData > data顶层 > paramMap）
Object comparisonObj = null;
// 1. 先从requestData中获取
comparisonObj = requestData.get("comparison");
// 2. 如果requestData中没有，尝试从data的顶层获取（有些系统可能会把参数放在顶层）
if (comparisonObj == null) {
    comparisonObj = data.get("comparison");
}
// 3. 如果还是没有，尝试从paramMap中获取
if (comparisonObj == null && paramMap != null) {
    comparisonObj = paramMap.get("comparison");
}

String comparison = comparisonObj != null ? comparisonObj.toString().trim() : "";

// 调试：记录comparison的获取情况
data.put("debug_comparisonObj_raw", comparisonObj != null ? comparisonObj.toString() : "null");
data.put("debug_comparisonObj_from_requestData", requestData.get("comparison") != null ? requestData.get("comparison").toString() : "null");
data.put("debug_comparisonObj_from_data", data.get("comparison") != null ? data.get("comparison").toString() : "null");
data.put("debug_comparisonObj_from_paramMap", (paramMap != null && paramMap.get("comparison") != null) ? paramMap.get("comparison").toString() : "null");
data.put("debug_comparison_final", comparison);

// 保存原始日期值用于调试
String originalSelectedDate = selectedDate;
data.put("debug_originalSelectedDate_after_trim", originalSelectedDate);

// 尝试从多个位置获取tab值（优先级：requestData > data顶层 > paramMap）
Object tabObj = null;
// 1. 先从requestData中获取
tabObj = requestData.get("tab");
// 2. 如果requestData中没有，尝试从data的顶层获取（有些系统可能会把参数放在顶层）
if (tabObj == null) {
    tabObj = data.get("tab");
}
// 3. 如果还是没有，尝试从paramMap中获取
if (tabObj == null && paramMap != null) {
    tabObj = paramMap.get("tab");
}

String tab = "power";  // 默认值
if (tabObj != null) {
    tab = tabObj.toString().trim();
    // 转换为小写以确保匹配（防止大小写问题）
    tab = tab.toLowerCase();
}

// 调试信息：记录接收到的tab值
data.put("debug_tab_from_requestData", requestData.get("tab") != null ? requestData.get("tab").toString() : "null");
data.put("debug_tab_from_data", data.get("tab") != null ? data.get("tab").toString() : "null");
data.put("debug_tab_original", tabObj != null ? tabObj.toString() : "null");
data.put("debug_tab_received", tab);
data.put("debug_tab_length", String.valueOf(tab != null ? tab.length() : 0));
data.put("debug_tab_equals_power", String.valueOf("power".equals(tab)));
data.put("debug_tab_equals_heat", String.valueOf("heat".equals(tab)));
data.put("debug_tab_equals_cop", String.valueOf("cop".equals(tab)));

// 如果没有提供日期，使用今天
if (selectedDate == null || selectedDate.equals("")) {
    LocalDate today = LocalDate.now();
    selectedDate = today.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    originalSelectedDate = selectedDate; // 更新原始值
}

// 解析日期 - 使用明确的格式，确保正确解析
// 先处理日期字符串（提取日期部分，去除时间部分）
String dateStrToParse = selectedDate;
if (dateStrToParse != null && dateStrToParse.contains(" ")) {
    dateStrToParse = dateStrToParse.split(" ")[0];
}

LocalDate date;
try {
    // 使用明确的格式解析日期
    date = LocalDate.parse(dateStrToParse, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
} catch (Exception e) {
    // 如果解析失败，使用今天（但不修改selectedDate变量，保持原始值）
    date = LocalDate.now();
    // 记录解析错误
    data.put("debug_parseError", e.getMessage());
    data.put("debug_dateStrToParse", dateStrToParse);
}

LocalDate today = LocalDate.now();
boolean isToday = date.equals(today);

// 如果是今天，使用当前时间作为结束时间；否则使用当天的23:59:59
LocalDateTime endDateTime;
if (isToday) {
    endDateTime = LocalDateTime.now();
} else {
    // 非今天日期，使用完整的23:59:59
    endDateTime = date.atTime(23, 59, 59);
}

String startTime = date.atStartOfDay().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
String endTime = endDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

// 添加调试信息，帮助排查问题
data.put("debug_originalSelectedDate", originalSelectedDate);
data.put("debug_selectedDate", selectedDate);
data.put("debug_parsedDate", date != null ? date.toString() : "null");
data.put("debug_today", today.toString());
data.put("debug_isToday", String.valueOf(isToday));
data.put("debug_startTime", startTime);
data.put("debug_endTime", endTime);

// 瞬时数据标签（从实时数据表查询，历史数据可能存储在pshisdata中）
// 瞬时总电功率标签
String instantPowerTag = "Sys\\FinforWorx\\plcEC\\system_total_power";
// 空气源热泵瞬时电功率标签
String hpPowerTag = "Sys\\FinforWorx\\plcEC\\hp_total_power";
// 水源热泵瞬时电功率标签
String wshpPowerTag = "Sys\\FinforWorx\\plcEC\\wshp_total_power";
// 水泵瞬时电功率标签
String wpPowerTag = "WPElectricityMeter\\wp_total_power";
// 一次侧供水温度标签
String primarySupplyTempTag = "Sys\\FinforWorx\\TT\\TT101";
// 一次侧回水温度标签
String primaryReturnTempTag = "Sys\\FinforWorx\\TT\\TT102";
// 二次侧供水温度标签
String secondarySupplyTempTag = "Sys\\FinforWorx\\TT\\TT103";
// 二次侧回水温度标签
String secondaryReturnTempTag = "Sys\\FinforWorx\\TT\\TT104";
// 瞬时热功率标签
String instantHeatPowerTag = "Sys\\FinforWorx\\plcEC\\second_instant_power_after_calc";
// 瞬时COP标签
String instantCOPTag = "Sys\\FinforWorx\\plcEC\\cop_hour";

// 查询24小时历史数据
Map<String, Object> result = new HashMap();

// 根据选中的tab，只查询对应的数据
// 使用 "power".equals(tab) 的方式避免空指针，并确保字符串完全匹配
// 调试：记录tab值用于排查问题
result.put("debug_tab", tab);
result.put("debug_tab_class", tab != null ? tab.getClass().getName() : "null");

// 使用switch-like逻辑，确保只执行一个分支
if (tab != null && tab.equals("power")) {
    // 查询瞬时总电功率24小时数据
    Map<String, List<String>> powerData = query24HourData(instantPowerTag, startTime, endTime, dataService);
    result.put("powerData", powerData);
    result.put("debug_branch", "power");
    
    // 调试：记录comparison的值
    result.put("debug_comparison", comparison != null ? comparison : "null");
    
    // 如果有对比方式，查询对比数据
    if (comparison != null && !comparison.equals("")) {
        LocalDateTime compareStartDateTime = null;
        LocalDateTime compareEndDateTime = null;
        
        if (comparison.equals("QOQ")) {
            // 环比：前一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusDays(1);
            compareStartDateTime = compareDate.atStartOfDay();
            // 如果当前数据是今天，对比数据的结束时间应该是当前时间减去1天
            // 如果当前数据不是今天，对比数据的结束时间应该是23:59:59
            if (isToday) {
                compareEndDateTime = endDateTime.minusDays(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        } else if (comparison.equals("YOY")) {
            // 同比：去年同一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusYears(1);
            compareStartDateTime = compareDate.atStartOfDay();
            // 如果当前数据是今天，对比数据的结束时间应该是当前时间减去1年
            // 如果当前数据不是今天，对比数据的结束时间应该是23:59:59
            if (isToday) {
                compareEndDateTime = endDateTime.minusYears(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        }
        
        if (compareStartDateTime != null && compareEndDateTime != null) {
            String compareStartTime = compareStartDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String compareEndTime = compareEndDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            Map<String, List<String>> powerDataPrevious = query24HourData(instantPowerTag, compareStartTime, compareEndTime, dataService);
            result.put("powerDataPrevious", powerDataPrevious);
        }
    }
} else if (tab != null && tab.equals("hp_power")) {
    // 查询空气源热泵瞬时电功率24小时数据
    Map<String, List<String>> hpPowerData = query24HourData(hpPowerTag, startTime, endTime, dataService);
    result.put("hpPowerData", hpPowerData);
    result.put("debug_branch", "hp_power");
    
    // 调试：记录comparison的值
    result.put("debug_comparison", comparison != null ? comparison : "null");
    
    // 如果有对比方式，查询对比数据
    if (comparison != null && !comparison.equals("")) {
        LocalDateTime compareStartDateTime = null;
        LocalDateTime compareEndDateTime = null;
        
        if (comparison.equals("QOQ")) {
            // 环比：前一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusDays(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusDays(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        } else if (comparison.equals("YOY")) {
            // 同比：去年同一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusYears(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusYears(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        }
        
        if (compareStartDateTime != null && compareEndDateTime != null) {
            String compareStartTime = compareStartDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String compareEndTime = compareEndDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            Map<String, List<String>> hpPowerDataPrevious = query24HourData(hpPowerTag, compareStartTime, compareEndTime, dataService);
            result.put("hpPowerDataPrevious", hpPowerDataPrevious);
        }
    }
} else if (tab != null && tab.equals("wshp_power")) {
    // 查询水源热泵瞬时电功率24小时数据
    Map<String, List<String>> wshpPowerData = query24HourData(wshpPowerTag, startTime, endTime, dataService);
    result.put("wshpPowerData", wshpPowerData);
    result.put("debug_branch", "wshp_power");
    
    // 调试：记录comparison的值
    result.put("debug_comparison", comparison != null ? comparison : "null");
    
    // 如果有对比方式，查询对比数据
    if (comparison != null && !comparison.equals("")) {
        LocalDateTime compareStartDateTime = null;
        LocalDateTime compareEndDateTime = null;
        
        if (comparison.equals("QOQ")) {
            // 环比：前一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusDays(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusDays(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        } else if (comparison.equals("YOY")) {
            // 同比：去年同一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusYears(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusYears(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        }
        
        if (compareStartDateTime != null && compareEndDateTime != null) {
            String compareStartTime = compareStartDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String compareEndTime = compareEndDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            Map<String, List<String>> wshpPowerDataPrevious = query24HourData(wshpPowerTag, compareStartTime, compareEndTime, dataService);
            result.put("wshpPowerDataPrevious", wshpPowerDataPrevious);
        }
    }
} else if (tab != null && tab.equals("wp_power")) {
    // 查询水泵瞬时电功率24小时数据
    Map<String, List<String>> wpPowerData = query24HourData(wpPowerTag, startTime, endTime, dataService);
    result.put("wpPowerData", wpPowerData);
    result.put("debug_branch", "wp_power");
    
    // 调试：记录comparison的值
    result.put("debug_comparison", comparison != null ? comparison : "null");
    
    // 如果有对比方式，查询对比数据
    if (comparison != null && !comparison.equals("")) {
        LocalDateTime compareStartDateTime = null;
        LocalDateTime compareEndDateTime = null;
        
        if (comparison.equals("QOQ")) {
            // 环比：前一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusDays(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusDays(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        } else if (comparison.equals("YOY")) {
            // 同比：去年同一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusYears(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusYears(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        }
        
        if (compareStartDateTime != null && compareEndDateTime != null) {
            String compareStartTime = compareStartDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String compareEndTime = compareEndDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            Map<String, List<String>> wpPowerDataPrevious = query24HourData(wpPowerTag, compareStartTime, compareEndTime, dataService);
            result.put("wpPowerDataPrevious", wpPowerDataPrevious);
        }
    }
} else if (tab != null && tab.equals("primary_temp")) {
    // 查询一次侧供回水温度24小时数据
    Map<String, List<String>> primarySupplyTempData = query24HourData(primarySupplyTempTag, startTime, endTime, dataService);
    Map<String, List<String>> primaryReturnTempData = query24HourData(primaryReturnTempTag, startTime, endTime, dataService);
    
    Map<String, Object> primaryTempData = new HashMap();
    primaryTempData.put("xList", primarySupplyTempData.get("xList"));
    primaryTempData.put("supplyTemp", primarySupplyTempData);
    primaryTempData.put("returnTemp", primaryReturnTempData);
    result.put("primaryTempData", primaryTempData);
    result.put("debug_branch", "primary_temp");
    
    // 调试：记录comparison的值
    result.put("debug_comparison", comparison != null ? comparison : "null");
    
    // 如果有对比方式，查询对比数据
    if (comparison != null && !comparison.equals("")) {
        LocalDateTime compareStartDateTime = null;
        LocalDateTime compareEndDateTime = null;
        
        if (comparison.equals("QOQ")) {
            // 环比：前一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusDays(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusDays(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        } else if (comparison.equals("YOY")) {
            // 同比：去年同一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusYears(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusYears(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        }
        
        if (compareStartDateTime != null && compareEndDateTime != null) {
            String compareStartTime = compareStartDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String compareEndTime = compareEndDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            Map<String, List<String>> primarySupplyTempDataPrevious = query24HourData(primarySupplyTempTag, compareStartTime, compareEndTime, dataService);
            Map<String, List<String>> primaryReturnTempDataPrevious = query24HourData(primaryReturnTempTag, compareStartTime, compareEndTime, dataService);
            
            Map<String, Object> primaryTempDataPrevious = new HashMap();
            primaryTempDataPrevious.put("xList", primarySupplyTempDataPrevious.get("xList"));
            primaryTempDataPrevious.put("supplyTemp", primarySupplyTempDataPrevious);
            primaryTempDataPrevious.put("returnTemp", primaryReturnTempDataPrevious);
            result.put("primaryTempDataPrevious", primaryTempDataPrevious);
        }
    }
} else if (tab != null && tab.equals("secondary_temp")) {
    // 查询二次侧供回水温度24小时数据
    Map<String, List<String>> secondarySupplyTempData = query24HourData(secondarySupplyTempTag, startTime, endTime, dataService);
    Map<String, List<String>> secondaryReturnTempData = query24HourData(secondaryReturnTempTag, startTime, endTime, dataService);
    
    Map<String, Object> secondaryTempData = new HashMap();
    secondaryTempData.put("xList", secondarySupplyTempData.get("xList"));
    secondaryTempData.put("supplyTemp", secondarySupplyTempData);
    secondaryTempData.put("returnTemp", secondaryReturnTempData);
    result.put("secondaryTempData", secondaryTempData);
    result.put("debug_branch", "secondary_temp");
    
    // 调试：记录comparison的值
    result.put("debug_comparison", comparison != null ? comparison : "null");
    
    // 如果有对比方式，查询对比数据
    if (comparison != null && !comparison.equals("")) {
        LocalDateTime compareStartDateTime = null;
        LocalDateTime compareEndDateTime = null;
        
        if (comparison.equals("QOQ")) {
            // 环比：前一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusDays(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusDays(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        } else if (comparison.equals("YOY")) {
            // 同比：去年同一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusYears(1);
            compareStartDateTime = compareDate.atStartOfDay();
            if (isToday) {
                compareEndDateTime = endDateTime.minusYears(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        }
        
        if (compareStartDateTime != null && compareEndDateTime != null) {
            String compareStartTime = compareStartDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String compareEndTime = compareEndDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            Map<String, List<String>> secondarySupplyTempDataPrevious = query24HourData(secondarySupplyTempTag, compareStartTime, compareEndTime, dataService);
            Map<String, List<String>> secondaryReturnTempDataPrevious = query24HourData(secondaryReturnTempTag, compareStartTime, compareEndTime, dataService);
            
            Map<String, Object> secondaryTempDataPrevious = new HashMap();
            secondaryTempDataPrevious.put("xList", secondarySupplyTempDataPrevious.get("xList"));
            secondaryTempDataPrevious.put("supplyTemp", secondarySupplyTempDataPrevious);
            secondaryTempDataPrevious.put("returnTemp", secondaryReturnTempDataPrevious);
            result.put("secondaryTempDataPrevious", secondaryTempDataPrevious);
        }
    }
} else if (tab != null && tab.equals("heat")) {
    // 查询瞬时热功率24小时数据
    Map<String, List<String>> heatData = query24HourData(instantHeatPowerTag, startTime, endTime, dataService);
    result.put("heatData", heatData);
    result.put("debug_branch", "heat");
    
    // 调试：记录comparison的值
    result.put("debug_comparison", comparison != null ? comparison : "null");
    
    // 如果有对比方式，查询对比数据
    if (comparison != null && !comparison.equals("")) {
        LocalDateTime compareStartDateTime = null;
        LocalDateTime compareEndDateTime = null;
        
        if (comparison.equals("QOQ")) {
            // 环比：前一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusDays(1);
            compareStartDateTime = compareDate.atStartOfDay();
            // 如果当前数据是今天，对比数据的结束时间应该是当前时间减去1天
            // 如果当前数据不是今天，对比数据的结束时间应该是23:59:59
            if (isToday) {
                compareEndDateTime = endDateTime.minusDays(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        } else if (comparison.equals("YOY")) {
            // 同比：去年同一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusYears(1);
            compareStartDateTime = compareDate.atStartOfDay();
            // 如果当前数据是今天，对比数据的结束时间应该是当前时间减去1年
            // 如果当前数据不是今天，对比数据的结束时间应该是23:59:59
            if (isToday) {
                compareEndDateTime = endDateTime.minusYears(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        }
        
        if (compareStartDateTime != null && compareEndDateTime != null) {
            String compareStartTime = compareStartDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String compareEndTime = compareEndDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            Map<String, List<String>> heatDataPrevious = query24HourData(instantHeatPowerTag, compareStartTime, compareEndTime, dataService);
            result.put("heatDataPrevious", heatDataPrevious);
        }
    }
} else if (tab != null && tab.equals("cop")) {
    // 查询瞬时COP24小时数据
    Map<String, List<String>> copData = query24HourData(instantCOPTag, startTime, endTime, dataService);
    result.put("copData", copData);
    result.put("debug_branch", "cop");
    
    // 调试：记录comparison的值
    result.put("debug_comparison", comparison != null ? comparison : "null");
    result.put("debug_comparison_length", comparison != null ? String.valueOf(comparison.length()) : "null");
    result.put("debug_comparison_equals_QOQ", comparison != null && comparison.equals("QOQ") ? "true" : "false");
    result.put("debug_comparison_equals_YOY", comparison != null && comparison.equals("YOY") ? "true" : "false");
    result.put("debug_comparison_empty", comparison != null && comparison.equals("") ? "true" : "false");
    
    // 如果有对比方式，查询对比数据
    if (comparison != null && !comparison.equals("")) {
        LocalDateTime compareStartDateTime = null;
        LocalDateTime compareEndDateTime = null;
        
        if (comparison.equals("QOQ")) {
            // 环比：前一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusDays(1);
            compareStartDateTime = compareDate.atStartOfDay();
            // 如果当前数据是今天，对比数据的结束时间应该是当前时间减去1天
            // 如果当前数据不是今天，对比数据的结束时间应该是23:59:59
            if (isToday) {
                compareEndDateTime = endDateTime.minusDays(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        } else if (comparison.equals("YOY")) {
            // 同比：去年同一天，保持与当前数据相同的时间范围
            LocalDate compareDate = date.minusYears(1);
            compareStartDateTime = compareDate.atStartOfDay();
            // 如果当前数据是今天，对比数据的结束时间应该是当前时间减去1年
            // 如果当前数据不是今天，对比数据的结束时间应该是23:59:59
            if (isToday) {
                compareEndDateTime = endDateTime.minusYears(1);
            } else {
                compareEndDateTime = compareDate.atTime(23, 59, 59);
            }
        }
        
        result.put("debug_compareStartDateTime", compareStartDateTime != null ? compareStartDateTime.toString() : "null");
        result.put("debug_compareEndDateTime", compareEndDateTime != null ? compareEndDateTime.toString() : "null");
        
        if (compareStartDateTime != null && compareEndDateTime != null) {
            String compareStartTime = compareStartDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String compareEndTime = compareEndDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            
            result.put("debug_compareStartTime", compareStartTime);
            result.put("debug_compareEndTime", compareEndTime);
            
            Map<String, List<String>> copDataPrevious = query24HourData(instantCOPTag, compareStartTime, compareEndTime, dataService);
            result.put("copDataPrevious", copDataPrevious);
            result.put("debug_copDataPrevious_size", copDataPrevious != null && copDataPrevious.get("yList") != null ? String.valueOf(copDataPrevious.get("yList").size()) : "null");
        } else {
            result.put("debug_compareDateTime_null", "compareStartDateTime or compareEndDateTime is null");
        }
    } else {
        result.put("debug_comparison_check_failed", "comparison is null or empty");
    }
} else {
    // 如果 tab 值不匹配，记录错误信息用于调试
    result.put("error", "Unknown tab value: [" + tab + "]");
    result.put("debug_branch", "unknown");
    data.put("debug_tab_received", tab);
    data.put("debug_tab_length", String.valueOf(tab != null ? tab.length() : 0));
}

data.put("result", result);
return data;

// 查询24小时历史数据 - 每1分钟聚合
Map<String, List<String>> query24HourData(String tagName, String startTime, String endTime, DataService dataService) {
    Map<String, List<String>> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    
    // 采样间隔：每1分钟一个数据点（1440个点）
    int samplingIntervalMinutes = 1;
    
    // 解析开始和结束时间
    LocalDateTime startDateTime = LocalDateTime.parse(startTime, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    LocalDateTime endDateTime = LocalDateTime.parse(endTime, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    
    // 计算实际需要的数据点数量（从开始时间到结束时间，每1分钟一个点）
    long totalMinutes = java.time.Duration.between(startDateTime, endDateTime).toMinutes();
    int totalPoints = (int) totalMinutes + 1;  // +1 包含起始点
    
    // 限制最大1440个点（24小时）
    if (totalPoints > 1440) {
        totalPoints = 1440;
    }
    
    // 生成采样时间点（每1分钟一个，只生成到结束时间为止）
    for (int i = 0; i < totalPoints; i++) {
        LocalDateTime timePoint = startDateTime.plusMinutes(i * samplingIntervalMinutes);
        // 如果时间点超过了结束时间，停止生成
        if (timePoint.isAfter(endDateTime)) {
            break;
        }
        String timeStr = timePoint.format(DateTimeFormatter.ofPattern("HH:mm"));
        xList.add(timeStr);
    }
    
    // 查询历史数据（查询所有原始30秒数据，用于聚合）
    // 尝试多种查询方式（与 queryElectricityConsumption.groovy 一致）：
    // 方式1：优先使用等号精确匹配 starttime 和 endtime
    // 方式2：如果方式1没有数据，尝试使用 starttime 和 endtime 字段进行范围查询
    // 方式3：如果方式2也没有数据，尝试使用 times 字段进行范围查询
    String sql1 = "SELECT a.taglongname, a.times, a.hisval FROM pshisdata AS a WHERE a.taglongname = '" + tagName + "' " +
                  "AND a.starttime = '" + startTime + "' AND a.endtime = '" + endTime + "' ORDER BY a.times ASC limitpage 1,9999";
    String sql2 = "";
    String sql3 = "";
    
    try {
        DataTable dt = dataService.queryListDataBySql(sql1);
        
        // 如果使用等号精确匹配没有结果，尝试使用范围查询
        if (dt.getRows().size() == 0) {
            sql2 = "SELECT a.taglongname, a.times, a.hisval FROM pshisdata AS a WHERE a.taglongname = '" + tagName + "' " +
                   "AND a.starttime >= '" + startTime + "' AND a.endtime <= '" + endTime + "' ORDER BY a.times ASC limitpage 1,9999";
            dt = dataService.queryListDataBySql(sql2);
        }
        
        // 如果方式2也没有结果，尝试使用 times 字段进行范围查询
        if (dt.getRows().size() == 0) {
            sql3 = "SELECT a.taglongname, a.times, a.hisval FROM pshisdata AS a WHERE a.taglongname = '" + tagName + "' " +
                   "AND a.times >= '" + startTime + "' AND a.times <= '" + endTime + "' ORDER BY a.times ASC limitpage 1,9999";
            dt = dataService.queryListDataBySql(sql3);
        }
        
        // 按采样窗口分组并计算平均值
        Map<String, List<BigDecimal>> windowDataMap = new LinkedHashMap<>();
        
        for (int i = 0; i < dt.getRows().size(); i++) {
            DataRow row = dt.getDataRow(i);
            try {
                Object timeObj = row.getValue(1);
                Object hisvalObj = row.getValue(2);
                
                if (timeObj == null || hisvalObj == null) {
                    continue;
                }
                
                String timeStr = timeObj.toString();
                BigDecimal value = new BigDecimal(hisvalObj.toString());
                
                // 解析时间
                LocalDateTime time = null;
                try {
                    // 尝试解析完整格式（包含秒和毫秒）
                    time = LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"));
                } catch (Exception e1) {
                    try {
                        // 尝试解析标准格式（包含秒）
                        time = LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                    } catch (Exception e2) {
                        // 如果解析失败，跳过这条数据
                        continue;
                    }
                }
                
                // 只处理结束时间之前的数据
                if (time.isAfter(endDateTime)) {
                    continue;
                }
                
                // 计算该时间点属于哪个采样窗口（向下取整到1分钟）
                int minutesFromStart = (int) java.time.Duration.between(startDateTime, time).toMinutes();
                int windowIndex = minutesFromStart / samplingIntervalMinutes;
                if (windowIndex >= 0 && windowIndex < totalPoints) {
                    LocalDateTime windowStart = startDateTime.plusMinutes(windowIndex * samplingIntervalMinutes);
                    // 确保窗口开始时间不超过结束时间
                    if (windowStart.isAfter(endDateTime)) {
                        continue;
                    }
                    String windowKey = windowStart.format(DateTimeFormatter.ofPattern("HH:mm"));
                    
                    // 将数据添加到对应窗口的列表中
                    if (!windowDataMap.containsKey(windowKey)) {
                        windowDataMap.put(windowKey, new ArrayList<>());
                    }
                    windowDataMap.get(windowKey).add(value);
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        // 对每个采样窗口计算平均值（只处理xList中存在的时间点）
        for (String timeKey : xList) {
            List<BigDecimal> values = windowDataMap.get(timeKey);
            if (values != null && values.size() > 0) {
                // 计算平均值
                BigDecimal sum = BigDecimal.ZERO;
                for (BigDecimal val : values) {
                    sum = sum.add(val);
                }
                BigDecimal avg = sum.divide(new BigDecimal(values.size()), 2, RoundingMode.HALF_UP);
                yList.add(avg.toString());
            } else {
                // 如果没有数据，填充0
                yList.add("0.00");
            }
        }
        
        // 确保yList的长度与xList一致（如果xList被截断了，yList也需要相应截断）
        while (yList.size() > xList.size()) {
            yList.remove(yList.size() - 1);
        }
        while (yList.size() < xList.size()) {
            yList.add("0.00");
        }
        
    } catch (Exception e) {
        // 如果查询失败，填充0值（只填充xList中对应的时间点）
        while (yList.size() < xList.size()) {
            yList.add("0.00");
        }
        data.put("queryError", e.getMessage());
        data.put("querySql1", sql1);
        data.put("querySql2", sql2 != null && !sql2.equals("") ? sql2 : "");
        data.put("querySql3", sql3 != null && !sql3.equals("") ? sql3 : "");
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    return result;
}