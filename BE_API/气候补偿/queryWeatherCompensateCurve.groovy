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
import com.sunwayland.platform.dao.data.DataColumnCollection;
import com.sunwayland.platform.dao.data.DataRowCollection;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dao.impl.PsSqlImpl;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;

import java.math.BigDecimal;
import java.math.RoundingMode;

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

boolean isTest = false;

SnowFlake creatId = new SnowFlake();

// --------------------- 气候补偿页面传入参数 --------------------- \\

// 调节模式(传入参数)
String parameterAdjustmentMode = data.get("adjustmentMode");
data.remove("adjustmentMode");
// 智能调节(传入参数)
String parameterIntelligentAdjustment = data.get("intelligentAdjustment");
data.remove("intelligentAdjustment");

// --------------------- 查询EF气候补偿数据 --------------------- \\





// --------------------- 查询EF气候补偿数据 --------------------- \\

// 调节模式
String adjustmentModeEF;
// 智能调节
String intelligentAdjustmentEF;
// 室内温度
String indoorTemperatureEF;
// 温度档位
String gearPositionEF;
// 热泵总运行模式
String hpTotalRunMode;

// EF点长名集合
List<String> pointList = new ArrayList<>();
pointList.add("WDBCTJMS"); 
pointList.add("WDBCZNTJ");
pointList.add("MDSNWDSD");
pointList.add("WDBCDWXZ");
pointList.add("HPTotalRunMode");

// 查询EF气候补偿数据
for (int i = 0; i < pointList.size(); i++) {
    String pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a " + 
    "WHERE a.taglongname IN ('Sys\\FinforWorx\\" + pointList.get(i).toString() + "')";

    DataTable dataTable = dataService.queryListDataBySql(pointSql);
    DataRowCollection dataRows = dataTable.getRows();
    DataColumnCollection dataColumns = dataTable.getColumns();

    String pointValue;
    if(dataRows.size() == 1){
        for(int c = 0; c < dataColumns.size(); c++){
            if(dataColumns.get(c).getColumnName() == "realval"){
                if (dataTable.getValue(0,c) == null || dataTable.getValue(0,c).equals("")) {
                    data.put("state", "fail");
                    data.put("message", "气候补偿实时数据异常");
                    return data;
                } else {
                    pointValue = dataTable.getValue(0,c).toString();
                }
            }
        }
    } else {
        data.put("state", "fail");
        data.put("message", "气候补偿实时数据异常");
        return data;
    }

    switch (i) {
        case 0:
            if (pointValue.equals("0")) {
                adjustmentModeEF = "智能调节";
            } else if (pointValue.equals("1")) {
                adjustmentModeEF = "自定义调节";
            } else {
                data.put("state", "fail");
                data.put("message", "气候补偿实时数据异常");
                return data;
            }
            break;
        case 1:
            if (pointValue.equals("0")) {
                intelligentAdjustmentEF = "自动校准调节";
            } else if (pointValue.equals("1")) {
                intelligentAdjustmentEF = "人工调节";
            } else {
                data.put("state", "fail");
                data.put("message", "气候补偿实时数据异常");
                return data;
            }
            break;
        case 2:
            if (pointValue == null || pointValue.equals("")) {
                data.put("state", "fail");
                data.put("message", "气候补偿实时数据异常");
                return data;
            } else {
                indoorTemperatureEF = pointValue;
            }
            break;
        case 3:
            if (pointValue == null || pointValue.equals("")) {
                data.put("state", "fail");
                data.put("message", "气候补偿实时数据异常");
                return data;
            } else {
                gearPositionEF = pointValue;
            }
            break;
        case 4:
            if (pointValue == null || pointValue.equals("")) {
                data.put("state", "fail");
                data.put("message", "气候补偿实时数据异常");
                return data;
            } else {
                hpTotalRunMode = pointValue;
            }
            break;
    }
}

