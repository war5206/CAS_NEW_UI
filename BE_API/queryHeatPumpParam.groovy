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

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser.dbCode;
if (dbCode.equals("base")) {
    dbCode = "t01";
}

String structure = "HeatPump\\";
String brand = "SJMG\\";

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

def buildCombinedState = { boolean run, boolean defrost, boolean fault ->
    List<String> parts = new ArrayList<>();
    parts.add(run ? "运行" : "待机");
    if (defrost) {
        parts.add("化霜");
    }
    if (fault) {
        parts.add("故障");
    }
    return String.join("/", parts);
};

// Systematic_Defrosting=1 → 化霜；Fault_Alarm=1 → 故障；DeviceStatus 不为 1 → 通讯故障
def readDeviceStatus = { String deviceCode ->
    boolean run = isPointValueOne(getPointRealVal(structure + brand + deviceCode + "\\Machine_Operation"));
    boolean defrost = isPointValueOne(getPointRealVal(structure + brand + deviceCode + "\\Systematic_Defrosting"));
    boolean faultAlarm = isPointValueOne(getPointRealVal(structure + brand + deviceCode + "\\Fault_Alarm"));
    boolean commNormal = isPointValueOne(getPointRealVal(structure + brand + deviceCode + "\\DeviceStatus"));
    boolean fault = faultAlarm || !commNormal;
    Map statusMap = new HashMap();
    statusMap.put("run", run);
    statusMap.put("defrost", defrost);
    statusMap.put("fault", fault);
    statusMap.put("state", buildCombinedState(run, defrost, fault));
    return statusMap;
};

def buildDisplayName = { String deviceCode ->
    try {
        int deviceNo = Integer.parseInt(deviceCode.replace("No", ""));
        if (deviceNo >= 31) {
            return "风冷模块" + (deviceNo - 30);
        }
        return "热泵" + deviceNo;
    } catch (Exception e) {
        return deviceCode;
    }
};

String deviceCode = "No1";
try {
    deviceCode = data.get("code").toString().trim();
} catch (Exception e) {
    deviceCode = "No1";
}

Map statusMap = readDeviceStatus(deviceCode);
boolean run = statusMap.get("run");
boolean defrost = statusMap.get("defrost");
boolean fault = statusMap.get("fault");

Map<String, String> heatPumpDataMap = new HashMap<>();
for (String key : dataMap.keySet()) {
    String longName = structure + brand + deviceCode + dataMap.get(key);
    String rawVal = getPointRealVal(longName);
    heatPumpDataMap.put(key, formatParamValue(key, rawVal));
}

data.put("alarm", fault);
data.put("run", run);
data.put("defrost", defrost);
data.put("state", statusMap.get("state"));
data.put("heatPumpData", heatPumpDataMap);
data.put("code", deviceCode);
data.put("name", buildDisplayName(deviceCode));

return data;
