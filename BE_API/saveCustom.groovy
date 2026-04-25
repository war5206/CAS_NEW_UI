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

// 是否开启高级调节
String useAdvancedAdjustment = data.get("useAdvancedAdjustment");
data.remove("useAdvancedAdjustment");
// 当前选择自定义曲线
String use = data.get("use");
data.remove("use");
// 自定义曲线JSON
String curveDataJSON = data.get("curveData");
data.remove("curveData");

// 预设曲线ID
String gearPositionUuidMySQL;
// 当前曲线ID 
String useUuidMySQL;

// 查询气候补偿数据
String selectWeatherConfigureSql = "SELECT gear_position_uuid,use_uuid FROM sjmg_weather_configure";
try {
    List<Map<String,Object>> selectWeatherConfigureList = dynamicDataSource.excuteTenantSqlQuery(selectWeatherConfigureSql, dbCode);

    if (selectWeatherConfigureList.size() == 1) {
        gearPositionUuidMySQL = selectWeatherConfigureList.get(0).get("gear_position_uuid").toString();
        useUuidMySQL = selectWeatherConfigureList.get(0).get("use_uuid").toString();
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

// 选定自定义曲线ID
String useCustomizeCurveId = "";
List<Map<String, Object>> curveDataList = (List<Map<String, Object>>) JSON.parse(curveDataJSON);
if (hpTotalRunMode == "1") {
    for (Map<String, Object> curveDataMap : curveDataList) {
        String curveId = curveDataMap.get("id");
        String curveName = curveDataMap.get("name").toString();
        List<Integer> curveValueList = curveDataMap.get("curve");

        int index = 0;
        boolean invalid = true;
        Map<String, Integer> curveValueMap = new HashMap<>();
        for (int i = -50; i < 20; i++) {
            int value = curveValueList.get(index);
            
            if (value > 20) {
                invalid = false;
            }

            curveValueMap.put(String.valueOf(i), value);
            index++;
        }
        
        if (invalid) {
            data.put("state", "fail");
            data.put("message", curveName + "数据不合规，请重新设置。");
            return data;
        }

        String curveValueJson = JSON.toJSONString(curveValueMap);
        if (curveId == null || curveId == "") {
            curveId = creatId.nextId();
            // 新增气候补偿曲线
            String insertSql = "INSERT INTO sjmg_weather_compensate (id,weather_compensate_code,weather_compensate_name,weather_compensate_mode," + 
            "weather_compensate_type,weather_compensate_curve) VALUES ('" + curveId + "', '" + curveName + "', '自定义" + curveName + "', '制热', '自定义', " + 
            "'" + curveValueJson + "')";
            String result = dynamicDataSource.excuteTenantSql(insertSql, dbCode);
            operationType = "新增";
            operationContent = "气候补偿页面-新增气候补偿曲线-气候补偿曲线ID:" + curveId + ",气候补偿曲线编码:" + curveName + ",气候补偿曲线名称:自定义" + curveName + 
            ",气候补偿曲线模式:制热,气候补偿曲线类型:自定义,气候补偿曲线数据:" + curveValueJson;

            // 执行业务编排
            paramMap.put("operationType", operationType);
            paramMap.put("operationContent", operationContent);
            Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
        } else {
            // 修改气候补偿曲线
            String updateSql =  "UPDATE sjmg_weather_compensate SET weather_compensate_curve = '" + curveValueJson + "' WHERE `id` = '" + curveId + "'";
            String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

            operationType = "修改";
            operationContent = "气候补偿页面-修改气候补偿曲线-气候补偿曲线ID:" + curveId + ",气候补偿曲线数据:" + curveValueJson;

            // 执行业务编排
            paramMap.put("operationType", operationType);
            paramMap.put("operationContent", operationContent);
            Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
        }

        if (use.equals(curveName)) {
            useCustomizeCurveId = curveId;
        }
    }
} else {
    for (Map<String, Object> curveDataMap : curveDataList) {
        String curveId = curveDataMap.get("id");
        String curveName = curveDataMap.get("name").toString();
        List<Integer> curveValueList = curveDataMap.get("curve");

        int index = 0;
        boolean invalid = true;
        Map<String, Integer> curveValueMap = new HashMap<>();
        for (int i = 0; i < 41; i++) {
            int value = curveValueList.get(index);
            
            if (value > 0) {
                invalid = false;
            }

            curveValueMap.put(String.valueOf(i), value);
            index++;
        }
        
        if (invalid) {
            data.put("state", "fail");
            data.put("message", curveName + "数据不合规，请重新设置。");
            return data;
        }

        String curveValueJson = JSON.toJSONString(curveValueMap);
        if (curveId == null || curveId == "") {
            curveId = creatId.nextId();
            
            String insertSql = "INSERT INTO sjmg_weather_compensate (id,weather_compensate_code,weather_compensate_name,weather_compensate_mode," + 
            "weather_compensate_type,weather_compensate_curve) VALUES ('" + curveId + "', '" + curveName + "', '自定义" + curveName + "', '制冷', '自定义', " + 
            "'" + curveValueJson + "')";
            String result = dynamicDataSource.excuteTenantSql(insertSql, dbCode);
            operationType = "新增";
            operationContent = "气候补偿页面-新增气候补偿曲线-气候补偿曲线ID:" + curveId + ",气候补偿曲线编码:" + curveName + ",气候补偿曲线名称:自定义" + curveName + 
            ",气候补偿曲线模式:制冷,气候补偿曲线类型:自定义,气候补偿曲线数据:" + curveValueJson;

            // 执行业务编排
            paramMap.put("operationType", operationType);
            paramMap.put("operationContent", operationContent);
            Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
            
        } else {
            // 修改气候补偿曲线
            String updateSql =  "UPDATE sjmg_weather_compensate SET weather_compensate_curve = '" + curveValueJson + "' WHERE `id` = '" + curveId + "'";
            String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

            operationType = "修改";
            operationContent = "气候补偿页面-修改气候补偿曲线-气候补偿曲线ID:" + curveId + ",气候补偿曲线数据:" + curveValueJson;

            // 执行业务编排
            paramMap.put("operationType", operationType);
            paramMap.put("operationContent", operationContent);
            Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
        }

        if (use.equals(curveName)) {
            useCustomizeCurveId = curveId;
        }
    }
}


// 判定是否使用自定义曲线
String useUuid;
if (useAdvancedAdjustment.equals("1")) {
    // 使用自定义曲线
    useUuid = useCustomizeCurveId;
} else {
    // 使用预设曲线
    useUuid = gearPositionUuidMySQL;
}

// 修改气候补偿自定义曲线选定
String updateSql = "UPDATE sjmg_weather_configure SET customize_uuid = '" + useCustomizeCurveId + "',use_advanced_adjustment = '" + useAdvancedAdjustment + "'," + 
"use_uuid = '" + useUuid + "'";
String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

if (result.equals("success")) {
    // 执行业务编排
    paramMap.put("operationType", "修改");
    paramMap.put("operationContent", "气候补偿页面-修改气候补偿-自定义曲线ID:" + useCustomizeCurveId + ",使用高级调节:" + useAdvancedAdjustment);
    Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);

    data.put("state", "success");
    data.put("message", "设置自定义曲线成功");
} else {
    data.put("state", "fail");
    data.put("message", "设置自定义曲线失败");
    return data;
}

// 下置气候补偿
if (!useUuid.equals(useUuidMySQL)) {
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
        return data;
    }
}

return data;