// 档位曲线ID
String gearPositionUuidEF;

// 查询温度档位对应曲线ID
String selectWCIdSql;

if (hpTotalRunMode == "0") {
    if (Integer.parseInt(gearPositionEF) > 16) {
        gearPositionEF = String.valueOf(33 - Integer.parseInt(gearPositionEF));
    }
    selectWCIdSql = "SELECT id FROM sjmg_weather_compensate WHERE weather_compensate_code = '" + gearPositionEF + "' AND weather_compensate_mode = '制冷'";
} else {
    selectWCIdSql = "SELECT id FROM sjmg_weather_compensate WHERE weather_compensate_code = '" + gearPositionEF + "' AND weather_compensate_mode = '制热'";
}
data.put("sql", selectWCIdSql);
data.put("hpTotalRunMode", hpTotalRunMode);
try {
    List<Map<String,Object>> list = dynamicDataSource.excuteTenantSqlQuery(selectWCIdSql, dbCode);
    data.put("list", list);
    if (list.size() == 1) {
        gearPositionUuidEF = list.get(0).get("id").toString();   
    } else {
        data.put("state", "fail");
        data.put("message", "档位对应温度曲线异常");
        return data;
    }
} catch (Exception e) {
    data.put("state", "fail");
    data.put("message", "档位对应温度曲线异常");
    return data;
}

if (isTest) {
    data.put("adjustmentModeEF", adjustmentModeEF);
    data.put("intelligentAdjustmentEF", intelligentAdjustmentEF);
    data.put("indoorTemperatureEF", indoorTemperatureEF);
    data.put("gearPositionEF", gearPositionEF);
    data.put("gearPositionUuidEF", gearPositionUuidEF);
}

// --------------------- 查询MySQL气候补偿数据 --------------------- \\

// 调节模式
String adjustmentModeMySQL;
// 智能调节
String intelligentAdjustmentMySQL;
// 室内温度
String indoorTemperatureMySQL;
// 温度档位
String gearPositionMySQL;
// 档位曲线ID
String gearPositionUuidMySQL;
// 自定义曲线ID
String customizeUuidMySQL;
// 自定义曲线编码
String customizeCodeMySQL;
// 当前曲线ID
String useUuidMySQL;
// 是否使用高级调节
String useAdvancedAdjustmentMySQL;

// 查询MySQL气候补偿数据
String selectWeatherConfigureSql = "SELECT c.adjustment_mode,c.intelligent_adjustment,c.indoor_temperature,y.weather_compensate_code AS gear_position," + 
"c.gear_position_uuid,c.customize_uuid,z.weather_compensate_code AS customize_code,c.use_uuid,c.use_advanced_adjustment " + 
"FROM sjmg_weather_configure AS c LEFT JOIN sjmg_weather_compensate AS y ON c.gear_position_uuid = y.id " + 
"LEFT JOIN sjmg_weather_compensate AS z ON c.customize_uuid = z.id";
try {
    List<Map<String,Object>> selectWeatherConfigureList = dynamicDataSource.excuteTenantSqlQuery(selectWeatherConfigureSql, dbCode);

    if (selectWeatherConfigureList.size() == 1) {
        adjustmentModeMySQL = selectWeatherConfigureList.get(0).get("adjustment_mode").toString();
        intelligentAdjustmentMySQL = selectWeatherConfigureList.get(0).get("intelligent_adjustment").toString();
        indoorTemperatureMySQL = selectWeatherConfigureList.get(0).get("indoor_temperature").toString();
        gearPositionMySQL = selectWeatherConfigureList.get(0).get("gear_position").toString();
        gearPositionUuidMySQL = selectWeatherConfigureList.get(0).get("gear_position_uuid").toString();

        if (selectWeatherConfigureList.get(0).get("customize_uuid") != null && !selectWeatherConfigureList.get(0).get("customize_uuid").toString().equals("")) {
            customizeUuidMySQL = selectWeatherConfigureList.get(0).get("customize_uuid").toString();
        } else {
            customizeUuidMySQL = "";
        }

        if (selectWeatherConfigureList.get(0).get("customize_code") != null && !selectWeatherConfigureList.get(0).get("customize_code").toString().equals("")) {
            customizeCodeMySQL = selectWeatherConfigureList.get(0).get("customize_code").toString();
        } else {
            customizeCodeMySQL = "";
        }

        if (selectWeatherConfigureList.get(0).get("use_uuid") != null && !selectWeatherConfigureList.get(0).get("use_uuid").toString().equals("")) {
            useUuidMySQL = selectWeatherConfigureList.get(0).get("use_uuid").toString();
        } else {
            useUuidMySQL = "";
        }

        if (selectWeatherConfigureList.get(0).get("use_advanced_adjustment") != null && 
            !selectWeatherConfigureList.get(0).get("use_advanced_adjustment").toString().equals("")) {
            useAdvancedAdjustmentMySQL = selectWeatherConfigureList.get(0).get("use_advanced_adjustment").toString();
        } else {
            useAdvancedAdjustmentMySQL = "0";
        }
    } else {
        data.put("state", "fail");
        data.put("message", "气候补偿基础数据异常");
        return data;
    }
} catch (Exception e) {
    data.put("state", "fail");
    data.put("message", "气候补偿基础数据异常");
    return data;
}

