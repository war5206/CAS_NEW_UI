// COP 查询
/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
 */

import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dao.data.DataRow;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;

def dataService = ApplicationContextProvider.getBean(DataService.class);

// 获取参数
String cycle = data.get("cycle");
String startDate = data.get("startDate");
String endDate = data.get("endDate");
String comparison = data.get("comparison");
String copType = data.get("copType") ?: "COP";

// 移除已使用的参数
data.remove("cycle");
data.remove("startDate");
data.remove("endDate");
data.remove("comparison");
data.remove("copType");

DateTimeFormatter dDF = DateTimeFormatter.ofPattern("yyyy-MM-dd");
DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
DateTimeFormatter hDF = DateTimeFormatter.ofPattern("HH:mm");


// 通用历史数据查询函数（返回带时间信息的数据）
List<Map<String, Object>> queryHistoryDataWithTime(List<String> tagList, String startTime, String endTime, DataService dataService) {
    List<Map<String, Object>> result = new ArrayList<>();
    if (tagList.isEmpty()) {
        return result;
    }
    
    StringBuilder tagListStr = new StringBuilder();
    for (String tag : tagList) {
        tagListStr.append("'").append(tag.replace("'", "''")).append("',");
    }
    if (tagListStr.length() > 0) {
        tagListStr.delete(tagListStr.length() - 1, tagListStr.length());
    }
    
    try {
        String sql = "SELECT a.taglongname,a.times,a.hisval FROM pshisdata AS a WHERE a.taglongname = '" + tagListStr.toString() + "' " + 
        "AND a.starttime ='" + startTime + "' AND a.endtime = '" + endTime + "' limitpage 1,200";
        
        DataTable dt = dataService.queryListDataBySql(sql);
        
        if (dt != null) {
            for (int i = 0; i < dt.getRows().size(); i++) {
                DataRow row = dt.getDataRow(i);
                try {
                    Map<String, Object> map = new HashMap<>();
                    Object taglongname = row.getValue(0);
                    Object time = row.getValue(1);
                    Object hisval = row.getValue(2);
                    
                    map.put("taglongname", taglongname != null ? taglongname.toString() : "");
                    map.put("time", time != null ? time.toString() : "");
                    map.put("hisval", hisval != null ? hisval.toString() : "");
                    result.add(map);
                } catch (Exception e) {
                    continue;
                }
            }
        }
    } catch (Exception e) {
        data.put("queryError", e.getMessage());
    }
    return result;
}

// 根据COP类型和周期生成标签列表
List<String> getCopTagList(String copType, String periodType) {
    List<String> tagList = new ArrayList<>();

    // 日周期使用独立点位
    if (periodType.equals("day")) {
        String dayBaseTag = "Sys\\FinforWorx\\EneryCost\\";
        if (copType.equals("heat-cop")) {
            tagList.add(dayBaseTag + "Heat_Daily_COP");
        } else if (copType.equals("cold-cop")) {
            tagList.add(dayBaseTag + "Cold_Daily_COP");
        } else {
            tagList.add(dayBaseTag + "System_Daily_COP");
        }
        return tagList;
    }

    String baseTag = "Sys\\FinforWorx\\EC\\";
    String prefix = "";
    if (copType.equals("heat-cop")) {
        prefix = "HP_COP";
    } else if (copType.equals("cold-cop")) {
        prefix = "WSHP_COP";
    } else {
        prefix = "COP";
    }
    String suffix = "";

    switch(periodType) {
        case "oneday":
        case "singleday":
            suffix = "_hour_zizhi";
            break;
        case "sevendays":
        case "week":
            suffix = "_day_zizhi";
            break;
        case "month":
            suffix = "_month_zizhi";
            break;
        case "year":
            suffix = "_year_zizhi";
            break;
        case "heatingseason":
            suffix = "_month";
            break;
    }

    tagList.add(baseTag + prefix + suffix);
    return tagList;
}

