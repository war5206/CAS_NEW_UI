/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page
 */

import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;

def dataService = ApplicationContextProvider.getBean(DataService.class);
def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser.dbCode;
if (dbCode.equals("base")) {
    dbCode = "t01";
}

String structure = "HeatPump\\";
String brand = "SJMG\\";

// 热泵总台数从数据库获取
int heatPumpCount = 0;
try {
    List<Map<String, Object>> heatPumpList = dynamicDataSource.excuteTenantSqlQuery("SELECT heat_pump FROM sjmg_project_data", dbCode);
    if (heatPumpList.size() >= 1 && heatPumpList.get(0).get("heat_pump") != null) {
        heatPumpCount = Integer.parseInt(heatPumpList.get(0).get("heat_pump").toString());
    }
} catch (Exception e) {
    heatPumpCount = 0;
}

List<Integer> deviceNos = new ArrayList<>();
for (int i = 1; i <= heatPumpCount; i++) {
    deviceNos.add(i);
}

Map<String, String> dataMap = new LinkedHashMap<>();
dataMap.put("回水温度", "\\TT_ReturnWater");
dataMap.put("供水温度", "\\TT_OutletWater");
dataMap.put("回差值", "\\Diff_Value");
dataMap.put("制热目标频率上限", "\\HTF_Max");
dataMap.put("制热设定温度", "\\Heat_Setpoint");
dataMap.put("制冷设定温度", "\\Cold_Setpoint");
dataMap.put("设定模式", "\\Setting_Mode");
dataMap.put("开关机", "\\Poweron");
dataMap.put("总故障代码", "\\Master_Fault_Code");
dataMap.put("系统1压缩机运行频率", "\\S1_COMP_FREQ");
dataMap.put("系统1压缩机电流", "\\S1_COMP_A");
dataMap.put("系统2压缩机运行频率", "\\S2_COMP_FREQ");
dataMap.put("系统2压缩机电流", "\\S2_COMP_A");
dataMap.put("外环境温度", "\\TT_Outdoor");
dataMap.put("累积运行时长", "\\RunTimeHour1");
dataMap.put("持续运行时长", "\\RunTimeHour2");

/* 批量查询：一次 IN 查询取回本页全部点位，避免逐点 SELECT（10 台 × 16 项 = 160 条 SQL） */
def getPointsRealValMap = { List<String> taglongnames ->
    Map<String, String> valMap = new HashMap<>();
    if (taglongnames == null || taglongnames.isEmpty()) {
        return valMap;
    }
    StringBuilder inClause = new StringBuilder();
    for (String name : taglongnames) {
        if (inClause.length() > 0) {
            inClause.append(",");
        }
        inClause.append("'").append(name).append("'");
    }
    String querySql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN (" + inClause.toString() + ")";
    DataTable pointDt = dataService.queryListDataBySql(querySql);
    int tagCol = -1;
    int valCol = -1;
    for (int c = 0; c < pointDt.getColumns().size(); c++) {
        String colName = pointDt.getColumns().get(c).getColumnName();
        if (colName == "taglongname") {
            tagCol = c;
        } else if (colName == "realval") {
            valCol = c;
        }
    }
    if (tagCol >= 0 && valCol >= 0) {
        for (int r = 0; r < pointDt.getRows().size(); r++) {
            try {
                Object tagObj = pointDt.getValue(r, tagCol);
                if (tagObj == null) {
                    continue;
                }
                Object valObj = pointDt.getValue(r, valCol);
                valMap.put(tagObj.toString().trim(), valObj == null ? "" : valObj.toString().trim());
            } catch (Exception e) {
                // 单行解析失败跳过，不影响其他点位
            }
        }
    }
    return valMap;
};

def isPointValueOne = { String pointValue ->
    if (pointValue == null || pointValue == "") {
        return false;
    }
    if ("1".equals(pointValue) || "1.0".equals(pointValue) || "true".equalsIgnoreCase(pointValue)) {
        return true;
    }
    try {
        return new BigDecimal(pointValue).compareTo(BigDecimal.ONE) == 0;
    } catch (Exception e) {
        return false;
    }
};

def formatPowerOnValue = { String rawVal ->
    if (rawVal == null || rawVal == "") {
        return "--";
    }
    if ("1".equals(rawVal)) {
        return "开";
    }
    if ("0".equals(rawVal)) {
        return "关";
    }
    return "--";
};

def formatParamValue = { String key, String rawVal ->
    if (rawVal == null || rawVal == "") {
        return "--";
    }
    if ("设定模式".equals(key)) {
        if ("0".equals(rawVal)) {
            return "制冷";
        }
        if ("1".equals(rawVal)) {
            return "制热";
        }
        return rawVal;
    }
    if ("开关机".equals(key)) {
        return formatPowerOnValue(rawVal);
    }
    return rawVal;
};

def buildDisplayName = { int deviceNo ->
    return "热泵" + deviceNo;
};

int pageSize = 10;
int pageNum = 1;
try {
    pageNum = Integer.parseInt(data.get("pageNum").toString());
} catch (Exception e) {
    pageNum = 1;
}

int total = deviceNos.size();
int totalPages = (int) Math.ceil(total / (double) pageSize);
if (totalPages == 0) {
    totalPages = 1;
}
if (pageNum > totalPages) {
    pageNum = totalPages;
}

int startIndex = (pageNum - 1) * pageSize;
int endIndex = Math.min(startIndex + pageSize, total);

// 本页全部点位一次性批量查询（原实现为逐点查询，每页 160 条 SELECT）
List<String> pageLongNames = new ArrayList<>();
for (int i = startIndex; i < endIndex; i++) {
    String deviceCode = "No" + deviceNos.get(i);
    for (String key : dataMap.keySet()) {
        pageLongNames.add(structure + brand + deviceCode + dataMap.get(key));
    }
}
Map<String, String> realValMap = getPointsRealValMap(pageLongNames);

List<Map<String, String>> heatPumpDataList = new ArrayList<>();
for (int i = startIndex; i < endIndex; i++) {
    int deviceNo = deviceNos.get(i);
    String deviceCode = "No" + deviceNo;
    String displayName = buildDisplayName(deviceNo);

    Map<String, String> heatPumpDataMap = new HashMap<>();
    heatPumpDataMap.put("热泵序号", displayName);
    heatPumpDataMap.put("heatPumpNo", displayName);
    heatPumpDataMap.put("heatPumpIndex", String.valueOf(i + 1));
    heatPumpDataMap.put("heatPumpCode", deviceCode);

    for (String key : dataMap.keySet()) {
        String longName = structure + brand + deviceCode + dataMap.get(key);
        String rawVal = realValMap.getOrDefault(longName, "");
        heatPumpDataMap.put(key, formatParamValue(key, rawVal));
    }

    heatPumpDataList.add(heatPumpDataMap);
}

data.put("list", heatPumpDataList);
data.put("pageNum", pageNum);
data.put("pageSize", pageSize);
data.put("total", total);
data.put("totalPages", totalPages);

return data;
