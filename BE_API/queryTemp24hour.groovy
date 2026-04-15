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
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);

// 登录用户信息（保持与现有脚本一致的上下文获取方式）
PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser.dbCode;
if (dbCode != null && dbCode.equals("base")) {
    dbCode = "t01";
}

Map<String, Object> paramMap = (Map<String, Object>) data.get("param");
Map<String, Object> requestData = paramMap != null ? (Map<String, Object>) paramMap.get("data") : new HashMap();

// 优先从 requestData 读取 date，兼容 data 顶层和 paramMap
Object dateObj = requestData.get("date");
if (dateObj == null) {
    dateObj = data.get("date");
}
if (dateObj == null && paramMap != null) {
    dateObj = paramMap.get("date");
}

String selectedDate = dateObj != null ? dateObj.toString().trim() : "";
if (selectedDate == null || selectedDate.equals("")) {
    selectedDate = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
}

String dateStrToParse = selectedDate;
if (dateStrToParse.contains(" ")) {
    dateStrToParse = dateStrToParse.split(" ")[0];
}

LocalDate date;
try {
    date = LocalDate.parse(dateStrToParse, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
} catch (Exception e) {
    date = LocalDate.now();
    data.put("parseDateError", e.getMessage());
}

LocalDate today = LocalDate.now();
boolean isToday = date.equals(today);
LocalDateTime endDateTime = isToday ? LocalDateTime.now() : date.atTime(23, 59, 59);

String startTime = date.atStartOfDay().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
String endTime = endDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

String supplyTempTag = "Sys\\FinforWorx\\UserWaterSupplyTemperature";
String backwaterTempTag = "Sys\\FinforWorx\\BackwaterTemperature";
String targetBackwaterTempTag = "Sys\\FinforWorx\\TargetBackwaterTemperature";

Map<String, Object> result = new LinkedHashMap<>();

Map<String, List<String>> supplyTempData = queryHourlyData(supplyTempTag, startTime, endTime, dataService);
Map<String, List<String>> backwaterTempData = queryHourlyData(backwaterTempTag, startTime, endTime, dataService);
Map<String, List<String>> targetBackwaterTempData = queryHourlyData(targetBackwaterTempTag, startTime, endTime, dataService);
List<Map<String, String>> targetBackwaterTempRawData = queryRawData(targetBackwaterTempTag, startTime, endTime, dataService);

result.put("xList", supplyTempData.get("xList"));
result.put("supplyTempData", supplyTempData);
result.put("backwaterTempData", backwaterTempData);
result.put("targetBackwaterTempData", targetBackwaterTempData);
result.put("targetBackwaterTempRawData", targetBackwaterTempRawData);
result.put("startTime", startTime);
result.put("endTime", endTime);

data.put("result", result);
return data;

Map<String, List<String>> queryHourlyData(String tagName, String startTime, String endTime, DataService dataService) {
    Map<String, List<String>> result = new LinkedHashMap<>();
    List<String> xList = new ArrayList<>();
    List<String> yList = new ArrayList<>();

    int samplingIntervalMinutes = 60;
    LocalDateTime startDateTime = LocalDateTime.parse(startTime, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    LocalDateTime endDateTime = LocalDateTime.parse(endTime, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));

    long totalMinutes = java.time.Duration.between(startDateTime, endDateTime).toMinutes();
    int totalPoints = (int) (totalMinutes / samplingIntervalMinutes) + 1;
    if (totalPoints > 24) {
        totalPoints = 24;
    }
    if (totalPoints < 1) {
        totalPoints = 1;
    }

    for (int i = 0; i < totalPoints; i++) {
        LocalDateTime timePoint = startDateTime.plusMinutes(i * samplingIntervalMinutes);
        if (timePoint.isAfter(endDateTime)) {
            break;
        }
        xList.add(timePoint.format(DateTimeFormatter.ofPattern("HH:mm")));
    }

    String sql1 = "SELECT a.taglongname, a.times, a.hisval FROM pshisdata AS a WHERE a.taglongname = '" + tagName + "' " +
                  "AND a.starttime = '" + startTime + "' AND a.endtime = '" + endTime + "' ORDER BY a.times ASC limitpage 1,9999";
    String sql2 = "";
    String sql3 = "";

    try {
        DataTable dt = dataService.queryListDataBySql(sql1);
        if (dt.getRows().size() == 0) {
            sql2 = "SELECT a.taglongname, a.times, a.hisval FROM pshisdata AS a WHERE a.taglongname = '" + tagName + "' " +
                   "AND a.starttime >= '" + startTime + "' AND a.endtime <= '" + endTime + "' ORDER BY a.times ASC limitpage 1,9999";
            dt = dataService.queryListDataBySql(sql2);
        }
        if (dt.getRows().size() == 0) {
            sql3 = "SELECT a.taglongname, a.times, a.hisval FROM pshisdata AS a WHERE a.taglongname = '" + tagName + "' " +
                   "AND a.times >= '" + startTime + "' AND a.times <= '" + endTime + "' ORDER BY a.times ASC limitpage 1,9999";
            dt = dataService.queryListDataBySql(sql3);
        }

        Map<String, BigDecimal> nearestValueMap = new LinkedHashMap<>();
        Map<String, Long> nearestDiffMap = new LinkedHashMap<>();

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

                LocalDateTime time = null;
                try {
                    time = LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"));
                } catch (Exception e1) {
                    try {
                        time = LocalDateTime.parse(timeStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
                    } catch (Exception e2) {
                        continue;
                    }
                }

                if (time.isAfter(endDateTime)) {
                    continue;
                }

                // 选择“整点最近值”：对每个整点窗口，保留与该整点时间差最小的原始值
                int minutesFromStart = (int) java.time.Duration.between(startDateTime, time).toMinutes();
                int nearestWindowIndex = (int) Math.round(minutesFromStart * 1.0 / samplingIntervalMinutes);
                if (nearestWindowIndex >= 0 && nearestWindowIndex < totalPoints) {
                    LocalDateTime windowTimePoint = startDateTime.plusMinutes(nearestWindowIndex * samplingIntervalMinutes);
                    if (windowTimePoint.isAfter(endDateTime)) {
                        continue;
                    }
                    String windowKey = windowTimePoint.format(DateTimeFormatter.ofPattern("HH:mm"));
                    long diffMillis = Math.abs(java.time.Duration.between(windowTimePoint, time).toMillis());
                    Long currentNearest = nearestDiffMap.get(windowKey);
                    if (currentNearest == null || diffMillis < currentNearest) {
                        nearestDiffMap.put(windowKey, diffMillis);
                        nearestValueMap.put(windowKey, value);
                    }
                }
            } catch (Exception e) {
                continue;
            }
        }

        for (String timeKey : xList) {
            BigDecimal nearestVal = nearestValueMap.get(timeKey);
            if (nearestVal != null) {
                yList.add(nearestVal.setScale(2, RoundingMode.HALF_UP).toString());
            } else {
                yList.add("0.00");
            }
        }
    } catch (Exception e) {
        while (yList.size() < xList.size()) {
            yList.add("0.00");
        }
        data.put("queryError_" + tagName, e.getMessage());
        data.put("querySql1_" + tagName, sql1);
        data.put("querySql2_" + tagName, sql2 != null ? sql2 : "");
        data.put("querySql3_" + tagName, sql3 != null ? sql3 : "");
    }

    while (yList.size() > xList.size()) {
        yList.remove(yList.size() - 1);
    }
    while (yList.size() < xList.size()) {
        yList.add("0.00");
    }

    result.put("xList", xList);
    result.put("yList", yList);
    return result;
}

List<Map<String, String>> queryRawData(String tagName, String startTime, String endTime, DataService dataService) {
    List<Map<String, String>> rawList = new ArrayList<>();
    String sql = "SELECT a.taglongname, a.times, a.hisval FROM pshisdata AS a WHERE a.taglongname = '" + tagName + "' " +
                 "AND a.starttime = '" + startTime + "' AND a.endtime = '" + endTime + "' ORDER BY a.times ASC limitpage 1,9999";

    try {
        DataTable dt = dataService.queryListDataBySql(sql);
        for (int i = 0; i < dt.getRows().size(); i++) {
            DataRow row = dt.getDataRow(i);
            Object timeObj = row.getValue(1);
            Object hisvalObj = row.getValue(2);
            if (timeObj == null || hisvalObj == null) {
                continue;
            }
            Map<String, String> item = new LinkedHashMap<>();
            item.put("time", timeObj.toString());
            item.put("value", hisvalObj.toString());
            rawList.add(item);
        }
    } catch (Exception e) {
        data.put("queryRawError_" + tagName, e.getMessage());
        data.put("queryRawSql_" + tagName, sql);
    }

    return rawList;
}
