/* algorithmProcessId: queryExpense
 *
 * 费用分析查询：按日返回堆叠柱（各单价档位费用），按月/年返回汇总；支持环比/同比。
 *
 * 入参：
 * - cycle: 日 | 月 | 年
 * - startDate: 日=YYYY-MM，月=YYYY-MM，年=YYYY
 * - endDate: 月/年时使用
 * - type: 总费用 | 热泵（制热） | 热泵（制冷） | 水泵 | 耦合能源
 * - comparison: QOQ | YOY | 空
 */

import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;

// ---------- 数据源与上下文 ----------

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser != null && ptUser.dbCode != null ? ptUser.dbCode.toString() : "t01";
if ("base".equals(dbCode)) {
    dbCode = "t01";
}

String cycle = data.get("cycle") != null ? data.get("cycle").toString() : "日";
String startDate = data.get("startDate") != null ? data.get("startDate").toString().trim() : "";
String endDate = data.get("endDate") != null ? data.get("endDate").toString().trim() : "";
String type = data.get("type") != null ? data.get("type").toString().trim() : "总费用";
String comparison = data.get("comparison") != null ? data.get("comparison").toString().trim() : "";

data.remove("cycle");
data.remove("startDate");
data.remove("endDate");
data.remove("type");
data.remove("comparison");

// ---------- 工具方法 ----------

def escapeSql(String s) {
    if (s == null) return "";
    return s.replace("'", "''");
}

def formatDate(LocalDate dt) {
    return dt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
}

def formatMonth(YearMonth ym) {
    return ym.format(DateTimeFormatter.ofPattern("yyyy-MM"));
}

def formatPriceLabel(String unitPrice) {
    try {
        BigDecimal price = new BigDecimal(unitPrice);
        return price.setScale(2, RoundingMode.HALF_UP).toPlainString() + "元/kWh";
    } catch (Exception e) {
        return unitPrice + "元/kWh";
    }
}

def buildInClause(List<String> codes) {
    List<String> quoted = new ArrayList<>();
    for (String code : codes) {
        quoted.add("'" + escapeSql(code) + "'");
    }
    return String.join(",", quoted);
}

def toScaledDouble(Object value) {
    if (value == null) return null;
    try {
        return new BigDecimal(value.toString()).setScale(2, RoundingMode.HALF_UP).doubleValue();
    } catch (Exception e) {
        return null;
    }
}

// ---------- 查询项目/系统类型 ----------

String projectTypeUuid = "1";
String systemTypeUuid = "1";
try {
    String projectSql = "SELECT project_type_uuid, system_type_uuid FROM sjmg_project_data LIMIT 1";
    List<Map<String, Object>> projectRows = dynamicDataSource.excuteTenantSqlQuery(projectSql, dbCode);
    if (projectRows != null && !projectRows.isEmpty()) {
        Map<String, Object> row = projectRows.get(0);
        if (row.get("project_type_uuid") != null) {
            projectTypeUuid = row.get("project_type_uuid").toString();
        }
        if (row.get("system_type_uuid") != null) {
            systemTypeUuid = row.get("system_type_uuid").toString();
        }
    }
} catch (Exception ignored) {
}

// ---------- 费用类型 → 设备代码 ----------

def resolveDeviceCodes(String typeName, String systemTypeUuid) {
    if ("总费用".equals(typeName)) {
        return ["SYSTEM"];
    }
    if ("热泵（制热）".equals(typeName)) {
        return ["HP_HEAT"];
    }
    if ("热泵（制冷）".equals(typeName)) {
        return ["HP_COLD"];
    }
    if ("水泵".equals(typeName)) {
        if ("2".equals(systemTypeUuid)) {
            return ["PRIMARY_WP", "SECONDARY_WP"];
        }
        return ["PRIMARY_WP"];
    }
    if ("耦合能源".equals(typeName)) {
        return ["OHNY"];
    }
    return ["SYSTEM"];
}

List<String> deviceCodes = resolveDeviceCodes(type, systemTypeUuid);
String deviceIn = buildInClause(deviceCodes);

// ---------- 解析当前周期 ----------

LocalDate currentStart;
LocalDate currentEnd;
List<String> xList = new ArrayList<>();
List<LocalDate> pointDates = new ArrayList<>(); // 日：每个 x 点对应的日期；月/年：每个 x 点对应区间的起始日期
Map<String, Integer> xIndexMap = new HashMap<>();

