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

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser.dbCode;
if (dbCode.equals("base")) {
    dbCode = "t01";
}

String structure = "HeatPump\\";
String brand = "SJMG\\";

int[] fixedDeviceNos = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42];

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

def getPointRealVal = { String taglongname ->
    String realVal = "";
    String querySql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('" + taglongname + "')";
    DataTable pointDt = dataService.queryListDataBySql(querySql);
    if (pointDt.getRows().size() == 1) {
        for (int c = 0; c < pointDt.getColumns().size(); c++) {
            if (pointDt.getColumns().get(c).getColumnName() == "realval") {
                try {
                    realVal = pointDt.getValue(0, c).toString().trim();
                } catch (Exception e) {
                    realVal = "";
                }
            }
        }
    }
    return realVal;
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
        return isPointValueOne(rawVal) ? "开" : "关";
    }
    return rawVal;
};

def buildDisplayName = { int deviceNo ->
    if (deviceNo >= 31) {
        return "风冷模块" + (deviceNo - 30);
    }
    return "热泵" + deviceNo;
};

int pageSize = 10;
int pageNum = 1;
try {
    pageNum = Integer.parseInt(data.get("pageNum").toString());
} catch (Exception e) {
    pageNum = 1;
}

int total = fixedDeviceNos.length;
int totalPages = (int) Math.ceil(total / (double) pageSize);
if (totalPages == 0) {
    totalPages = 1;
}
if (pageNum > totalPages) {
    pageNum = totalPages;
}

int startIndex = (pageNum - 1) * pageSize;
int endIndex = Math.min(startIndex + pageSize, total);

List<Map<String, String>> heatPumpDataList = new ArrayList<>();
for (int i = startIndex; i < endIndex; i++) {
    int deviceNo = fixedDeviceNos[i];
    String deviceCode = "No" + deviceNo;
    String displayName = buildDisplayName(deviceNo);

    Map<String, String> heatPumpDataMap = new HashMap<>();
    heatPumpDataMap.put("热泵序号", displayName);
    heatPumpDataMap.put("heatPumpNo", displayName);
    heatPumpDataMap.put("heatPumpIndex", String.valueOf(i + 1));
    heatPumpDataMap.put("heatPumpCode", deviceCode);

    for (String key : dataMap.keySet()) {
        String longName = structure + brand + deviceCode + dataMap.get(key);
        String rawVal = getPointRealVal(longName);
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
