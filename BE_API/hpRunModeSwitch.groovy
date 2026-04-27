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
param.setAlgorithmProcessId("writeRealvalByLongNames");
Map<String, String> paramData = new HashMap();
Map<String, String> paramMap = new HashMap();
paramData.put("data", paramMap);
param.setParam(paramData);

// 冷热模式
String runMode = data.get("runMode");
data.remove("runMode");

// 查询热泵信息
String selectHeatPumpSql = "SELECT device_uuid,arrange_code FROM sjmg_pump_arrange ORDER BY arrange_code";
List<Map<String,Object>> selectHeatPumpList;
try {
    selectHeatPumpList = dynamicDataSource.excuteTenantSqlQuery(selectHeatPumpSql, dbCode);
} catch (Exception e) {
    selectHeatPumpList = new ArrayList<>();
}

for (Map<String,Object> selectHeatPumpMap : selectHeatPumpList) {
    String heatPumpCode = selectHeatPumpMap.get("device_uuid");

    // 查询热泵运行状态
    String pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a " + 
    "WHERE a.taglongname IN ('HeatPump\\SJMG\\" + heatPumpCode + "\\RunState2_10')";
    DataTable dt = dataService.queryListDataBySql(pointSql);
    if(dt.getRows().size() == 1){
        for(int c = 0; c < dt.getColumns().size(); c++){
            if(dt.getColumns().get(c).getColumnName() == "realval"){
                if (dt.getValue(0,c).equals("1")) {
                    data.put("state", "fail");
                    data.put("message", "热泵" + selectHeatPumpMap.get("arrange_code") + "运行，禁止切换模式");
                    return data;
                } 
            }
        }
    }
}

// // 查询环境温度
// String pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a " + 
// "WHERE a.taglongname IN ('Sys\\FinforWorx\\AmbientTemperature1')";
// DataTable dt = dataService.queryListDataBySql(pointSql);

// BigDecimal ambientTemperature;
// if(dt.getRows().size() == 1){
//     for(int c = 0; c < dt.getColumns().size(); c++){
//         if(dt.getColumns().get(c).getColumnName() == "realval"){
//             ambientTemperature = new BigDecimal(dt.getValue(0,c).toString());
//         }
//     }
// } else {
//     data.put("state", "fail");
//     data.put("message", "环境温度异常");
//     return data;
// }

// if (ambientTemperature == null) {
//     data.put("state", "fail");
//     data.put("message", "环境温度异常");
//     return data;
// } else {
//     if (runMode.equals("0")) {
//         // 制冷模式
//         if (ambientTemperature.compareTo(new BigDecimal("20")) < 0) {
//             data.put("state", "fail");
//             data.put("message", "环境温度小于20℃，不能进行制冷");
//             return data;
//         }
//     } else if (runMode.equals("1")) {
//         // 制热模式
//         if (ambientTemperature.compareTo(new BigDecimal("25")) > 0) {
//             data.put("state", "fail");
//             data.put("message", "环境温度大于25℃，不能进行制热");
//             return data;
//         }
//     } else {
//         data.put("state", "fail");
//         data.put("message", "模式选择异常");
//         return data;
//     }
// }

// 切换模式，关闭高级调节,高级曲线设置为空
String closeAdvancedSql = "UPDATE sjmg_weather_configure SET use_advanced_adjustment = 0, customize_uuid = NULL";
String result = dynamicDataSource.excuteTenantSql(closeAdvancedSql, dbCode);

// 查询项目数据
String selectProjectDataSql = "SELECT * FROM sjmg_project_data";
List<Map<String,Object>> selectProjectDataList;
try {
    selectProjectDataList = dynamicDataSource.excuteTenantSqlQuery(selectProjectDataSql, dbCode);
} catch (Exception e) {
    selectProjectDataList = new ArrayList();
}

String projectAreaId;
if (selectProjectDataList.size() == 1) {
    projectAreaId = selectProjectDataList.get(0).get("project_area_uuid");
}

// // 操作类型 
// String operationType;
// // 操作内容
// String operationContent;