if (isTest) {
    data.put("adjustmentModeMySQL", adjustmentModeMySQL);
    data.put("intelligentAdjustmentMySQL", intelligentAdjustmentMySQL);
    data.put("indoorTemperatureMySQL", indoorTemperatureMySQL);
    data.put("gearPositionUuidMySQL", gearPositionUuidMySQL);
    data.put("customizeUuidMySQL", customizeUuidMySQL);
    data.put("useUuidMySQL", useUuidMySQL);
    data.put("useAdvancedAdjustmentMySQL", useAdvancedAdjustmentMySQL);
}

// --------------------- 查询EF温度曲线数据 --------------------- \\
String pointLongNames = "";
if (hpTotalRunMode == "0") { // 制冷ef
    for (int i = 0; i < 41; i++) {
        pointLongNames += "Sys\\ClimateCompensation\\Cold\\SetTemp_" + i + ",";
    }
} else { // 制热ef
    for (int i = -50; i < 20; i++) {
        if (i < 0) {
            pointLongNames += "Sys\\ClimateCompensation\\Hot\\SetTemp_neg" +  Math.abs(i) + ",";
        } else {
            pointLongNames += "Sys\\ClimateCompensation\\Hot\\SetTemp_" + i + ",";
        }
    }
}


// EF温度曲线
boolean validCurve = true;
Map<String, String> curveEFMap = new LinkedHashMap<>();

