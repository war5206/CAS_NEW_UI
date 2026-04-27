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

// 查询气候补偿信息
String selectWeatherConfigureSql = "SELECT customize_uuid,use_advanced_adjustment FROM sjmg_weather_configure";

// 自定义曲线
String customizeUuid;
// 是否开启高级调节
String useAdvancedAdjustment;

try {
    List<Map<String,Object>> selectWeatherConfigureList = dynamicDataSource.excuteTenantSqlQuery(selectWeatherConfigureSql, dbCode);

    if (selectWeatherConfigureList.size() == 1) {
        if (selectWeatherConfigureList.get(0).get("customize_uuid") == null) {
            customizeUuid = "";
        } else {
            customizeUuid = selectWeatherConfigureList.get(0).get("customize_uuid").toString();
        }
        
        useAdvancedAdjustment = selectWeatherConfigureList.get(0).get("use_advanced_adjustment").toString();
    } else {
        data.put("state", "fail");
        data.put("message", "气候补偿数据异常");
        return data;
    }
} catch (Exception e) {
    data.put("state", "fail");
    data.put("message", "气候补偿数据异常");
    return data;
}

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

// --------------------- MySQL同步EF温度曲线数据 --------------------- \\
if (customizeUuid != null && !customizeUuid.equals("") && useAdvancedAdjustment.equals("1")) {
    // 查询EF温度曲线数据
    String pointLongNames = "";
    if (hpTotalRunMode == "1") {
        for (int i = -50; i < 20; i++) {
            if (i < 0) {
                pointLongNames += "Sys\\ClimateCompensation\\Hot\\SetTemp_neg" +  Math.abs(i) + ",";
            } else {
                pointLongNames += "Sys\\ClimateCompensation\\Hot\\SetTemp_" + i + ",";
            }
        }
    } else {
        for (int i = 0; i < 41; i++) {
            pointLongNames += "Sys\\ClimateCompensation\\Hot\\SetTemp_" + i + ",";
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
            if (hpTotalRunMode == "1") {
                String key = "";
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
            } else {
                String key = "";
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
            }
        }
    }

    // MySQL同步EF温度曲线数据
    if (validCurve) {
        String curveEFJson = JSON.toJSONString(curveEFMap);

        String updateSql = "UPDATE sjmg_weather_compensate SET weather_compensate_curve = '" + curveEFJson + "' WHERE `id` = '" + customizeUuid + "'";;

        String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

        if (result.equals("success")) {
            // 操作日志
            paramMap.put("operationType", "同步");
            paramMap.put("operationContent", "气候补偿页面-同步EF温度曲线-同步温度曲线ID:" + customizeUuid + ",同步温度曲线数据:" + curveEFJson);

            // 执行业务编排
            Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
        } else {
            data.put("state", "fail");
            data.put("message", "MySQL同步EF温度曲线数据失败");
            return data;
        }
    }   
}

// --------------------- 页面展示曲线数据 --------------------- \\
Map<String, Object> resultMap = new HashMap<>();
resultMap.put("useAdvancedAdjustment", useAdvancedAdjustment);

List<Integer> xList = new ArrayList<>();
String selectWeatherCompensateSql;

if (hpTotalRunMode == "0") {
    for (int i = 0; i < 41; i++) {
        xList.add(i);
    }
    selectWeatherCompensateSql = "SELECT id,weather_compensate_code,weather_compensate_curve FROM sjmg_weather_compensate " + 
    "WHERE weather_compensate_mode = '制冷' AND weather_compensate_type = '自定义' ORDER BY FIELD(weather_compensate_code, '曲线1', '曲线2', '曲线3', '曲线4')";
} else {
    for (int i = -50; i < 20; i++) {
        xList.add(i);
    }
    selectWeatherCompensateSql = "SELECT id,weather_compensate_code,weather_compensate_curve FROM sjmg_weather_compensate " + 
    "WHERE weather_compensate_mode = '制热' AND weather_compensate_type = '自定义' ORDER BY FIELD(weather_compensate_code, '曲线1', '曲线2', '曲线3', '曲线4')";
}

resultMap.put("x", xList);

List<Map<String,Object>> selectWeatherCompensateList;
try {
    selectWeatherCompensateList = dynamicDataSource.excuteTenantSqlQuery(selectWeatherCompensateSql, dbCode);  
} catch (Exception e) {
    selectWeatherCompensateList = new ArrayList<>();
}

List<Map<String, Object>> list = new ArrayList<>();
if (hpTotalRunMode == "1") {
    for (Map<String,Object> selectWeatherCompensateMap : selectWeatherCompensateList) {
        String curveId = selectWeatherCompensateMap.get("id").toString();
        String curveCode = selectWeatherCompensateMap.get("weather_compensate_code").toString();

        if (curveId.equals(customizeUuid)) {
            resultMap.put("use", curveCode);
        }

        String weatherCompensateCurveJson = selectWeatherCompensateMap.get("weather_compensate_curve").toString();
        Map<String, String> curveMap = (Map<String, String>) JSON.parse(weatherCompensateCurveJson);
        
        List<Integer> curveList = new ArrayList<>();
        for (int i = -50; i < 20; i++) {
            int temperature = 20;
            String lastKey = "";

            for (String key : curveMap.keySet()) {
                if (i == Integer.parseInt(key)) {
                    try {
                        temperature = Integer.parseInt(curveMap.get(key).toString());
                    } catch (Exception e) {
                        temperature = 20;
                    }

                    lastKey = key;

                    break;
                }
            }

            curveList.add(temperature);

            if (!lastKey.equals("")) {
                curveMap.remove(lastKey);
            }
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", curveId);
        map.put("name", curveCode);
        map.put("curve", curveList);
        list.add(map);
    }
} else {
    for (Map<String,Object> selectWeatherCompensateMap : selectWeatherCompensateList) {
        String curveId = selectWeatherCompensateMap.get("id").toString();
        String curveCode = selectWeatherCompensateMap.get("weather_compensate_code").toString();

        if (curveId.equals(customizeUuid)) {
            resultMap.put("use", curveCode);
        }

        String weatherCompensateCurveJson = selectWeatherCompensateMap.get("weather_compensate_curve").toString();
        Map<String, String> curveMap = (Map<String, String>) JSON.parse(weatherCompensateCurveJson);
        
        List<Integer> curveList = new ArrayList<>();
        for (int i = 0; i < 41; i++) {
            int temperature = 0;
            String lastKey = "";

            for (String key : curveMap.keySet()) {
                if (i == Integer.parseInt(key)) {
                    try {
                        temperature = Integer.parseInt(curveMap.get(key).toString());
                    } catch (Exception e) {
                        temperature = 0;
                    }

                    lastKey = key;

                    break;
                }
            }

            curveList.add(temperature);

            if (!lastKey.equals("")) {
                curveMap.remove(lastKey);
            }
        }

        Map<String, Object> map = new HashMap<>();
        map.put("id", curveId);
        map.put("name", curveCode);
        map.put("curve", curveList);
        list.add(map);
    }
}

resultMap.put("curveData", list);

if (list.size() > 0 && !resultMap.containsKey("use")) {
    resultMap.put("use", selectWeatherCompensateList.get(0).get("weather_compensate_code").toString());
}

data.put("weather", resultMap);

return data;