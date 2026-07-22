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
import com.sunwayland.platform.dao.impl.PsSqlImpl;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);

// 登录用户信息
PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String userUuid = ptUser.userUuid;
String niceName = ptUser.niceName;
String dbCode = ptUser.dbCode;
if(dbCode.equals("base")){
    dbCode = "t01"
}

// 调用逻辑编排
FeignSolAlgorithmProcess sol = ApplicationContextProvider.getBean(FeignSolAlgorithmProcess.class);
// 逻辑编排参数
AlgorithmProcessExecuteParam param = new AlgorithmProcessExecuteParam();
param.setAlgorithmProcessId("writeOperationLog");
Map<String, String> paramData = new HashMap();
Map<String, String> paramMap = new HashMap();
paramData.put("data", paramMap);
param.setParam(paramData);

SnowFlake creatId = new SnowFlake();

// --------------------- 公共方法：同步 EF 当前曲线到 MySQL 指定曲线记录 ---------------------
// 说明：EF 中的 SetTemp_* 曲线点位是权威实时数据，MySQL 只是备份快照。
// 归档同步只应发生在写操作接口中，且目标记录由当前操作意图决定，不依赖 EF 中可能滞后的标志位。
def syncCurveFromEFToMySQL = { String targetCurveId, String runMode ->
    if (targetCurveId == null || targetCurveId.equals("")) {
        return false;
    }

    String pointLongNames = "";
    if (runMode == "1") {
        for (int i = -50; i < 20; i++) {
            if (i < 0) {
                pointLongNames += "Sys\\ClimateCompensation\\Hot\\SetTemp_neg" + Math.abs(i) + ",";
            } else {
                pointLongNames += "Sys\\ClimateCompensation\\Hot\\SetTemp_" + i + ",";
            }
        }
    } else {
        for (int i = 0; i < 41; i++) {
            pointLongNames += "Sys\\ClimateCompensation\\Cold\\SetTemp_" + i + ",";
        }
    }

    if (pointLongNames.length() <= 1) {
        return false;
    }
    pointLongNames = pointLongNames.substring(0, pointLongNames.length() - 1);

    AlgorithmProcessExecuteParam realValueParam = new AlgorithmProcessExecuteParam();
    realValueParam.setAlgorithmProcessId("queryRealvalByLongNames");
    Map<String, String> realValueParamData = new HashMap();
    Map<String, String> realValueParamMap = new HashMap();
    realValueParamMap.put("longNames", pointLongNames);
    realValueParamData.put("data", realValueParamMap);
    realValueParam.setParam(realValueParamData);

    Map<String, String> realValueSolResultMap = (Map<String, String>) sol.execute(realValueParam);
    if (realValueSolResultMap.isEmpty()) {
        return false;
    }

    boolean validCurve = true;
    Map<String, String> curveEFMap = new LinkedHashMap<>();

    if (runMode == "1") {
        for (int i = -50; i < 20; i++) {
            String key = i < 0 ? "Sys\\ClimateCompensation\\Hot\\SetTemp_neg" + Math.abs(i) : "Sys\\ClimateCompensation\\Hot\\SetTemp_" + i;
            try {
                String pointValue = realValueSolResultMap.get(key);
                if (!pointValue.equals("null") && !pointValue.equals("")) {
                    BigDecimal pointValueBD = new BigDecimal(pointValue);
                    if (pointValueBD.compareTo(new BigDecimal("20")) < 0) {
                        validCurve = false;
                        curveEFMap.put(i + "", "20");
                    } else {
                        curveEFMap.put(i + "", pointValue);
                    }
                } else {
                    validCurve = false;
                    curveEFMap.put(i + "", "20");
                }
            } catch (Exception e) {
                validCurve = false;
                curveEFMap.put(i + "", "20");
            }
        }
    } else {
        for (int i = 0; i < 41; i++) {
            String key = "Sys\\ClimateCompensation\\Cold\\SetTemp_" + i;
            try {
                String pointValue = realValueSolResultMap.get(key);
                if (!pointValue.equals("null") && !pointValue.equals("")) {
                    BigDecimal pointValueBD = new BigDecimal(pointValue);
                    if (pointValueBD.compareTo(new BigDecimal("0")) < 0) {
                        validCurve = false;
                        curveEFMap.put(i + "", "0");
                    } else {
                        curveEFMap.put(i + "", pointValue);
                    }
                } else {
                    validCurve = false;
                    curveEFMap.put(i + "", "0");
                }
            } catch (Exception e) {
                validCurve = false;
                curveEFMap.put(i + "", "0");
            }
        }
    }

    if (!validCurve) {
        return false;
    }

    String curveEFJson = JSON.toJSONString(curveEFMap);
    String updateSql = "UPDATE sjmg_weather_compensate SET weather_compensate_curve = '" + curveEFJson + "' WHERE `id` = '" + targetCurveId + "'";
    String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

    if (result.equals("success")) {
        paramMap.put("operationType", "同步");
        paramMap.put("operationContent", "气候补偿页面-同步EF曲线到MySQL备份-曲线ID:" + targetCurveId + ",曲线数据:" + curveEFJson);
        Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
        return true;
    }

    return false;
}