if ("日".equals(cycle)) {
    if (startDate == null || startDate.length() < 7) {
        startDate = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }
    YearMonth ym = YearMonth.parse(startDate);
    currentStart = ym.atDay(1);
    currentEnd = ym.atEndOfMonth();
    int days = ym.lengthOfMonth();
    for (int day = 1; day <= days; day++) {
        xList.add(day + "日");
        pointDates.add(ym.atDay(day));
        xIndexMap.put(formatDate(ym.atDay(day)), day - 1);
    }
} else if ("月".equals(cycle)) {
    if (startDate == null || startDate.length() < 7) {
        startDate = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));
    }
    if (endDate == null || endDate.length() < 7) {
        endDate = startDate;
    }
    YearMonth startYm = YearMonth.parse(startDate);
    YearMonth endYm = YearMonth.parse(endDate);
    YearMonth cursor = startYm;
    while (!cursor.isAfter(endYm)) {
        xList.add(cursor.getMonthValue() + "月");
        pointDates.add(cursor.atDay(1));
        xIndexMap.put(formatMonth(cursor), xList.size() - 1);
        cursor = cursor.plusMonths(1);
    }
    currentStart = startYm.atDay(1);
    currentEnd = endYm.atEndOfMonth();
} else {
    int startYear = startDate != null && startDate.length() >= 4 ? Integer.parseInt(startDate.substring(0, 4)) : LocalDate.now().getYear();
    int endYear = endDate != null && endDate.length() >= 4 ? Integer.parseInt(endDate.substring(0, 4)) : startYear;
    for (int y = startYear; y <= endYear; y++) {
        xList.add(String.valueOf(y));
        pointDates.add(LocalDate.of(y, 1, 1));
        xIndexMap.put(String.valueOf(y), xList.size() - 1);
    }
    currentStart = LocalDate.of(startYear, 1, 1);
    currentEnd = LocalDate.of(endYear, 12, 31);
}

int pointCount = xList.size();

// ---------- 查询当期明细（堆叠） ----------

Map<String, List<Double>> seriesMap = new LinkedHashMap<>();
List<Double> currentTotals = new ArrayList<>();
for (int i = 0; i < pointCount; i++) {
    currentTotals.add(0D);
}

try {
    String detailSql = "SELECT stat_date, unit_price, tier_name, time_range, plan_start_date, plan_end_date, SUM(cost_amount) AS cost_amount " +
            "FROM sjmg_energy_cost_daily_detail " +
            "WHERE stat_date >= '" + escapeSql(formatDate(currentStart)) + "' AND stat_date <= '" + escapeSql(formatDate(currentEnd)) + "' " +
            "AND device_code IN (" + deviceIn + ") " +
            "GROUP BY stat_date, unit_price, tier_name, time_range, plan_start_date, plan_end_date " +
            "ORDER BY stat_date, unit_price";
    List<Map<String, Object>> rows = dynamicDataSource.excuteTenantSqlQuery(detailSql, dbCode);

    for (Map<String, Object> row : rows) {
        Object dateObj = row.get("stat_date");
        if (dateObj == null) continue;
        LocalDate statDate = LocalDate.parse(dateObj.toString().substring(0, 10));
        Integer idx = null;
        if ("日".equals(cycle)) {
            idx = xIndexMap.get(formatDate(statDate));
        } else if ("月".equals(cycle)) {
            idx = xIndexMap.get(formatMonth(YearMonth.from(statDate)));
        } else {
            idx = xIndexMap.get(String.valueOf(statDate.getYear()));
        }
        if (idx == null) continue;

        String label = formatPriceLabel(row.get("unit_price").toString());
        Double amount = toScaledDouble(row.get("cost_amount"));
        if (amount == null) continue;

        if (!seriesMap.containsKey(label)) {
            List<Double> values = new ArrayList<>();
            for (int i = 0; i < pointCount; i++) values.add(0D);
            seriesMap.put(label, values);
        }
        List<Double> values = seriesMap.get(label);
        values.set(idx, values.get(idx) + amount);
        currentTotals.set(idx, currentTotals.get(idx) + amount);
    }
} catch (Exception e) {
    data.put("state", "fail");
    data.put("message", "查询费用明细失败: " + (e.getMessage() != null ? e.getMessage() : "未知错误"));
    return data;
}

// ---------- 查询对比数据 ----------