// 处理最近24小时周期
Map<String, Object> processOneDay(LocalDateTime baseTime, String copType, DataService dataService) {
    DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    DateTimeFormatter hDF = DateTimeFormatter.ofPattern("HH:mm");
    
    Map<String, Object> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    List<String> timeList = new ArrayList<>(); // 用于前端时间对应检查
    
    List<String> tagList = getCopTagList(copType, "oneday");
    LocalDateTime endTime = (baseTime != null ? baseTime : LocalDateTime.now()).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime startTime = endTime.minusHours(23);
    
    // 查询时间范围：从startTime的下一个小时开始到endTime的下一个小时+6分钟
    String queryStartTime = startTime.plusHours(1).format(sDF);
    String queryEndTime = endTime.plusHours(1).plusMinutes(6).format(sDF);
    
    List<Map<String, Object>> historyData = queryHistoryDataWithTime(tagList, queryStartTime, queryEndTime, dataService);
    
    // 按小时分组数据
    Map<String, List<Map<String, Object>>> hourDataMap = new LinkedHashMap<>();
    for (int hour = 0; hour < 24; hour++) {
        LocalDateTime hourTime = startTime.plusHours(hour);
        String hourKey = hourTime.format(hDF);
        xList.add(hourKey);
        hourDataMap.put(hourKey, new ArrayList<>());
    }
    
    // 将查询到的数据分配到对应的小时
    for (Map<String, Object> dataItem : historyData) {
        try {
            String timeStr = dataItem.get("time").toString();
            LocalDateTime dataTime = LocalDateTime.parse(timeStr.substring(0, 19), sDF);
            LocalDateTime dataHour = dataTime.withMinute(0).withSecond(0).withNano(0);
            
            String xAxisKey = dataHour.format(hDF);
            
            if (hourDataMap.containsKey(xAxisKey)) {
                hourDataMap.get(xAxisKey).add(dataItem);
            }
        } catch (Exception e) {
            continue;
        }
    }
    
    // 计算每个小时的值
    for (String hourKey : xList) {
        List<Map<String, Object>> hourData = hourDataMap.get(hourKey);
        BigDecimal totalValue = BigDecimal.ZERO;
        String latestTime = "";
        
        // 取该小时内所有设备的最大值
        Map<String, BigDecimal> deviceMaxMap = new HashMap<>();
        for (Map<String, Object> item : hourData) {
            try {
                String tag = item.get("taglongname").toString();
                BigDecimal value = new BigDecimal(item.get("hisval").toString());
                // 负数置为0
                if (value.compareTo(BigDecimal.ZERO) < 0) {
                    value = BigDecimal.ZERO;
                }
                if (!deviceMaxMap.containsKey(tag) || value.compareTo(deviceMaxMap.get(tag)) > 0) {
                    deviceMaxMap.put(tag, value);
                    latestTime = item.get("time").toString();
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        for (BigDecimal value : deviceMaxMap.values()) {
            totalValue = totalValue.add(value);
        }
        
        yList.add(totalValue.setScale(2, RoundingMode.HALF_UP).toString());
        timeList.add(latestTime); // 记录该x轴对应的实际数据时间
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    result.put("timeList", timeList); // 返回时间列表供前端检查
    return result;
}

// 处理单日周期
Map<String, Object> processSingleDay(LocalDateTime dayTime, String copType, DataService dataService) {
    DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    DateTimeFormatter hDF = DateTimeFormatter.ofPattern("HH:mm");
    
    Map<String, Object> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    List<String> timeList = new ArrayList<>();
    
    List<String> tagList = getCopTagList(copType, "singleday");
    LocalDateTime dayStart = dayTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
    
    // 查询下一天0点到下一天24点+6分钟的数据（对应x轴的00:00到23:00）
    String queryStartTime = dayStart.plusHours(1).format(sDF);
    String queryEndTime = dayStart.plusDays(1).plusHours(1).plusMinutes(6).format(sDF);
    
    List<Map<String, Object>> historyData = queryHistoryDataWithTime(tagList, queryStartTime, queryEndTime, dataService);
    
    // 按小时分组
    Map<String, List<Map<String, Object>>> hourDataMap = new LinkedHashMap<>();
    for (int hour = 0; hour < 24; hour++) {
        int displayHour = hour + 1;
        String hourKey = displayHour == 24 ? "24:00" : String.format("%02d:00", displayHour);
        xList.add(hourKey);
        hourDataMap.put(hourKey, new ArrayList<>());
    }
    
    // 分配数据
    for (Map<String, Object> dataItem : historyData) {
        try {
            String timeStr = dataItem.get("time").toString();
            LocalDateTime dataTime = LocalDateTime.parse(timeStr.substring(0, 19), sDF);
            LocalDateTime dataHour = dataTime.withMinute(0).withSecond(0).withNano(0);
            
            // x轴显示的是前一个小时
            LocalDateTime xAxisHour = dataHour.minusHours(1);
            int hour = xAxisHour.getHour();
            String xAxisKey = hour == 23 ? "24:00" : String.format("%02d:00", hour + 1);
            
            if (hourDataMap.containsKey(xAxisKey)) {
                hourDataMap.get(xAxisKey).add(dataItem);
            }
        } catch (Exception e) {
            continue;
        }
    }
    
    // 计算值
    for (String hourKey : xList) {
        List<Map<String, Object>> hourData = hourDataMap.get(hourKey);
        BigDecimal totalValue = BigDecimal.ZERO;
        String latestTime = "";
        
        Map<String, BigDecimal> deviceMaxMap = new HashMap<>();
        for (Map<String, Object> item : hourData) {
            try {
                String tag = item.get("taglongname").toString();
                BigDecimal value = new BigDecimal(item.get("hisval").toString());
                // 负数置为0
                if (value.compareTo(BigDecimal.ZERO) < 0) {
                    value = BigDecimal.ZERO;
                }
                if (!deviceMaxMap.containsKey(tag) || value.compareTo(deviceMaxMap.get(tag)) > 0) {
                    deviceMaxMap.put(tag, value);
                    latestTime = item.get("time").toString();
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        for (BigDecimal value : deviceMaxMap.values()) {
            totalValue = totalValue.add(value);
        }
        
        yList.add(totalValue.setScale(2, RoundingMode.HALF_UP).toString());
        timeList.add(latestTime);
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    result.put("timeList", timeList);
    return result;
}

// 处理最近7天周期
Map<String, Object> processSevenDays(LocalDateTime baseTime, String copType, DataService dataService) {
    DateTimeFormatter dDF = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    Map<String, Object> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    List<String> timeList = new ArrayList<>();
    
    List<String> tagList = getCopTagList(copType, "sevendays");
    LocalDateTime endDate = (baseTime != null ? baseTime : LocalDateTime.now()).withHour(0).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime startDate = endDate.minusDays(6);
    
    // 查询从startDate的下一天0点到endDate的下一天0点+6分钟的数据
    String queryStartTime = startDate.plusDays(1).format(sDF);
    String queryEndTime = endDate.plusDays(1).plusMinutes(6).format(sDF);
    
    List<Map<String, Object>> historyData = queryHistoryDataWithTime(tagList, queryStartTime, queryEndTime, dataService);
    
    // 按天分组
    Map<String, List<Map<String, Object>>> dayDataMap = new LinkedHashMap<>();
    for (int day = 0; day < 7; day++) {
        LocalDateTime dayTime = startDate.plusDays(day);
        String dayKey = dayTime.format(dDF);
        String[] parts = dayKey.split("-");
        xList.add(parts[1] + "-" + parts[2]);
        dayDataMap.put(dayKey, new ArrayList<>());
    }
    
    // 分配数据
    for (Map<String, Object> dataItem : historyData) {
        try {
            String timeStr = dataItem.get("time").toString();
            LocalDateTime dataTime = LocalDateTime.parse(timeStr.substring(0, 19), sDF);
            LocalDate dataDate = dataTime.toLocalDate();
            
            // x轴显示的是前一天
            LocalDate xAxisDate = dataDate.minusDays(1);
            String xAxisKey = xAxisDate.format(dDF);
            
            if (dayDataMap.containsKey(xAxisKey)) {
                dayDataMap.get(xAxisKey).add(dataItem);
            }
        } catch (Exception e) {
            continue;
        }
    }
    
    // 计算值
    for (int day = 0; day < 7; day++) {
        LocalDateTime dayTime = startDate.plusDays(day);
        String dayKey = dayTime.format(dDF);
        List<Map<String, Object>> dayData = dayDataMap.get(dayKey);
        
        BigDecimal totalValue = BigDecimal.ZERO;
        String latestTime = "";
        
        Map<String, BigDecimal> deviceMaxMap = new HashMap<>();
        for (Map<String, Object> item : dayData) {
            try {
                String tag = item.get("taglongname").toString();
                BigDecimal value = new BigDecimal(item.get("hisval").toString());
                // 负数置为0
                if (value.compareTo(BigDecimal.ZERO) < 0) {
                    value = BigDecimal.ZERO;
                }
                if (!deviceMaxMap.containsKey(tag) || value.compareTo(deviceMaxMap.get(tag)) > 0) {
                    deviceMaxMap.put(tag, value);
                    latestTime = item.get("time").toString();
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        for (BigDecimal value : deviceMaxMap.values()) {
            totalValue = totalValue.add(value);
        }
        
        yList.add(totalValue.setScale(2, RoundingMode.HALF_UP).toString());
        timeList.add(latestTime);
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    result.put("timeList", timeList);
    return result;
}

// 处理周周期
Map<String, Object> processWeek(LocalDateTime startDateTime, LocalDateTime endDateTime, String copType, DataService dataService) {
    DateTimeFormatter dDF = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    Map<String, Object> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    List<String> timeList = new ArrayList<>();
    
    List<String> tagList = getCopTagList(copType, "week");
    
    // 查询从开始日期的下一天0点到结束日期的下一天0点+6分钟的数据
    String queryStartTime = startDateTime.plusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0).format(sDF);
    String queryEndTime = endDateTime.plusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0).plusMinutes(6).format(sDF);
    
    List<Map<String, Object>> historyData = queryHistoryDataWithTime(tagList, queryStartTime, queryEndTime, dataService);
    
    // 生成x轴和分组
    Map<String, List<Map<String, Object>>> dayDataMap = new LinkedHashMap<>();
    LocalDateTime current = startDateTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime end = endDateTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
    
    while (!current.isAfter(end)) {
        String dayKey = current.format(dDF);
        String[] parts = dayKey.split("-");
        xList.add(parts[1] + "-" + parts[2]);
        dayDataMap.put(dayKey, new ArrayList<>());
        current = current.plusDays(1);
    }
    
    // 分配数据
    for (Map<String, Object> dataItem : historyData) {
        try {
            String timeStr = dataItem.get("time").toString();
            LocalDateTime dataTime = LocalDateTime.parse(timeStr.substring(0, 19), sDF);
            LocalDate dataDate = dataTime.toLocalDate();
            LocalDate xAxisDate = dataDate.minusDays(1);
            String xAxisKey = xAxisDate.format(dDF);
            
            if (dayDataMap.containsKey(xAxisKey)) {
                dayDataMap.get(xAxisKey).add(dataItem);
            }
        } catch (Exception e) {
            continue;
        }
    }
    
    // 计算值
    current = startDateTime.withHour(0).withMinute(0).withSecond(0).withNano(0);
    while (!current.isAfter(end)) {
        String dayKey = current.format(dDF);
        List<Map<String, Object>> dayData = dayDataMap.get(dayKey);
        
        BigDecimal totalValue = BigDecimal.ZERO;
        String latestTime = "";
        
        Map<String, BigDecimal> deviceMaxMap = new HashMap<>();
        for (Map<String, Object> item : dayData) {
            try {
                String tag = item.get("taglongname").toString();
                BigDecimal value = new BigDecimal(item.get("hisval").toString());
                // 负数置为0
                if (value.compareTo(BigDecimal.ZERO) < 0) {
                    value = BigDecimal.ZERO;
                }
                if (!deviceMaxMap.containsKey(tag) || value.compareTo(deviceMaxMap.get(tag)) > 0) {
                    deviceMaxMap.put(tag, value);
                    latestTime = item.get("time").toString();
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        for (BigDecimal value : deviceMaxMap.values()) {
            totalValue = totalValue.add(value);
        }
        
        yList.add(totalValue.setScale(2, RoundingMode.HALF_UP).toString());
        timeList.add(latestTime);
        current = current.plusDays(1);
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    result.put("timeList", timeList);
    return result;
}

// 处理月度周期（按天显示）
Map<String, Object> processMonthDays(LocalDateTime monthTime, String copType, DataService dataService) {
    DateTimeFormatter dDF = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    Map<String, Object> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    List<String> timeList = new ArrayList<>();
    
    List<String> tagList = getCopTagList(copType, "day");
    LocalDateTime monthStart = monthTime.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime monthEnd = monthStart.plusMonths(1);
    
    // 查询整月数据（只取每天23:57-23:59的数据）
    String queryStartTime = monthStart.format(sDF);
    String queryEndTime = monthEnd.format(sDF);
    
    List<Map<String, Object>> historyData = queryHistoryDataWithTime(tagList, queryStartTime, queryEndTime, dataService);
    
    // 生成x轴
    Map<String, List<Map<String, Object>>> dayDataMap = new LinkedHashMap<>();
    LocalDateTime current = monthStart;
    while (current.isBefore(monthEnd)) {
        String dayKey = current.format(dDF);
        xList.add(dayKey.split("-")[1] + "-" + dayKey.split("-")[2]);
        dayDataMap.put(dayKey, new ArrayList<>());
        current = current.plusDays(1);
    }
    
    // 分配数据：同一天的数据直接映射到对应的x轴（无偏移），且只取23:57-23:59的数据
    for (Map<String, Object> dataItem : historyData) {
        try {
            String timeStr = dataItem.get("time").toString();
            LocalDateTime dataTime = LocalDateTime.parse(timeStr.substring(0, 19), sDF);
            LocalTime dataClock = dataTime.toLocalTime();
            // 只取23:57-23:59的数据
            if (!dataClock.isBefore(LocalTime.of(23, 57)) && !dataClock.isAfter(LocalTime.of(23, 59, 59))) {
                LocalDate dataDate = dataTime.toLocalDate();
                String xAxisKey = dataDate.format(dDF);
                if (dayDataMap.containsKey(xAxisKey)) {
                    dayDataMap.get(xAxisKey).add(dataItem);
                }
            }
        } catch (Exception e) {
            continue;
        }
    }
    
    // 计算值：取当天最后一个非零值
    current = monthStart;
    while (current.isBefore(monthEnd)) {
        String dayKey = current.format(dDF);
        List<Map<String, Object>> dayData = dayDataMap.get(dayKey);
        
        BigDecimal lastNonZeroValue = BigDecimal.ZERO;
        String latestTime = "";
        
        if (dayData != null && !dayData.isEmpty()) {
            dayData.sort { a, b -> a.get("time").toString() <=> b.get("time").toString() };
        }
        
        // 按时间排序后取最后一个非零值
        for (Map<String, Object> item : dayData) {
            try {
                BigDecimal value = new BigDecimal(item.get("hisval").toString());
                if (value.compareTo(BigDecimal.ZERO) > 0) {
                    lastNonZeroValue = value;
                    latestTime = item.get("time").toString();
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        yList.add(lastNonZeroValue.setScale(2, RoundingMode.HALF_UP).toString());
        timeList.add(latestTime);
        current = current.plusDays(1);
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    result.put("timeList", timeList);
    return result;
}

// 按日号将对比月数据对齐到当前月 x 轴（如 06-15 对 05-15 / 去年 06-15）
List<String> alignDayComparisonList(List<String> currentXList, Map<String, Object> comparisonResult) {
    List<String> aligned = new ArrayList<>();
    List<String> comparisonXList = (List<String>) comparisonResult.get("xList");
    List<String> comparisonYList = (List<String>) comparisonResult.get("yList");
    Map<String, String> dayValueMap = new LinkedHashMap<>();

    if (comparisonXList != null && comparisonYList != null) {
        for (int i = 0; i < comparisonXList.size() && i < comparisonYList.size(); i++) {
            String[] parts = comparisonXList.get(i).split("-");
            if (parts.length >= 2) {
                dayValueMap.put(parts[1], comparisonYList.get(i));
            }
        }
    }

    for (String currentLabel : currentXList) {
        String[] parts = currentLabel.split("-");
        if (parts.length >= 2) {
            String value = dayValueMap.get(parts[1]);
            aligned.add(value != null ? value : "");
        } else {
            aligned.add("");
        }
    }

    return aligned;
}

// 处理月周期（按月显示）
Map<String, Object> processMonths(LocalDateTime startDateTime, LocalDateTime endDateTime, String copType, DataService dataService) {
    DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    Map<String, Object> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    List<String> timeList = new ArrayList<>();
    
    List<String> tagList = getCopTagList(copType, "month");
    
    // 查询从下个月1号到下下个月1号+6分钟的数据
    LocalDateTime queryStart = startDateTime.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0).plusMonths(1);
    LocalDateTime queryEnd = endDateTime.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0).plusMonths(1);
    
    String queryStartTime = queryStart.format(sDF);
    String queryEndTime = queryEnd.plusMinutes(6).format(sDF);
    
    List<Map<String, Object>> historyData = queryHistoryDataWithTime(tagList, queryStartTime, queryEndTime, dataService);
    
    // 生成x轴和分组
    Map<String, List<Map<String, Object>>> monthDataMap = new LinkedHashMap<>();
    LocalDateTime xListCurrent = startDateTime.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime current = xListCurrent;
    LocalDateTime end = endDateTime.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    
    while (!current.isAfter(end)) {
        String monthKey = xListCurrent.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        xList.add(monthKey.split("-")[0] + "年" + monthKey.split("-")[1] + "月");
        monthDataMap.put(monthKey, new ArrayList<>());
        xListCurrent = xListCurrent.plusMonths(1);
        current = current.plusMonths(1);
    }
    
    // 分配数据
    for (Map<String, Object> dataItem : historyData) {
        try {
            String timeStr = dataItem.get("time").toString();
            LocalDateTime dataTime = LocalDateTime.parse(timeStr.substring(0, 19), sDF);
            LocalDate dataDate = dataTime.toLocalDate();
            LocalDate xAxisDate = dataDate.minusMonths(1);
            String xAxisKey = xAxisDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            
            if (monthDataMap.containsKey(xAxisKey)) {
                monthDataMap.get(xAxisKey).add(dataItem);
            }
        } catch (Exception e) {
            continue;
        }
    }
    
    // 计算值
    xListCurrent = startDateTime.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    current = xListCurrent;
    while (!current.isAfter(end)) {
        String monthKey = xListCurrent.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        List<Map<String, Object>> monthData = monthDataMap.get(monthKey);
        
        BigDecimal totalValue = BigDecimal.ZERO;
        String latestTime = "";
        
        Map<String, BigDecimal> deviceMaxMap = new HashMap<>();
        for (Map<String, Object> item : monthData) {
            try {
                String tag = item.get("taglongname").toString();
                BigDecimal value = new BigDecimal(item.get("hisval").toString());
                // 负数置为0
                if (value.compareTo(BigDecimal.ZERO) < 0) {
                    value = BigDecimal.ZERO;
                }
                if (!deviceMaxMap.containsKey(tag) || value.compareTo(deviceMaxMap.get(tag)) > 0) {
                    deviceMaxMap.put(tag, value);
                    latestTime = item.get("time").toString();
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        for (BigDecimal value : deviceMaxMap.values()) {
            totalValue = totalValue.add(value);
        }
        
        yList.add(totalValue.setScale(2, RoundingMode.HALF_UP).toString());
        timeList.add(latestTime);
        xListCurrent = xListCurrent.plusMonths(1);
        current = current.plusMonths(1);
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    result.put("timeList", timeList);
    return result;
}

// 处理年周期
Map<String, Object> processYears(LocalDateTime startDateTime, LocalDateTime endDateTime, String copType, DataService dataService) {
    DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    Map<String, Object> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    List<String> timeList = new ArrayList<>();
    
    List<String> tagList = getCopTagList(copType, "year");
    
    // 查询从下一年1月1号到下下一年1月1号+6分钟的数据
    LocalDateTime queryStart = startDateTime.plusYears(1).withMonth(1).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime queryEnd = endDateTime.plusYears(1).withMonth(1).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    
    String queryStartTime = queryStart.format(sDF);
    String queryEndTime = queryEnd.plusMinutes(6).format(sDF);
    
    List<Map<String, Object>> historyData = queryHistoryDataWithTime(tagList, queryStartTime, queryEndTime, dataService);
    
    // 生成x轴和分组
    Map<String, List<Map<String, Object>>> yearDataMap = new LinkedHashMap<>();
    LocalDateTime xListCurrent = startDateTime.withMonth(1).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime current = queryStart;
    
    while (current.isBefore(queryEnd)) {
        int year = xListCurrent.getYear();
        xList.add(year + "年");
        yearDataMap.put(String.valueOf(year), new ArrayList<>());
        xListCurrent = xListCurrent.plusYears(1);
        current = current.plusYears(1);
    }
    
    // 分配数据
    for (Map<String, Object> dataItem : historyData) {
        try {
            String timeStr = dataItem.get("time").toString();
            LocalDateTime dataTime = LocalDateTime.parse(timeStr.substring(0, 19), sDF);
            int dataYear = dataTime.getYear();
            int xAxisYear = dataYear - 1;
            String xAxisKey = String.valueOf(xAxisYear);
            
            if (yearDataMap.containsKey(xAxisKey)) {
                yearDataMap.get(xAxisKey).add(dataItem);
            }
        } catch (Exception e) {
            continue;
        }
    }
    
    // 计算值
    xListCurrent = startDateTime.withMonth(1).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    current = queryStart;
    while (current.isBefore(queryEnd)) {
        int year = xListCurrent.getYear();
        List<Map<String, Object>> yearData = yearDataMap.get(String.valueOf(year));
        
        BigDecimal totalValue = BigDecimal.ZERO;
        String latestTime = "";
        
        Map<String, BigDecimal> deviceMaxMap = new HashMap<>();
        for (Map<String, Object> item : yearData) {
            try {
                String tag = item.get("taglongname").toString();
                BigDecimal value = new BigDecimal(item.get("hisval").toString());
                // 负数置为0
                if (value.compareTo(BigDecimal.ZERO) < 0) {
                    value = BigDecimal.ZERO;
                }
                if (!deviceMaxMap.containsKey(tag) || value.compareTo(deviceMaxMap.get(tag)) > 0) {
                    deviceMaxMap.put(tag, value);
                    latestTime = item.get("time").toString();
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        for (BigDecimal value : deviceMaxMap.values()) {
            totalValue = totalValue.add(value);
        }
        
        yList.add(totalValue.setScale(2, RoundingMode.HALF_UP).toString());
        timeList.add(latestTime);
        xListCurrent = xListCurrent.plusYears(1);
        current = current.plusYears(1);
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    result.put("timeList", timeList);
    return result;
}

// 处理采暖季周期
Map<String, Object> processHeatingSeason(LocalDateTime startDateTime, LocalDateTime endDateTime, String copType, DataService dataService) {
    DateTimeFormatter sDF = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    Map<String, Object> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();
    List<String> timeList = new ArrayList<>();
    
    List<String> tagList = getCopTagList(copType, "heatingseason"); // 采暖季使用月数据
    
    // 查询从下个月1号到下下个月1号+6分钟的数据
    LocalDateTime queryStart = startDateTime.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime queryEnd = endDateTime.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    
    String queryStartTime = queryStart.format(sDF);
    String queryEndTime = queryEnd.plusMinutes(6).format(sDF);
    
    List<Map<String, Object>> historyData = queryHistoryDataWithTime(tagList, queryStartTime, queryEndTime, dataService);
    
    // 生成x轴和分组
    Map<String, List<Map<String, Object>>> monthDataMap = new LinkedHashMap<>();
    LocalDateTime xListCurrent = startDateTime.minusMonths(1).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    LocalDateTime current = queryStart;
    
    while (!current.isAfter(queryEnd)) {
        String monthKey = xListCurrent.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        xList.add(monthKey.split("-")[0] + "年" + monthKey.split("-")[1] + "月");
        monthDataMap.put(monthKey, new ArrayList<>());
        xListCurrent = xListCurrent.plusMonths(1);
        current = current.plusMonths(1);
    }
    
    // 分配数据
    for (Map<String, Object> dataItem : historyData) {
        try {
            String timeStr = dataItem.get("time").toString();
            LocalDateTime dataTime = LocalDateTime.parse(timeStr.substring(0, 19), sDF);
            LocalDate dataDate = dataTime.toLocalDate();
            LocalDate xAxisDate = dataDate.minusMonths(1);
            String xAxisKey = xAxisDate.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            
            if (monthDataMap.containsKey(xAxisKey)) {
                monthDataMap.get(xAxisKey).add(dataItem);
            }
        } catch (Exception e) {
            continue;
        }
    }
    
    // 计算值
    xListCurrent = startDateTime.minusMonths(1).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    current = queryStart;
    while (!current.isAfter(queryEnd)) {
        String monthKey = xListCurrent.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        List<Map<String, Object>> monthData = monthDataMap.get(monthKey);
        
        BigDecimal totalValue = BigDecimal.ZERO;
        String latestTime = "";
        
        Map<String, BigDecimal> deviceMaxMap = new HashMap<>();
        for (Map<String, Object> item : monthData) {
            try {
                String tag = item.get("taglongname").toString();
                BigDecimal value = new BigDecimal(item.get("hisval").toString());
                // 负数置为0
                if (value.compareTo(BigDecimal.ZERO) < 0) {
                    value = BigDecimal.ZERO;
                }
                if (!deviceMaxMap.containsKey(tag) || value.compareTo(deviceMaxMap.get(tag)) > 0) {
                    deviceMaxMap.put(tag, value);
                    latestTime = item.get("time").toString();
                }
            } catch (Exception e) {
                continue;
            }
        }
        
        for (BigDecimal value : deviceMaxMap.values()) {
            totalValue = totalValue.add(value);
        }
        
        yList.add(totalValue.setScale(2, RoundingMode.HALF_UP).toString());
        timeList.add(latestTime);
        xListCurrent = xListCurrent.plusMonths(1);
        current = current.plusMonths(1);
    }
    
    result.put("xList", xList);
    result.put("yList", yList);
    result.put("timeList", timeList);
    return result;
}

// 主逻辑：解析周期参数
LocalDateTime startLocalDateTime = null;
LocalDateTime endLocalDateTime = null;
String cycleType = "";

if (cycle.equals("最近24小时") || cycle.equals("1天")) {
    cycleType = "oneday";
    // 设置当前时间为结束时间，24小时前为开始时间（用于对比数据计算）
    LocalDateTime now = LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);
    endLocalDateTime = now;
    startLocalDateTime = now.minusHours(23);
} else if (cycle.equals("最近7天") || cycle.equals("7天")) {
    cycleType = "sevendays";
    // 设置当前日期为结束日期，7天前为开始日期（用于对比数据计算）
    LocalDateTime now = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
    endLocalDateTime = now;
    startLocalDateTime = now.minusDays(6);
} else if (cycle.equals("单日")) {
    cycleType = "singleday";
    if (startDate == null || startDate.isEmpty()) {
        data.put("state", "fail");
        data.put("message", "单日周期：请选择日期");
        return data;
    }
    if (endDate != null && !endDate.isEmpty() && !endDate.equals(startDate)) {
        data.put("state", "fail");
        data.put("message", "单日周期：开始时间和结束时间必须相同");
        return data;
    }
    LocalDate startLocalDate = LocalDate.parse(startDate, dDF);
    startLocalDateTime = LocalDateTime.of(startLocalDate, LocalTime.of(0, 0, 0));
    endLocalDateTime = LocalDateTime.of(startLocalDate, LocalTime.of(0, 0, 0));
} else if (cycle.equals("周")) {
    cycleType = "week";
    if (startDate == null || startDate.isEmpty() || endDate == null || endDate.isEmpty()) {
        data.put("state", "fail");
        data.put("message", "周周期：请选择开始时间和结束时间");
        return data;
    }
    LocalDate startLocalDate = LocalDate.parse(startDate, dDF);
    LocalDate endLocalDate = LocalDate.parse(endDate, dDF);
    long daysBetween = ChronoUnit.DAYS.between(startLocalDate, endLocalDate);
    if (daysBetween != 6) {
        data.put("state", "fail");
        data.put("message", "周周期：结束时间必须比开始时间晚6天（共7天）");
        return data;
    }
    startLocalDateTime = LocalDateTime.of(startLocalDate, LocalTime.of(0, 0, 0));
    endLocalDateTime = LocalDateTime.of(endLocalDate, LocalTime.of(0, 0, 0));
} else if (cycle.equals("月度") || cycle.equals("日")) {
    cycleType = "day";
    if (startDate == null || startDate.isEmpty()) {
        data.put("state", "fail");
        data.put("message", "月度周期：请选择月份");
        return data;
    }
    String monthStr = startDate.length() >= 7 ? startDate.substring(0, 7) : startDate;
    LocalDate startLocalDate = LocalDate.parse(monthStr + "-01", dDF);
    startLocalDateTime = LocalDateTime.of(startLocalDate, LocalTime.of(0, 0, 0));
    // 设置结束时间为该月最后一天（用于对比数据计算）
    LocalDate monthEndDate = startLocalDate.plusMonths(1).minusDays(1);
    endLocalDateTime = LocalDateTime.of(monthEndDate, LocalTime.of(0, 0, 0));
} else if (cycle.equals("月")) {
    cycleType = "month";
    if (startDate == null || startDate.isEmpty() || endDate == null || endDate.isEmpty()) {
        data.put("state", "fail");
        data.put("message", "月周期：请选择开始月份和结束月份");
        return data;
    }
    String startMonthStr = startDate.length() >= 7 ? startDate.substring(0, 7) : startDate;
    String endMonthStr = endDate.length() >= 7 ? endDate.substring(0, 7) : endDate;
    LocalDate startLocalDate = LocalDate.parse(startMonthStr + "-01", dDF);
    LocalDate endLocalDate = LocalDate.parse(endMonthStr + "-01", dDF);
    // 注意：这里不加月份，因为processMonths函数内部会处理数据查询的时间偏移
    // x轴应该显示用户选择的月份，而不是加1个月后的月份
    startLocalDateTime = LocalDateTime.of(startLocalDate, LocalTime.of(0, 0, 0));
    endLocalDateTime = LocalDateTime.of(endLocalDate, LocalTime.of(0, 0, 0));
} else if (cycle.equals("年")) {
    cycleType = "year";
    if (startDate == null || startDate.isEmpty() || endDate == null || endDate.isEmpty()) {
        data.put("state", "fail");
        data.put("message", "年周期：请选择开始年份和结束年份");
        return data;
    }
    int startYear = Integer.parseInt(startDate.substring(0, 4));
    int endYear = Integer.parseInt(endDate.substring(0, 4));
    startLocalDateTime = LocalDateTime.of(startYear, 2, 1, 0, 0, 0);
    endLocalDateTime = LocalDateTime.of(endYear + 1, 1, 1, 0, 0, 0);
} else if (cycle.equals("采暖季")) {
    cycleType = "heatingseason";
    if (startDate == null || startDate.isEmpty() || endDate == null || endDate.isEmpty()) {
        data.put("state", "fail");
        data.put("message", "采暖季周期：请选择开始月份和结束月份");
        return data;
    }
    String startMonthStr = startDate.length() >= 7 ? startDate.substring(0, 7) : startDate;
    String endMonthStr = endDate.length() >= 7 ? endDate.substring(0, 7) : endDate;
    LocalDate startLocalDate = LocalDate.parse(startMonthStr + "-01", dDF);
    LocalDate endLocalDate = LocalDate.parse(endMonthStr + "-01", dDF);
    startLocalDateTime = LocalDateTime.of(startLocalDate.plusMonths(1), LocalTime.of(0, 0, 0));
    endLocalDateTime = LocalDateTime.of(endLocalDate.plusMonths(1), LocalTime.of(0, 0, 0));
} else {
    data.put("state", "fail");
    data.put("message", "时间周期异常");
    return data;
}

// 处理数据
Map<String, Object> result;
switch(cycleType) {
    case "oneday":
        result = processOneDay(null, copType, dataService);
        break;
    case "sevendays":
        result = processSevenDays(null, copType, dataService);
        break;
    case "singleday":
        result = processSingleDay(startLocalDateTime, copType, dataService);
        break;
    case "week":
        result = processWeek(startLocalDateTime, endLocalDateTime, copType, dataService);
        break;
    case "day":
        result = processMonthDays(startLocalDateTime, copType, dataService);
        break;
    case "month":
        result = processMonths(startLocalDateTime, endLocalDateTime, copType, dataService);
        break;
    case "year":
        result = processYears(startLocalDateTime, endLocalDateTime, copType, dataService);
        break;
    case "heatingseason":
        result = processHeatingSeason(startLocalDateTime, endLocalDateTime, copType, dataService);
        break;
    default:
        data.put("state", "fail");
        data.put("message", "不支持的周期类型");
        return data;
}

List<String> xList = (List<String>) result.get("xList");
List<String> yList = (List<String>) result.get("yList");
List<String> timeList = (List<String>) result.get("timeList");

data.put("xList", xList);
data.put("timeList", timeList); // 返回时间列表供前端检查

// 构建返回数据
Map<String, List<String>> yMap = new LinkedHashMap<>();
yMap.put("y1CurrentList", yList);

// 处理对比数据
if (comparison != null && !comparison.isEmpty()) {
    LocalDateTime comparisonStart = null;
    LocalDateTime comparisonEnd = null;
    
    if (comparison.equals("YOY")) {
        // 同比：减1年
        comparisonStart = startLocalDateTime != null ? startLocalDateTime.minusYears(1) : null;
        comparisonEnd = endLocalDateTime != null ? endLocalDateTime.minusYears(1) : null;
    } else if (comparison.equals("QOQ")) {
        // 环比：根据周期类型计算
        if (cycleType.equals("oneday")) {
            comparisonStart = startLocalDateTime != null ? startLocalDateTime.minusHours(24) : null;
            comparisonEnd = endLocalDateTime != null ? endLocalDateTime.minusHours(24) : null;
        } else if (cycleType.equals("sevendays")) {
            comparisonStart = startLocalDateTime != null ? startLocalDateTime.minusDays(7) : null;
            comparisonEnd = endLocalDateTime != null ? endLocalDateTime.minusDays(7) : null;
        } else if (cycleType.equals("week")) {
            comparisonStart = startLocalDateTime != null ? startLocalDateTime.minusDays(7) : null;
            comparisonEnd = endLocalDateTime != null ? endLocalDateTime.minusDays(7) : null;
        } else if (cycleType.equals("day")) {
            comparisonStart = startLocalDateTime != null ? startLocalDateTime.minusMonths(1) : null;
            comparisonEnd = endLocalDateTime != null ? endLocalDateTime.minusMonths(1) : null;
        } else if (cycleType.equals("month")) {
            // 计算时间段长度（包含首尾，所以+1）
            long monthsDiff = ChronoUnit.MONTHS.between(startLocalDateTime, endLocalDateTime);
            // 环比：上一个相同长度的时间段
            // 例如：2025-01到2025-06（6个月），环比应该是2024-07到2024-12（6个月）
            comparisonEnd = startLocalDateTime != null ? startLocalDateTime.minusMonths(1) : null;
            comparisonStart = comparisonEnd != null ? comparisonEnd.minusMonths(monthsDiff) : null;
        } else if (cycleType.equals("year")) {
            comparisonStart = startLocalDateTime != null ? startLocalDateTime.minusYears(1) : null;
            comparisonEnd = endLocalDateTime != null ? endLocalDateTime.minusYears(1) : null;
        } else if (cycleType.equals("heatingseason")) {
            long daysDiff = ChronoUnit.DAYS.between(startLocalDateTime, endLocalDateTime);
            comparisonStart = startLocalDateTime != null ? startLocalDateTime.minusDays(daysDiff) : null;
            comparisonEnd = startLocalDateTime;
        } else if (cycleType.equals("singleday")) {
            comparisonStart = startLocalDateTime != null ? startLocalDateTime.minusDays(1) : null;
            comparisonEnd = endLocalDateTime != null ? endLocalDateTime.minusDays(1) : null;
        }
    }
    
    // 查询对比数据
    if (comparisonStart != null && comparisonEnd != null) {
        Map<String, Object> comparisonResult;
        switch(cycleType) {
            case "oneday":
                comparisonResult = processOneDay(comparisonStart, copType, dataService);
                break;
            case "sevendays":
                comparisonResult = processSevenDays(comparisonStart, copType, dataService);
                break;
            case "singleday":
                comparisonResult = processSingleDay(comparisonStart, copType, dataService);
                break;
            case "week":
                comparisonResult = processWeek(comparisonStart, comparisonEnd, copType, dataService);
                break;
            case "day":
                comparisonResult = processMonthDays(comparisonStart, copType, dataService);
                break;
            case "month":
            case "heatingseason":
                comparisonResult = processMonths(comparisonStart, comparisonEnd, copType, dataService);
                break;
            case "year":
                comparisonResult = processYears(comparisonStart, comparisonEnd, copType, dataService);
                break;
            default:
                comparisonResult = null;
        }
        
        if (comparisonResult != null) {
            List<String> yPreviousList = (List<String>) comparisonResult.get("yList");
            // List<String> timePreviousList = (List<String>) comparisonResult.get("timeList");
            if (yPreviousList != null && !yPreviousList.isEmpty()) {
                if (cycleType.equals("day")) {
                    yPreviousList = alignDayComparisonList(xList, comparisonResult);
                }
                yMap.put("y1PreviousList", yPreviousList);
                // data.put("timePreviousList", timePreviousList);
            }
        }
    }
}

data.put("yMap", yMap);
return data;