// --------------------- 公共方法：等待 EF 档位值稳定 ---------------------
def waitForEFGearPosition = { String expectedValue, long timeoutMs, long intervalMs ->
    long startTime = System.currentTimeMillis();
    while (System.currentTimeMillis() - startTime < timeoutMs) {
        String pointSql = "SELECT a.realval FROM psrealdata AS a WHERE a.taglongname = 'Sys\\FinforWorx\\WDBCDWXZ'";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        String currentValue = "";
        if (dt.getRows().size() == 1) {
            try {
                currentValue = dt.getValue(0, 0).toString();
            } catch (Exception e) {
                currentValue = "";
            }
        }
        if (expectedValue.equals(currentValue)) {
            return true;
        }
        Thread.sleep(intervalMs);
    }
    return false;
}

// 当前档位
String gearPosition = data.get("gearPosition");
data.remove("gearPosition");

String pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\HPTotalRunMode')";
dt = dataService.queryListDataBySql(pointSql);
String hpTotalRunMode = "";
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                hpTotalRunMode = dt.getValue(0,c).toString();
            } catch (Exception e) {
                hpTotalRunMode = "1";
            }
        }
    }
}

// 查询 MySQL 当前配置，确定当前 EF 曲线属于哪条备份记录
String currentUseUuid = "";
String selectConfigSql = "SELECT gear_position_uuid,use_uuid FROM sjmg_weather_configure";
try {
    List<Map<String,Object>> configList = dynamicDataSource.excuteTenantSqlQuery(selectConfigSql, dbCode);
    if (configList.size() == 1) {
        currentUseUuid = configList.get(0).get("use_uuid").toString();
    }
} catch (Exception e) {
    data.put("state", "fail");
    data.put("message", "气候补偿基础数据异常");
    return data;
}

// --------------------- 归档当前使用中的曲线 ---------------------
// 切换前，EF 中的曲线属于 currentUseUuid 对应的记录，先把它同步回 MySQL 备份。
if (currentUseUuid != null && !currentUseUuid.equals("")) {
    boolean syncOldResult = syncCurveFromEFToMySQL(currentUseUuid, hpTotalRunMode);
    if (!syncOldResult) {
        // 同步失败不阻断切换流程，但记录日志
        paramMap.put("operationType", "同步");
        paramMap.put("operationContent", "气候补偿页面-切换档位前同步当前曲线失败-曲线ID:" + currentUseUuid);
        Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
    }
}

// 查询新档位对应曲线 ID
String selectSql;
if (hpTotalRunMode == "1") {
    selectSql = "SELECT * FROM sjmg_weather_compensate WHERE weather_compensate_mode = '制热' AND weather_compensate_type = '预设' AND " +
"weather_compensate_code = '" + gearPosition + "'";
} else {
    selectSql = "SELECT * FROM sjmg_weather_compensate WHERE weather_compensate_mode = '制冷' AND weather_compensate_type = '预设' AND " +
"weather_compensate_code = '" + gearPosition + "'";
}
List<Map<String,Object>> selectList = dynamicDataSource.excuteTenantSqlQuery(selectSql, dbCode);