List<Double> previousTotals = null;
if ("QOQ".equals(comparison) || "YOY".equals(comparison)) {
    previousTotals = new ArrayList<>();
    for (int i = 0; i < pointCount; i++) {
        previousTotals.add(0D);
    }

    LocalDate prevStart = null;
    LocalDate prevEnd = null;

    if ("日".equals(cycle)) {
        YearMonth ym = YearMonth.parse(startDate);
        YearMonth prevYm = "QOQ".equals(comparison) ? ym.minusMonths(1) : ym.minusYears(1);
        prevStart = prevYm.atDay(1);
        prevEnd = prevYm.atEndOfMonth();
    } else if ("月".equals(cycle)) {
        YearMonth startYm = YearMonth.parse(startDate);
        YearMonth endYm = YearMonth.parse(endDate);
        if ("YOY".equals(comparison)) {
            prevStart = startYm.minusYears(1).atDay(1);
            prevEnd = endYm.minusYears(1).atEndOfMonth();
        } else {
            long months = java.time.temporal.ChronoUnit.MONTHS.between(startYm, endYm) + 1;
            prevStart = startYm.minusMonths(months).atDay(1);
            prevEnd = endYm.minusMonths(months).atEndOfMonth();
        }
    } else {
        int startYear = Integer.parseInt(startDate.substring(0, 4));
        int endYear = Integer.parseInt(endDate.substring(0, 4));
        if ("YOY".equals(comparison)) {
            prevStart = LocalDate.of(startYear - 1, 1, 1);
            prevEnd = LocalDate.of(endYear - 1, 12, 31);
        } else {
            int count = endYear - startYear + 1;
            prevStart = LocalDate.of(startYear - count, 1, 1);
            prevEnd = LocalDate.of(endYear - count, 12, 31);
        }
    }

    try {
        String prevSql = "SELECT stat_date, SUM(cost_amount) AS cost_amount " +
                "FROM sjmg_energy_cost_daily_detail " +
                "WHERE stat_date >= '" + escapeSql(formatDate(prevStart)) + "' AND stat_date <= '" + escapeSql(formatDate(prevEnd)) + "' " +
                "AND device_code IN (" + deviceIn + ") " +
                "GROUP BY stat_date " +
                "ORDER BY stat_date";
        List<Map<String, Object>> prevRows = dynamicDataSource.excuteTenantSqlQuery(prevSql, dbCode);

        // 按周期聚合
        Map<String, Double> prevMap = new HashMap<>();
        for (Map<String, Object> row : prevRows) {
            Object dateObj = row.get("stat_date");
            if (dateObj == null) continue;
            LocalDate statDate = LocalDate.parse(dateObj.toString().substring(0, 10));
            String key;
            if ("日".equals(cycle)) {
                key = formatDate(statDate);
            } else if ("月".equals(cycle)) {
                key = formatMonth(YearMonth.from(statDate));
            } else {
                key = String.valueOf(statDate.getYear());
            }
            Double amount = toScaledDouble(row.get("cost_amount"));
            if (amount == null) continue;
            prevMap.put(key, (prevMap.containsKey(key) ? prevMap.get(key) : 0D) + amount);
        }

        // 把 prevMap 映射到当前 x 轴的对应位置
        for (int i = 0; i < pointCount; i++) {
            LocalDate currentPointDate = pointDates.get(i);
            String prevKey;
            if ("日".equals(cycle)) {
                // 对应当天：上月/去年的同一天
                LocalDate prevDate = "QOQ".equals(comparison)
                        ? currentPointDate.minusMonths(1)
                        : currentPointDate.minusYears(1);
                prevKey = formatDate(prevDate);
            } else if ("月".equals(cycle)) {
                YearMonth prevYm = "QOQ".equals(comparison)
                        ? YearMonth.from(currentPointDate).minusMonths(pointCount)
                        : YearMonth.from(currentPointDate).minusYears(1);
                prevKey = formatMonth(prevYm);
            } else {
                int prevYear = "QOQ".equals(comparison)
                        ? currentPointDate.getYear() - pointCount
                        : currentPointDate.getYear() - 1;
                prevKey = String.valueOf(prevYear);
            }
            previousTotals.set(i, prevMap.getOrDefault(prevKey, 0D));
        }
    } catch (Exception e) {
        data.put("state", "fail");
        data.put("message", "查询对比费用失败: " + (e.getMessage() != null ? e.getMessage() : "未知错误"));
        return data;
    }
}

// ---------- 汇总值 ----------

double allValue = 0D;
int validCount = 0;
for (Double total : currentTotals) {
    if (total != null && total > 0) {
        allValue += total;
        validCount++;
    }
}
double avgValue = validCount > 0 ? allValue / validCount : 0D;

// ---------- 组装返回值 ----------

Map<String, Object> yMap = new LinkedHashMap<>();
yMap.put("y1CurrentList", seriesMap);
if (previousTotals != null) {
    yMap.put("y1PreviousList", previousTotals);
}

data.put("allValue", new BigDecimal(allValue).setScale(2, RoundingMode.HALF_UP).toPlainString());
data.put("avgValue", new BigDecimal(avgValue).setScale(2, RoundingMode.HALF_UP).toPlainString());
data.put("xList", xList);
data.put("yMap", yMap);
data.put("state", "success");
return data;
