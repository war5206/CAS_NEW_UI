/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量 data类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page
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

String selectArrangeSql = "SELECT device_uuid, row_number, column_number FROM sjmg_pump_arrange ORDER BY row_number, column_number";
List<Map<String,Object>> arrangeList;
try {
    arrangeList = dynamicDataSource.excuteTenantSqlQuery(selectArrangeSql, dbCode);
} catch (Exception e) {
    arrangeList = new ArrayList();
}

List<Map<String, Object>> heatPumpList = new ArrayList<>();
for (Map<String,Object> arrangeMap : arrangeList) {
    String deviceCode = arrangeMap.get("device_uuid")?.toString() ?: "";
    if (deviceCode.equals("")) {
        continue;
    }

    String rowNumber = arrangeMap.get("row_number")?.toString() ?: "1";
    String columnNumber = arrangeMap.get("column_number")?.toString() ?: "1";

    boolean run = isPointValueOne(getPointRealVal(structure + brand + deviceCode + "\\Machine_Operation"));
    boolean defrost = isPointValueOne(getPointRealVal(structure + brand + deviceCode + "\\Systematic_Defrosting"));
    boolean fault = isPointValueOne(getPointRealVal(structure + brand + deviceCode + "\\Fault_Alarm"));

    Map<String, Object> heatPumpMap = new HashMap<>();
    heatPumpMap.put("code", deviceCode);
    heatPumpMap.put("name", buildDisplayName(deviceCode));
    heatPumpMap.put("row", rowNumber);
    heatPumpMap.put("column", columnNumber);
    heatPumpMap.put("alarm", fault);
    heatPumpMap.put("run", run);
    heatPumpMap.put("state", buildCombinedState(run, defrost, fault));
    heatPumpList.add(heatPumpMap);
}

data.put("heatPump", heatPumpList);
return data;