String weatherId;
String weatherCode;
if (selectList.size() == 1) {
    weatherId = selectList.get(0).get("id").toString();
    weatherCode = selectList.get(0).get("weather_compensate_code").toString();
} else {
    data.put("state", "fail");
    data.put("message", "气候补偿预设曲线异常");
    return data;
}

// 下置新档位曲线到 EF
if (weatherId != null && weatherId != "") {
    AlgorithmProcessExecuteParam curveParam = new AlgorithmProcessExecuteParam();
    curveParam.setAlgorithmProcessId("writeWeatherCompensateCurve");
    Map<String, String> curveParamData = new HashMap();
    Map<String, String> curveParamMap = new HashMap();
    curveParamMap.put("curveId", weatherId);
    curveParamMap.put("runMode", hpTotalRunMode);
    curveParamData.put("data", curveParamMap);
    curveParam.setParam(curveParamData);

    Map<String, String> curveSolResultMap = (Map<String, String>) sol.execute(curveParam);

    if (!curveSolResultMap.get("state").equals("success")) {
        data.put("state", "fail");
        data.put("message", "温度曲线下置数据异常");
        return data;
    }
} else {
    data.put("state", "fail");
    data.put("message", "气候补偿预设曲线异常");
    return data;
}

// 修改气候补偿档位配置
String updateSql = "UPDATE sjmg_weather_configure SET gear_position_uuid = '" + weatherId + "',use_uuid = '" + weatherId + "'";
String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

if (result.equals("success")) {
    operationType = "修改";
    operationContent = "气候补偿页面-修改气候补偿-档位曲线ID:" + weatherId + ",当前曲线ID:" + weatherId;

    // 执行业务编排
    paramMap.put("operationType", operationType);
    paramMap.put("operationContent", operationContent);
    Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);

    data.put("state", "success");
    data.put("message", "下置气候补偿档位成功");
} else {
    data.put("state", "fail");
    data.put("message", "下置气候补偿档位失败");
}

// 下置 EF 档位值
if (weatherCode != null && weatherCode != "") {
    AlgorithmProcessExecuteParam configureParam = new AlgorithmProcessExecuteParam();
    configureParam.setAlgorithmProcessId("writeRealvalByLongNames");
    Map<String, String> configureParamData = new HashMap();
    Map<String, String> configureParamMap = new HashMap();
    Map<String, String> dataMap = new HashMap<>();
    dataMap.put("Sys\\FinforWorx\\WDBCDWXZ", weatherCode);
    configureParamMap.put("writeData", JSON.toJSONString(dataMap));
    configureParamData.put("data", configureParamMap);
    configureParam.setParam(configureParamData);

    Map<String, String> configureSolResultMap = (Map<String, String>) sol.execute(configureParam);

    if (!configureSolResultMap.get("state").equals("success")) {
        data.put("state", "fail");
        data.put("message", "气候补偿档位下置数据异常");
        return data;
    }
} else {
    data.put("state", "fail");
    data.put("message", "气候补偿预设曲线异常");
    return data;
}

// --------------------- 等待 EF 档位值稳定 ---------------------
boolean stable = waitForEFGearPosition(weatherCode, 3000, 200);
if (!stable) {
    paramMap.put("operationType", "同步");
    paramMap.put("operationContent", "气候补偿页面-等待EF档位值稳定超时-期望值:" + weatherCode);
    Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
}

// --------------------- 归档新档位曲线 ---------------------
// 确认 EF 稳定后，把 EF 当前权威曲线同步到新档位的 MySQL 备份记录。
boolean syncNewResult = syncCurveFromEFToMySQL(weatherId, hpTotalRunMode);
if (!syncNewResult) {
    paramMap.put("operationType", "同步");
    paramMap.put("operationContent", "气候补偿页面-切换档位后同步新曲线失败-曲线ID:" + weatherId);
    Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
}

return data;