// if (selectProjectDataList.size() == 1) {
//     String updateSql = "UPDATE sjmg_project_data SET project_area_uuid = '" + projectAreaId + "'";
//     String updateResult = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

//     if (updateResult.equals("success")) {
//         operationType = "修改";
//         operationContent = "区域选择页面-修改区域信息-项目区域ID:" + projectAreaId; 

//         data.put("state", "success");
//         data.put("message", "保存成功");
//     } else {
//         data.put("state", "fail");
//         data.put("message", "保存失败");

//         return data;
//     }
// } else {
//     // 删除
//     String deleteSql = "DELETE FROM sjmg_project_data"
//     String deleteResult = dynamicDataSource.excuteTenantSql(deleteSql, dbCode);

//     if (deleteResult.equals("success")) {
//         operationType = "删除";
//         operationContent = "区域选择页面-初始化项目信息-清空全部项目信息数据";

//         // 执行业务编排
//         paramMap.put("operationType", operationType);
//         paramMap.put("operationContent", operationContent);
//         Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
        
//         String id = creatId.nextId();

//         String insertSql = "INSERT INTO sjmg_project_data (id,project_area_uuid) VALUES ('" + id + "','" + projectAreaId + "')"
//         String insertResult = dynamicDataSource.excuteTenantSql(insertSql, dbCode);

//         if (insertResult.equals("success")) {
//             operationType = "新增";
//             operationContent = "区域选择页面-初始化区域信息-项目ID:" + id + ",项目区域ID:" + projectAreaId;

//             data.put("state", "success");
//             data.put("message", "保存成功");
//         } else {
//             data.put("state", "fail");
//             data.put("message", "保存失败");

//             return data;
//         }
//     } else {
//         data.put("state", "fail");
//         data.put("message", "删除失败");

//         return data;
//     }
// }
// 
// // 执行业务编排
// paramMap.put("operationType", operationType);
// paramMap.put("operationContent", operationContent);
// Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);


// data.put("hprunmode", runMode);

def resolveWeatherCompensateForMode = { String weatherCompensateId, String weatherMode ->
    Map<String, Object> resultMap = new HashMap<>();

    if (weatherCompensateId == null || weatherCompensateId.trim().equals("")) {
        resultMap.put("state", "fail");
        return resultMap;
    }

    String selectByIdSql = "SELECT id,weather_compensate_code,weather_compensate_mode FROM sjmg_weather_compensate WHERE id = '" + weatherCompensateId + "'";
    List<Map<String,Object>> selectByIdList = dynamicDataSource.excuteTenantSqlQuery(selectByIdSql, dbCode);
    if (selectByIdList.size() != 1) {
        resultMap.put("state", "fail");
        return resultMap;
    }

    Map<String,Object> curveMap = selectByIdList.get(0);
    String curveCode = curveMap.get("weather_compensate_code").toString();
    String curveMode = curveMap.get("weather_compensate_mode").toString();
    String resolvedId = curveMap.get("id").toString();
    boolean corrected = false;

    if (!weatherMode.equals(curveMode)) {
        String selectByCodeSql = "SELECT id,weather_compensate_code,weather_compensate_mode FROM sjmg_weather_compensate " +
        "WHERE weather_compensate_code = '" + curveCode + "' AND weather_compensate_mode = '" + weatherMode + "'";
        List<Map<String,Object>> selectByCodeList = dynamicDataSource.excuteTenantSqlQuery(selectByCodeSql, dbCode);
        if (selectByCodeList.size() != 1) {
            resultMap.put("state", "fail");
            resultMap.put("code", curveCode);
            return resultMap;
        }

        Map<String,Object> resolvedCurveMap = selectByCodeList.get(0);
        resolvedId = resolvedCurveMap.get("id").toString();
        curveCode = resolvedCurveMap.get("weather_compensate_code").toString();
        corrected = true;
    }

    resultMap.put("state", "success");
    resultMap.put("id", resolvedId);
    resultMap.put("code", curveCode);
    resultMap.put("corrected", corrected);
    return resultMap;
}

