// 定时峰谷电费计算
/* algorithmProcessId: timingEnergyCost
 *
 * 每小时触发：取当前时间之前已经结束的电价区间段，计算该区间段的累计电量差值 × 单价，
 * 将费用实时写入 sjmg_energy_cost_daily_detail，不写任何点位。
 *
 * 依赖：
 * - sjmg_energy_price_detail（电价，saveEnergyPricePlan 写入）
 * - sjmg_energy_cost_daily_detail（日分档费用，堆叠柱）
 * - pshisdata 日电量累计点（6路 *_Daily_Energy_Consumption，用 sub(a.hisval) 取区间电量差）
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);
SnowFlake idWorker = new SnowFlake();

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser != null && ptUser.dbCode != null ? ptUser.dbCode.toString() : "t01";
if ("base".equals(dbCode)) {
    dbCode = "t01";
}

SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

def formatDateTime(LocalDateTime dt) {
    return dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
}

def formatDate(LocalDate dt) {
    return dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
}

Calendar calNow = Calendar.getInstance();
int year = calNow.get(Calendar.YEAR);
int dayOfMonth = calNow.get(Calendar.DAY_OF_MONTH);
int hour = calNow.get(Calendar.HOUR_OF_DAY);
int monthOfYear = calNow.get(Calendar.MONTH) + 1;

// ---------- helpers ----------

def escapeSql(String s) {
    if (s == null) return "";
    return s.replace("'", "''");
}

def getMonthDayOrder(String monthDay) {
    if (monthDay == null || !monthDay.contains("-")) return 101;
    String[] parts = monthDay.split("-");
    int month = Integer.parseInt(parts[0]);
    int day = Integer.parseInt(parts[1]);
    return month * 100 + day;
}

def isMonthDayInRange(String monthDay, String startDate, String endDate) {
    int target = getMonthDayOrder(monthDay);
    int start = getMonthDayOrder(startDate);
    int end = getMonthDayOrder(endDate);
    if (start <= end) {
        return target >= start && target <= end;
    }
    return target >= start || target <= end;
}

def toMonthDay(LocalDate date) {
    return String.format("%02d-%02d", date.getMonthValue(), date.getDayOfMonth());
}

def parseSegmentStart(LocalDate date, String startTime) {
    String[] p = startTime.split(":");
    int h = Integer.parseInt(p[0]);
    int m = Integer.parseInt(p[1]);
    int s = p.length > 2 ? Integer.parseInt(p[2]) : 0;
    return LocalDateTime.of(date.getYear(), date.getMonthValue(), date.getDayOfMonth(), h, m, s);
}

def parseSegmentEnd(LocalDate date, String endTime, String startTime) {
    // 如果结束时间小于等于开始时间，说明跨天
    if (endTime.compareTo(startTime) <= 0) {
        String[] p = endTime.split(":");
        int h = Integer.parseInt(p[0]);
        int m = Integer.parseInt(p[1]);
        int s = p.length > 2 ? Integer.parseInt(p[2]) : 0;
        return LocalDateTime.of(date.plusDays(1).getYear(), date.plusDays(1).getMonthValue(), date.plusDays(1).getDayOfMonth(), h, m, s);
    }
    String[] p = endTime.split(":");
    int h = Integer.parseInt(p[0]);
    int m = Integer.parseInt(p[1]);
    int s = p.length > 2 ? Integer.parseInt(p[2]) : 0;
    return LocalDateTime.of(date.getYear(), date.getMonthValue(), date.getDayOfMonth(), h, m, s);
}

def loadPriceRows(dynamicDataSource, dbCode) {
    String sql = "SELECT energy_price_name, unit_price, start_time, end_time, start_date, end_date " +
            "FROM sjmg_energy_price_detail WHERE energy_price_type_uuid = '2' ORDER BY start_date, start_time";
    return dynamicDataSource.excuteTenantSqlQuery(sql, dbCode);
}

def resolveSegmentsForDate(LocalDate date, List<Map<String, Object>> priceRows) {
    String monthDay = toMonthDay(date);
    List<Map<String, Object>> segments = new ArrayList<>();
    for (Map<String, Object> row : priceRows) {
        String startDate = row.get("start_date") != null ? row.get("start_date").toString() : "01-01";
        String endDate = row.get("end_date") != null ? row.get("end_date").toString() : "12-31";
        if (!isMonthDayInRange(monthDay, startDate, endDate)) {
            continue;
        }
        segments.add(row);
    }
    return segments;
}

def buildTierKey(String planStart, String planEnd, String tierName, String startTime, String endTime, BigDecimal unitPrice) {
    return planStart + "~" + planEnd + "|" + tierName + "|" + startTime + "-" + endTime + "|" + unitPrice.setScale(4, RoundingMode.HALF_UP).toPlainString();
}

def queryMeterDeltaKwh(String tagName, LocalDateTime start, LocalDateTime end, DataService dataService) {
    if (start == null || end == null || !start.isBefore(end)) {
        return BigDecimal.ZERO;
    }
    String tagEscaped = tagName.replace("'", "''");

    // 区间终点是“下一区间的起点”，电量差值应取到终点前 1 秒，
    // 例如 0:00-8:20 实际查 00:00:00-08:19:59
    LocalDateTime queryEnd = end.minusSeconds(1);
    if (!start.isBefore(queryEnd)) {
        return BigDecimal.ZERO;
    }

    String startStr = formatDateTime(start);
    String endStr = formatDateTime(queryEnd);
    String sql = "select a.taglongname,sub(a.hisval) as hisval,a.times from pshisdata as a " +
            "where a.taglongname in ('" + tagEscaped + "') " +
            "and a.starttime ='" + startStr + "' and a.endtime = '" + endStr + "' " +
            "group by a.taglongname";
    try {
        DataTable dt = dataService.queryListDataBySql(sql);
        if (dt == null || dt.getRows().size() == 0) {
            return BigDecimal.ZERO;
        }
        DataRow row = dt.getDataRow(0);
        Object val = row.getValue(1);
        if (val == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal delta = new BigDecimal(val.toString());
        if (delta.compareTo(BigDecimal.ZERO) < 0) {
            return BigDecimal.ZERO;
        }
        return delta.setScale(4, RoundingMode.HALF_UP);
    } catch (Exception ignored) {
        return BigDecimal.ZERO;
    }
}

def archiveDailyDetail(dynamicDataSource, dbCode, SnowFlake idWorker, LocalDate statDate, String deviceCode, Map<String, Map<String, Object>> tierMap) {
    String dateStr = formatDate(statDate);
    for (Map<String, Object> tier : tierMap.values()) {
        BigDecimal amount = ((BigDecimal) tier.get("cost_amount")).setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) == 0) {
            continue;
        }
        String timeRange = tier.get("time_range") != null ? tier.get("time_range").toString() : "";
        if (timeRange.endsWith("-00:00:00")) {
            timeRange = timeRange.replace("-00:00:00", "-24:00:00");
        }
        String unitPriceStr = ((BigDecimal) tier.get("unit_price")).setScale(4, RoundingMode.HALF_UP).toPlainString();

        // 只删除同日期、同设备、同区间、同单价的这一条，保留该日期其他已归档的区间
        String deleteSql = "DELETE FROM sjmg_energy_cost_daily_detail WHERE stat_date = '" + escapeSql(dateStr) + "' " +
                "AND device_code = '" + escapeSql(deviceCode) + "' " +
                "AND time_range = '" + escapeSql(timeRange) + "' " +
                "AND unit_price = '" + escapeSql(unitPriceStr) + "'";
        dynamicDataSource.excuteTenantSql(deleteSql, dbCode);

        String id = idWorker.nextId();
        String tierName = tier.get("tier_name") != null ? tier.get("tier_name").toString() : "";
        String insertSql = "INSERT INTO sjmg_energy_cost_daily_detail (id, stat_date, device_code, tier_name, time_range, unit_price, plan_start_date, plan_end_date, cost_amount) VALUES (" +
                "'" + escapeSql(id) + "','" + escapeSql(dateStr) + "','" + escapeSql(deviceCode) + "','" + escapeSql(tierName) + "','" +
                escapeSql(timeRange) + "','" + escapeSql(unitPriceStr) + "','" +
                escapeSql(tier.get("plan_start_date").toString()) + "','" + escapeSql(tier.get("plan_end_date").toString()) + "','" +
                escapeSql(amount.toPlainString()) + "')";
        dynamicDataSource.excuteTenantSql(insertSql, dbCode);
    }
}

def formatTimeRange(String startTime, String endTime) {
    String timeRange = startTime + "-" + endTime;
    if (timeRange.endsWith("-00:00:00")) {
        timeRange = timeRange.replace("-00:00:00", "-24:00:00");
    }
    return timeRange;
}

def loadExistingArchiveKeys(dynamicDataSource, dbCode, String startDate, String endDate) {
    String sql = "SELECT stat_date, device_code, time_range, unit_price " +
            "FROM sjmg_energy_cost_daily_detail " +
            "WHERE stat_date >= '" + escapeSql(startDate) + "' AND stat_date <= '" + escapeSql(endDate) + "'";
    List<Map<String, Object>> rows = dynamicDataSource.excuteTenantSqlQuery(sql, dbCode);
    Set<String> keys = new HashSet<>();
    for (Map<String, Object> row : rows) {
        String dateStr = row.get("stat_date") != null ? row.get("stat_date").toString().substring(0, 10) : "";
        String deviceCode = row.get("device_code") != null ? row.get("device_code").toString() : "";
        String timeRange = row.get("time_range") != null ? row.get("time_range").toString() : "";
        String priceStr = row.get("unit_price") != null
                ? new BigDecimal(row.get("unit_price").toString()).setScale(4, RoundingMode.HALF_UP).toPlainString()
                : "0.0000";
        keys.add(dateStr + "|" + deviceCode + "|" + timeRange + "|" + priceStr);
    }
    return keys;
}

def backfillMissingToday(dynamicDataSource, dbCode, dataService, idWorker,
                         List<Map<String, Object>> priceRows, List<Map<String, String>> devices,
                         LocalDateTime now) {
    LocalDate today = now.toLocalDate();
    LocalDate yesterday = today.minusDays(1);
    Set<String> existingKeys = loadExistingArchiveKeys(dynamicDataSource, dbCode, formatDate(yesterday), formatDate(today));
    int backfilled = 0;
    for (LocalDate baseDate : [yesterday, today]) {
        List<Map<String, Object>> daySegments = resolveSegmentsForDate(baseDate, priceRows);
        for (Map<String, Object> seg : daySegments) {
            String startTime = seg.get("start_time").toString();
            String endTime = seg.get("end_time").toString();

            LocalDateTime intervalStart = parseSegmentStart(baseDate, startTime);
            LocalDateTime intervalEnd = parseSegmentEnd(baseDate, endTime, startTime);
            if (!intervalEnd.isAfter(intervalStart)) {
                intervalEnd = intervalEnd.plusDays(1);
            }

            // 只处理在今天内已经结束、且已经结束的区间；不补昨天非跨天区间
            if (intervalEnd.isAfter(now) || !intervalEnd.toLocalDate().equals(today)) {
                continue;
            }

            BigDecimal unitPrice = new BigDecimal(seg.get("unit_price").toString());
            String planStartDate = seg.get("start_date").toString();
            String planEndDate = seg.get("end_date").toString();
            String timeRange = formatTimeRange(startTime, endTime);
            String dateStr = formatDate(baseDate);
            String unitPriceStr = unitPrice.setScale(4, RoundingMode.HALF_UP).toPlainString();

            for (Map<String, String> device : devices) {
                String deviceCode = device.get("code");
                String key = dateStr + "|" + deviceCode + "|" + timeRange + "|" + unitPriceStr;
                if (existingKeys.contains(key)) {
                    continue;
                }

                BigDecimal kwh = queryMeterDeltaKwh(device.get("cumulative"), intervalStart, intervalEnd, dataService);
                if (kwh.compareTo(BigDecimal.ZERO) == 0) {
                    continue;
                }
                BigDecimal cost = kwh.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
                if (cost.compareTo(BigDecimal.ZERO) == 0) {
                    continue;
                }

                String deleteSql = "DELETE FROM sjmg_energy_cost_daily_detail WHERE stat_date = '" + escapeSql(dateStr) + "' " +
                        "AND device_code = '" + escapeSql(deviceCode) + "' " +
                        "AND time_range = '" + escapeSql(timeRange) + "' " +
                        "AND unit_price = '" + escapeSql(unitPriceStr) + "'";
                dynamicDataSource.excuteTenantSql(deleteSql, dbCode);

                String id = idWorker.nextId();
                String insertSql = "INSERT INTO sjmg_energy_cost_daily_detail (id, stat_date, device_code, tier_name, time_range, unit_price, plan_start_date, plan_end_date, cost_amount) VALUES (" +
                        "'" + escapeSql(id) + "','" + escapeSql(dateStr) + "','" + escapeSql(deviceCode) + "','','" +
                        escapeSql(timeRange) + "','" + escapeSql(unitPriceStr) + "','" +
                        escapeSql(planStartDate) + "','" + escapeSql(planEndDate) + "','" +
                        escapeSql(cost.toPlainString()) + "')";
                dynamicDataSource.excuteTenantSql(insertSql, dbCode);
                backfilled++;
            }
        }
    }
    return backfilled;
}

// ---------- device config ----------

List<Map<String, String>> devices = new ArrayList<>();
devices.add(["code": "SYSTEM", "cumulative": "Sys\\FinforWorx\\EnergyCost\\System_Daily_Energy_Consumption"]);
devices.add(["code": "HP_HEAT", "cumulative": "Sys\\FinforWorx\\EnergyCost\\HP_Heat_Daily_Energy_Consumption"]);
devices.add(["code": "HP_COLD", "cumulative": "Sys\\FinforWorx\\EnergyCost\\HP_Cold_Daily_Energy_Consumption"]);
devices.add(["code": "PRIMARY_WP", "cumulative": "Sys\\FinforWorx\\EnergyCost\\primary_WP_Daily_Energy_Consumption"]);
devices.add(["code": "SECONDARY_WP", "cumulative": "Sys\\FinforWorx\\EnergyCost\\secondary_WP_Daily_Energy_Consumption"]);
devices.add(["code": "OHNY", "cumulative": "Sys\\FinforWorx\\EnergyCost\\OHNY_Daily_Energy_Consumption"]);

// ---------- heating season ----------

String selectAreaSql = "select project_type_uuid,start_heating_season,end_heating_season from sjmg_project_data";
List<Map<String, Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, dbCode);
String projectTypeUuid = "1";
String start_heating_season = "11-15";
String end_heating_season = "03-15";
if (selectAreaList != null && !selectAreaList.isEmpty()) {
    Map<String, Object> area = selectAreaList.get(0);
    if (area.get("project_type_uuid") != null) {
        projectTypeUuid = area.get("project_type_uuid").toString();
    }
    if (area.get("start_heating_season") != null) {
        start_heating_season = area.get("start_heating_season").toString();
    }
    if (area.get("end_heating_season") != null) {
        end_heating_season = area.get("end_heating_season").toString();
    }
}

Date startDate = null;
Date endDate = null;
try {
    if (monthOfYear < 7) {
        startDate = sdf.parse((year - 1) + "-" + start_heating_season + " 00:00:00");
        endDate = sdf.parse(year + "-" + end_heating_season + " 23:59:59");
    } else {
        startDate = sdf.parse(year + "-" + start_heating_season + " 00:00:00");
        endDate = sdf.parse((year + 1) + "-" + end_heating_season + " 23:59:59");
    }
} catch (ParseException e) {
    e.printStackTrace();
}

boolean isInSeason = false;
if (startDate != null && endDate != null) {
    isInSeason = calNow.getTime().compareTo(startDate) >= 0 && calNow.getTime().compareTo(endDate) <= 0;
} else {
    data.put("result", "采暖季日期配置无效，跳过费用计算");
    data.put("currentTime", sdf.format(calNow.getTime()));
    return data;
}
if ("1".equals(projectTypeUuid) && !isInSeason) {
    data.put("result", "当前不在采暖季，不执行下置操作");
    data.put("currentTime", sdf.format(calNow.getTime()));
    return data;
}

// ---------- load price plan ----------

List<Map<String, Object>> priceRows = loadPriceRows(dynamicDataSource, dbCode);
if (priceRows == null || priceRows.isEmpty()) {
    data.put("result", "未配置电价方案，跳过费用计算");
    return data;
}

// ---------- main: archive ended price segments ----------

LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
LocalDate today = now.toLocalDate();
LocalDate yesterday = today.minusDays(1);

// key: stat_date|device_code -> tierMap
Map<String, Map<String, Map<String, Object>>> archiveMap = new LinkedHashMap<>();

for (LocalDate baseDate : [yesterday, today]) {
    List<Map<String, Object>> daySegments = resolveSegmentsForDate(baseDate, priceRows);
    for (Map<String, Object> seg : daySegments) {
        String startTime = seg.get("start_time").toString();
        String endTime = seg.get("end_time").toString();

        LocalDateTime intervalStart = parseSegmentStart(baseDate, startTime);
        LocalDateTime intervalEnd = parseSegmentEnd(baseDate, endTime, startTime);
        if (!intervalEnd.isAfter(intervalStart)) {
            intervalEnd = intervalEnd.plusDays(1);
        }

        // 只处理在今天内结束、且已经结束的区间
        if (intervalEnd.isAfter(now) || !intervalEnd.toLocalDate().equals(today)) {
            continue;
        }

        BigDecimal unitPrice = new BigDecimal(seg.get("unit_price").toString());
        String planStartDate = seg.get("start_date").toString();
        String planEndDate = seg.get("end_date").toString();
        String timeRange = startTime + "-" + endTime;
        if (timeRange.endsWith("-00:00:00")) {
            timeRange = timeRange.replace("-00:00:00", "-24:00:00");
        }
        String tierKey = buildTierKey(planStartDate, planEndDate, "", startTime, endTime, unitPrice);

        for (Map<String, String> device : devices) {
            BigDecimal kwh = queryMeterDeltaKwh(device.get("cumulative"), intervalStart, intervalEnd, dataService);
            if (kwh.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }
            BigDecimal cost = kwh.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
            if (cost.compareTo(BigDecimal.ZERO) == 0) {
                continue;
            }

            String dateStr = formatDate(baseDate);
            String deviceCode = device.get("code");
            String mapKey = dateStr + "|" + deviceCode;

            Map<String, Map<String, Object>> tierMap = archiveMap.get(mapKey);
            if (tierMap == null) {
                tierMap = new LinkedHashMap<>();
                archiveMap.put(mapKey, tierMap);
            }

            if (!tierMap.containsKey(tierKey)) {
                Map<String, Object> tier = new HashMap<>();
                tier.put("tier_key", tierKey);
                tier.put("tier_name", "");
                tier.put("time_range", timeRange);
                tier.put("unit_price", unitPrice);
                tier.put("plan_start_date", planStartDate);
                tier.put("plan_end_date", planEndDate);
                tier.put("cost_amount", BigDecimal.ZERO);
                tierMap.put(tierKey, tier);
            }
            Map<String, Object> tier = tierMap.get(tierKey);
            tier.put("cost_amount", ((BigDecimal) tier.get("cost_amount")).add(cost));
        }
    }
}

// ---------- persist to MySQL ----------

List<String> archiveErrors = new ArrayList<>();
int archivedRows = 0;
for (Map.Entry<String, Map<String, Map<String, Object>>> entry : archiveMap.entrySet()) {
    String[] parts = entry.getKey().split("\\|", 2);
    LocalDate statDate = LocalDate.parse(parts[0], DateTimeFormatter.ofPattern("yyyy-MM-dd"));
    String deviceCode = parts[1];
    try {
        archiveDailyDetail(dynamicDataSource, dbCode, idWorker, statDate, deviceCode, entry.getValue());
        archivedRows += entry.getValue().size();
    } catch (Exception e) {
        archiveErrors.add(deviceCode + ":" + (e.getMessage() != null ? e.getMessage() : "archive failed"));
    }
}

int backfilledCount = 0;
try {
    backfilledCount = backfillMissingToday(dynamicDataSource, dbCode, dataService, idWorker, priceRows, devices, now);
} catch (Exception e) {
    archiveErrors.add("补录校验失败:" + (e.getMessage() != null ? e.getMessage() : "未知错误"));
}

if (archiveErrors.isEmpty()) {
    data.put("result", "费用归档成功，共归档 " + archivedRows + " 条明细，补录 " + backfilledCount + " 条");
} else {
    data.put("result", "费用归档完成，归档 " + archivedRows + " 条，补录 " + backfilledCount + " 条，部分异常: " + String.join("; ", archiveErrors));
}
data.put("archiveCount", archivedRows);
data.put("backfillCount", backfilledCount);
return data;