if (pointLongNames.length() > 1) {
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
        validCurve = false;

        data.put("state", "fail");
        data.put("message", "温度曲线实时数据异常");
        return data;
    } else {
        String key = "";
        if (hpTotalRunMode == "0") {
            for (int i = 0; i < 41; i++) {
                key = "Sys\\ClimateCompensation\\Cold\\SetTemp_" + i;
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
        } else {
            for (int i = -50; i < 20; i++) {
                if (i < 0) {
                    key = "Sys\\ClimateCompensation\\Hot\\SetTemp_neg" +  Math.abs(i);
                } else {
                    key = "Sys\\ClimateCompensation\\Hot\\SetTemp_" + i;
                }

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
        }
        
    }
}

if (isTest) {
    data.put("validCurve", validCurve);
    data.put("curveEFMap", JSON.toJSONString(curveEFMap));
}

// --------------------- MySQL同步EF温度曲线数据 --------------------- \\
// 说明：查询接口只读取 EF 数据用于展示，不再执行 EF -> MySQL 归档同步。
// 归档同步统一收口到 saveWeatherCompensateGear / saveCustomizeCurve 等写操作接口，
// 避免查询时根据 EF 中可能滞后的档位/模式标志误写 MySQL 备份记录。

// --------------------- 根据页面参数判断：展示数据 / 设置数据并回显 --------------------- \\
Map<String, Object> resultMap = new HashMap<>();

if (parameterAdjustmentMode != null && parameterAdjustmentMode != "" && parameterIntelligentAdjustment != null && parameterIntelligentAdjustment != "") {
    // --------------------- 设置气候补偿数据并且回显 --------------------- \\
    resultMap.put("adjustmentMode", parameterAdjustmentMode);
    resultMap.put("intelligentAdjustment", parameterIntelligentAdjustment);

    String useUuid;
    if (parameterAdjustmentMode.equals("智能调节")) {
        // 智能调节
        useUuid = gearPositionUuidMySQL;
        
        if (parameterIntelligentAdjustment.equals("自动校准调节")) {
            // 自动校准调节
            resultMap.put("indoorTemperature", indoorTemperatureEF);
        } else {
            // 人工调节
        }
        resultMap.put("gearPosition", gearPositionMySQL);
    } else {
        // 自定义调节
        Map<String, Object> resultCurveMap = new HashMap<>();

        if (useAdvancedAdjustmentMySQL.equals("0")) {
            useUuid = gearPositionUuidMySQL;

            resultCurveMap.put("id", gearPositionUuidEF);
            resultCurveMap.put("name", gearPositionEF);
        } else if (useAdvancedAdjustmentMySQL.equals("1")) {
            useUuid = customizeUuidMySQL;

            resultCurveMap.put("id", customizeUuidMySQL);
            resultCurveMap.put("name", customizeCodeMySQL);
        } else {
            data.put("state", "fail");
            data.put("message", "气候补偿高级调节开关异常");
            return data;
        }

        if (parameterIntelligentAdjustment.equals("自动校准调节")) {
            // 自动校准调节
            resultMap.put("indoorTemperature", indoorTemperatureEF);
        } else {
            // 人工调节
        }

        Map<String, String> showCurveMap = new LinkedHashMap<>();
        String selectSql = "SELECT id,weather_compensate_code,weather_compensate_curve FROM sjmg_weather_compensate WHERE id = '" + useUuid + "'";
        try {
            List<Map<String,Object>> selectList = dynamicDataSource.excuteTenantSqlQuery(selectSql, dbCode);

            if (selectList.size() == 1) {
                String weatherCompensateCurveJson = selectList.get(0).get("weather_compensate_curve").toString();
                showCurveMap = (Map<String, String>) JSON.parse(weatherCompensateCurveJson);
            } else {
                data.put("state", "fail");
                data.put("message", "气候补偿曲线异常");
                return data;
            }
        } catch (Exception e) {
            data.put("state", "fail");
            data.put("message", "气候补偿曲线异常");
            return data;
        }

        List<Integer> xList = new ArrayList<>();
        List<BigDecimal> curveList = new ArrayList<>();

        if (hpTotalRunMode == "0") {
            for (int i = 0; i < 41; i++) {
                xList.add(i);

                BigDecimal temperature = new BigDecimal("5");
                String lastKey = "";

                for (String key : showCurveMap.keySet()) {
                    int pointName = Integer.parseInt(key);

                    BigDecimal pointValue;
                    try {
                        pointValue = new BigDecimal(showCurveMap.get(key).toString());
                    } catch (Exception e) {
                        pointValue = new BigDecimal("5");
                    }

                    if (i == pointName) {
                        temperature = pointValue;
                        lastKey = key;
                        break;
                    }
                }

                curveList.add(temperature);

                if (!lastKey.equals("")) {
                    showCurveMap.remove(lastKey);
                }
            }
        } else {
            for (int i = -50; i < 20; i++) {
                xList.add(i);

                BigDecimal temperature = new BigDecimal("20");
                String lastKey = "";

                for (String key : showCurveMap.keySet()) {
                    int pointName = Integer.parseInt(key);

                    BigDecimal pointValue;
                    try {
                        pointValue = new BigDecimal(showCurveMap.get(key).toString());
                    } catch (Exception e) {
                        pointValue = new BigDecimal("20");
                    }

                    if (i == pointName) {
                        temperature = pointValue;
                        lastKey = key;
                        break;
                    }
                }

                curveList.add(temperature);

                if (!lastKey.equals("")) {
                    showCurveMap.remove(lastKey);
                }
            }
        }
        

        resultCurveMap.put("x", xList);
        resultCurveMap.put("curve", curveList);
        resultMap.put("curve", resultCurveMap);
    }
    
    // --------------------- 下置温度曲线数据 --------------------- \\
    if (!useUuid.equals(useUuidMySQL)) {
        // 高级调节 -> 切换模式 -> 自定义调节，防止获取数据失败
        if (useUuid.length() > 2) {
            useUuid = useUuidMySQL;
        }
        AlgorithmProcessExecuteParam curveParam = new AlgorithmProcessExecuteParam();
        curveParam.setAlgorithmProcessId("writeWeatherCompensateCurve");
        Map<String, String> curveParamData = new HashMap();
        Map<String, String> curveParamMap = new HashMap();
        curveParamMap.put("curveId", useUuid);
        curveParamMap.put("runMode", hpTotalRunMode);
        curveParamData.put("data", curveParamMap);
        curveParam.setParam(curveParamData);
        
        Map<String, String> curveSolResultMap = (Map<String, String>) sol.execute(curveParam);

        if (!curveSolResultMap.get("state").equals("success")) {
            data.put("state", "fail");
            data.put("message", "温度曲线下置数据异常");
            data.put("useUuid", useUuid);
            data.put("useUuidMySQL", useUuidMySQL);
            data.put("curveId", useUuid);
            data.put("curveSolResultMap", curveSolResultMap);
            return data;
        }
    }

    // --------------------- 保存气候补偿数据 --------------------- \\
    String updateSql = "UPDATE sjmg_weather_configure SET adjustment_mode = '" + parameterAdjustmentMode + "'" + 
    ",intelligent_adjustment = '" + parameterIntelligentAdjustment + "'";

    String operationContent = "气候补偿页面-修改气候补偿-调节模式:" + parameterAdjustmentMode + ",智能调节:" + parameterIntelligentAdjustment;

    if (!useUuid.equals(useUuidMySQL)) {
        updateSql += ",use_uuid = '" + useUuid + "'";
        operationContent += ",当前曲线ID:" + useUuid;
    }

    if (parameterAdjustmentMode.equals("智能调节")) {
        updateSql += ",use_advanced_adjustment = '0'";
        operationContent += ",当前曲线ID:0";
    }

    String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

    if (result.equals("success")) {
        // 执行业务编排
        paramMap.put("operationType", "修改");
        paramMap.put("operationContent", operationContent);
        Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
    } else {
        data.put("state", "fail");
        data.put("message", "调节模式、智能调节，修改失败");
        return data;
    }

    if (isTest) {
        data.put("保存设置数据同步EF数据SQL", updateSql);
        data.put("保存设置数据同步EF数据结果", result);
    }

    // --------------------- 下置页面气候补偿数据 --------------------- \\
    AlgorithmProcessExecuteParam configureParam = new AlgorithmProcessExecuteParam();
    configureParam.setAlgorithmProcessId("writeRealvalByLongNames");
    Map<String, String> configureParamData = new HashMap();
    Map<String, String> configureParamMap = new HashMap();
    configureParamData.put("data", configureParamMap);
    configureParam.setParam(configureParamData);

    Map<String, String> dataMap = new HashMap<>();

    if (parameterAdjustmentMode.equals("智能调节")) {
        dataMap.put("Sys\\FinforWorx\\WDBCTJMS", "0");
        dataMap.put("Sys\\FinforWorx\\WDBCDWXZ", gearPositionUuidMySQL);
    } else {
        dataMap.put("Sys\\FinforWorx\\WDBCTJMS", "1");

        if (useAdvancedAdjustmentMySQL.equals("0")) {
            dataMap.put("Sys\\FinforWorx\\WDBCDWXZ", gearPositionUuidMySQL);
        }
    }
    
    if (parameterIntelligentAdjustment.equals("自动校准调节")) {
        dataMap.put("Sys\\FinforWorx\\WDBCZNTJ", "0");
    } else {
        dataMap.put("Sys\\FinforWorx\\WDBCZNTJ", "1");
    }
    
    configureParamMap.put("writeData", JSON.toJSONString(dataMap));
    Map<String, String> configureSolResultMap = (Map<String, String>) sol.execute(configureParam);

    if (!configureSolResultMap.get("state").equals("success")) {
        data.put("state", "fail");
        data.put("message", "气候补偿下置数据异常");
        return data;
    }
} else {
    // --------------------- 用于页面展示气候补偿数据 --------------------- \\
    resultMap.put("adjustmentMode", adjustmentModeEF);
    resultMap.put("intelligentAdjustment", intelligentAdjustmentEF);

    String useUuidEF;
    if (adjustmentModeEF.equals("智能调节")) {
        // 智能调节
        useUuidEF = gearPositionUuidEF;

        if (intelligentAdjustmentEF.equals("自动校准调节")) {
            // 自动校准调节
            resultMap.put("indoorTemperature", indoorTemperatureEF);
        } else {
            // 人工调节
        }
        
        resultMap.put("gearPosition", gearPositionEF);
    } else {
        // 自定义调节
        Map<String, Object> resultCurveMap = new HashMap<>();

        if (useAdvancedAdjustmentMySQL.equals("0")) {
            useUuidEF = gearPositionUuidEF;

            resultCurveMap.put("id", gearPositionUuidEF);
            resultCurveMap.put("name", gearPositionEF);
        } else if (useAdvancedAdjustmentMySQL.equals("1")) {
            useUuidEF = customizeUuidMySQL;

            resultCurveMap.put("id", customizeUuidMySQL);
            resultCurveMap.put("name", customizeCodeMySQL);
        } else {
            data.put("state", "fail");
            data.put("message", "气候补偿高级调节开关异常");
            return data;
        }
        
        if (intelligentAdjustmentEF.equals("自动校准调节")) {
            // 自动校准调节
            resultMap.put("indoorTemperature", indoorTemperatureEF);
        } else {
            // 人工调节
        }

        Map<String, String> showCurveMap = new LinkedHashMap<>();
        if (validCurve) {
            showCurveMap.putAll(curveEFMap);
        } else {
            String selectSql = "SELECT id,weather_compensate_code,weather_compensate_curve FROM sjmg_weather_compensate WHERE id = '" + useUuidEF + "'";
            try {
                List<Map<String,Object>> selectList = dynamicDataSource.excuteTenantSqlQuery(selectSql, dbCode);

                if (selectList.size() == 1) {
                    String weatherCompensateCurveJson = selectList.get(0).get("weather_compensate_curve").toString();
                    showCurveMap = (Map<String, String>) JSON.parse(weatherCompensateCurveJson);
                } else {
                    data.put("state", "fail");
                    data.put("message", "气候补偿曲线异常");
                    return data;
                }
            } catch (Exception e) {
                data.put("state", "fail");
                data.put("message", "气候补偿曲线异常");
                return data;
            }
        }

        List<Integer> xList = new ArrayList<>();
        List<BigDecimal> curveList = new ArrayList<>();

        if (hpTotalRunMode == "0") {
            for (int i = 0; i < 41; i++) {
                xList.add(i);

                BigDecimal temperature = new BigDecimal("0");
                String lastKey = "";

                for (String key : showCurveMap.keySet()) {
                    int pointName = Integer.parseInt(key);

                    BigDecimal pointValue;
                    try {
                        pointValue = new BigDecimal(showCurveMap.get(key).toString());
                    } catch (Exception e) {
                        pointValue = new BigDecimal("0");
                    }

                    if (i == pointName) {
                        temperature = pointValue;
                        lastKey = key;
                        break;
                    }
                }

                curveList.add(temperature);

                if (!lastKey.equals("")) {
                    showCurveMap.remove(lastKey);
                }
            }
        } else {
            for (int i = -50; i < 20; i++) {
                xList.add(i);

                BigDecimal temperature = new BigDecimal("20");
                String lastKey = "";

                for (String key : showCurveMap.keySet()) {
                    int pointName = Integer.parseInt(key);

                    BigDecimal pointValue;
                    try {
                        pointValue = new BigDecimal(showCurveMap.get(key).toString());
                    } catch (Exception e) {
                        pointValue = new BigDecimal("20");
                    }

                    if (i == pointName) {
                        temperature = pointValue;
                        lastKey = key;
                        break;
                    }
                }

                curveList.add(temperature);

                if (!lastKey.equals("")) {
                    showCurveMap.remove(lastKey);
                }
            }
        }

        resultCurveMap.put("x", xList);
        resultCurveMap.put("curve", curveList);
        resultMap.put("curve", resultCurveMap);
    }

    // --------------------- MySQL同步EF气候补偿数据 --------------------- \\
    if (1 == 1) {
        boolean isUpdate = false;

        // MySQL同步EF气候补偿数据
        String updateSql = "UPDATE sjmg_weather_configure SET ";

        String operationContent = "气候补偿页面-同步EF气候补偿数据-";

        if (!adjustmentModeEF.equals(adjustmentModeMySQL)) {
            updateSql += "adjustment_mode = '" + adjustmentModeEF + "',";
            operationContent += "同步调节模式:" + adjustmentModeEF + ","; 
            isUpdate = true;
        }

        if (!intelligentAdjustmentEF.equals(intelligentAdjustmentMySQL)) {
            updateSql += "intelligent_adjustment = '" + intelligentAdjustmentEF + "',";
            operationContent += "同步智能调节:" + intelligentAdjustmentEF + ","; 
            isUpdate = true;
        }

        if (!indoorTemperatureEF.equals(indoorTemperatureMySQL)) {
            updateSql += "indoor_temperature = '" + indoorTemperatureEF + "',";
            operationContent += "同步室内温度:" + indoorTemperatureEF + ","; 
            isUpdate = true;
        }

        if (!gearPositionUuidEF.equals(gearPositionUuidMySQL)) {
            updateSql += "gear_position_uuid = '" + gearPositionUuidEF + "',";
            operationContent += "同步档位曲线ID:" + gearPositionUuidEF + ","; 
            isUpdate = true;
        }

        if (!useUuidEF.equals(useUuidMySQL)) {
            updateSql += "use_uuid = '" + useUuidEF + "',";
            operationContent += "当前曲线ID:" + useUuidEF + ","; 
            isUpdate = true;
        }

        if (isUpdate) {
            updateSql = updateSql.substring(0, updateSql.length() - 1);
            String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

            if (isTest) {
                data.put("MySQL同步EF气候补偿SQL", updateSql);
                data.put("MySQL同步EF气候补偿结果", result);
            }

            if (result.equals("success")) {
                // 执行业务编排
                paramMap.put("operationType", "同步");
                paramMap.put("operationContent", operationContent);
                Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
            } else {
                data.put("state", "fail");
                data.put("message", "MySQL同步EF气候补偿数据失败");
                return data;
            }
        }
    }
}

data.put("weather", resultMap);

return data;