if (runMode == "1") { // 模式切换为制热
    String selectProjectAreaSql = "SELECT weather_compensate_uuid FROM sjmg_project_area WHERE id = '" + projectAreaId + "'";
    try {
        List<Map<String,Object>> selectList = dynamicDataSource.excuteTenantSqlQuery(selectProjectAreaSql, dbCode);
        if (selectList.size() == 1) {
            String weatherCompensateId = selectList.get(0).get("weather_compensate_uuid");
            Map<String,Object> resolvedWeatherCompensateMap = resolveWeatherCompensateForMode(weatherCompensateId, "制热");
            if (!resolvedWeatherCompensateMap.get("state").equals("success")) {
                data.put("state", "fail");
                data.put("message", "气候补偿曲线数据异常");
                return data;
            }

            weatherCompensateId = resolvedWeatherCompensateMap.get("id").toString();
            String weatherCompensateCode = resolvedWeatherCompensateMap.get("code").toString();
            if (resolvedWeatherCompensateMap.get("corrected") == true) {
                String correctProjectAreaSql = "UPDATE sjmg_project_area SET weather_compensate_uuid = '" + weatherCompensateId + "' WHERE id = '" + projectAreaId + "'";
                dynamicDataSource.excuteTenantSql(correctProjectAreaSql, dbCode);
            }

            // 修改
            String updateSql = "UPDATE sjmg_weather_configure SET gear_position_uuid = '" + weatherCompensateId + "',use_uuid = '" + weatherCompensateId + "'";
            String updateResult = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

            if (updateResult.equals("success")) {
                // 下置气候补偿
                if (weatherCompensateId != null && weatherCompensateId != "") {
                    AlgorithmProcessExecuteParam param1 = new AlgorithmProcessExecuteParam();
                    param1.setAlgorithmProcessId("writeWeatherCompensateCurve");
                    Map<String, String> paramData1 = new HashMap();
                    Map<String, String> paramMap1 = new HashMap();
                    paramMap1.put("runMode", runMode);
                    paramMap1.put("curveId", weatherCompensateId);
                    paramData1.put("data", paramMap1);
                    param1.setParam(paramData1);
                    
                    Map<String, String> solResultMap1 = (Map<String, String>) sol.execute(param1);
                } else {
                    data.put("state", "fail");
                    data.put("message", "区域数据异常");
                    return data;
                }

                // 下置气候补偿 智能调节 自动校准调节 档位
                AlgorithmProcessExecuteParam configureParam = new AlgorithmProcessExecuteParam();
                configureParam.setAlgorithmProcessId("writeRealvalByLongNames");
                Map<String, String> configureParamData = new HashMap();
                Map<String, String> configureParamMap = new HashMap();
                Map<String, String> dataMap = new HashMap<>();
                dataMap.put("Sys\\FinforWorx\\WDBCTJMS", "0");
                dataMap.put("Sys\\FinforWorx\\WDBCZNTJ", "0");
                dataMap.put("Sys\\FinforWorx\\WDBCDWXZ", weatherCompensateCode);
                configureParamMap.put("writeData", JSON.toJSONString(dataMap));
                configureParamData.put("data", configureParamMap);
                configureParam.setParam(configureParamData);
                
                Map<String, String> configureSolResultMap = (Map<String, String>) sol.execute(configureParam);

                if (!configureSolResultMap.get("state").equals("success")) {
                    data.put("state", "fail");
                    data.put("message", "气候补偿参数下置数据异常");
                    return data;
                }
                
            } else {
                data.put("state", "fail");
                data.put("message", "保存失败");
                return data;
            }
        } else {
            data.put("state", "fail");
            data.put("message", "区域数据异常");
            return data;
        }
    } catch (Exception e) {
        data.put("state", "fail");
        data.put("message", "区域数据异常");
        return data;
    }
} else { // 模式切换为制冷
    String selectProjectAreaSql = "SELECT weather_compensate_cooling_uuid FROM sjmg_project_area WHERE id = '" + projectAreaId + "'";
    try {
        List<Map<String,Object>> selectList = dynamicDataSource.excuteTenantSqlQuery(selectProjectAreaSql, dbCode);
        if (selectList.size() == 1) {
            String weatherCompensateId = selectList.get(0).get("weather_compensate_cooling_uuid");
            // weatherCompensateCode = String.valueOf(Integer.parseInt(selecWeatherCompensatetList.get(0).get("weather_compensate_code").toString()) - 16);
            Map<String,Object> resolvedWeatherCompensateMap = resolveWeatherCompensateForMode(weatherCompensateId, "制冷");
            if (!resolvedWeatherCompensateMap.get("state").equals("success")) {
                data.put("state", "fail");
                data.put("message", "气候补偿曲线数据异常");
                return data;
            }

            weatherCompensateId = resolvedWeatherCompensateMap.get("id").toString();
            String weatherCompensateCode = resolvedWeatherCompensateMap.get("code").toString();
            if (resolvedWeatherCompensateMap.get("corrected") == true) {
                String correctProjectAreaSql = "UPDATE sjmg_project_area SET weather_compensate_cooling_uuid = '" + weatherCompensateId + "' WHERE id = '" + projectAreaId + "'";
                dynamicDataSource.excuteTenantSql(correctProjectAreaSql, dbCode);
            }

            // 修改
            String updateSql = "UPDATE sjmg_weather_configure SET gear_position_uuid = '" + weatherCompensateId + "',use_uuid = '" + weatherCompensateId + "'";
            String updateResult = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

            if (updateResult.equals("success")) {
                // 下置气候补偿
                if (weatherCompensateId != null && weatherCompensateId != "") {
                    AlgorithmProcessExecuteParam param1 = new AlgorithmProcessExecuteParam();
                    param1.setAlgorithmProcessId("writeWeatherCompensateCurve");
                    Map<String, String> paramData1 = new HashMap();
                    Map<String, String> paramMap1 = new HashMap();
                    paramMap1.put("runMode", runMode);
                    paramMap1.put("curveId", weatherCompensateId);
                    data.put("curveId", weatherCompensateId);
                    paramData1.put("data", paramMap1);
                    param1.setParam(paramData1);
                    
                    Map<String, String> solResultMap1 = (Map<String, String>) sol.execute(param1);
                } else {
                    data.put("state", "fail");
                    data.put("message", "区域数据异常");
                    return data;
                }

                // 下置气候补偿 智能调节 自动校准调节 档位
                AlgorithmProcessExecuteParam configureParam = new AlgorithmProcessExecuteParam();
                configureParam.setAlgorithmProcessId("writeRealvalByLongNames");
                Map<String, String> configureParamData = new HashMap();
                Map<String, String> configureParamMap = new HashMap();
                Map<String, String> dataMap = new HashMap<>();
                dataMap.put("Sys\\FinforWorx\\WDBCTJMS", "0");
                dataMap.put("Sys\\FinforWorx\\WDBCZNTJ", "0");
                dataMap.put("Sys\\FinforWorx\\WDBCDWXZ", weatherCompensateCode);
                configureParamMap.put("writeData", JSON.toJSONString(dataMap));
                configureParamData.put("data", configureParamMap);
                configureParam.setParam(configureParamData);
                
                Map<String, String> configureSolResultMap = (Map<String, String>) sol.execute(configureParam);

                if (!configureSolResultMap.get("state").equals("success")) {
                    data.put("state", "fail");
                    data.put("message", "气候补偿参数下置数据异常");
                    return data;
                }
                
            } else {
                data.put("state", "fail");
                data.put("message", "保存失败");
                return data;
            }
        } else {
            data.put("state", "fail");
            data.put("message", "区域数据异常");
            return data;
        }
    } catch (Exception e) {
        data.put("state", "fail");
        data.put("message", "区域数据异常");
        return data;
    }
}

// 下置数据
Map<String, String> dataMap = new HashMap<>();
dataMap.put("Sys\\FinforWorx\\HPTotalRunMode", runMode);
paramMap.put("writeData", JSON.toJSONString(dataMap));

// 调用逻辑编排
Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
if (!solResultMap.get("state").equals("success")) {
    data.put("state", "fail");
    data.put("message", "切换模式失败");
    return data;
}

data.put("state", "success");
return data;
