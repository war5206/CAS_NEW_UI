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

// 室内温度
String indoorTemperature = data.get("indoorTemperature");
data.remove("indoorTemperature");

// 修改室内温度
String updateSql = "UPDATE sjmg_weather_configure SET indoor_temperature = '" + indoorTemperature + "'";
String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

if (result.equals("success")) {
    operationType = "修改";
    operationContent = "气候补偿页面-修改气候补偿-室内温度:" + indoorTemperature;

    // 执行业务编排
    paramMap.put("operationType", operationType);
    paramMap.put("operationContent", operationContent);
    Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);

    data.put("state", "success");
    data.put("message", "室内温度保存成功");
} else {
    data.put("state", "fail");
    data.put("message", "室内温度保存失败");
}

// 下置室内温度
AlgorithmProcessExecuteParam configureParam = new AlgorithmProcessExecuteParam();
configureParam.setAlgorithmProcessId("writeRealvalByLongNames");
Map<String, String> configureParamData = new HashMap();
Map<String, String> configureParamMap = new HashMap();
Map<String, String> dataMap = new HashMap<>();
dataMap.put("Sys\\FinforWorx\\MDSNWDSD", indoorTemperature);
configureParamMap.put("writeData", JSON.toJSONString(dataMap));
configureParamData.put("data", configureParamMap);
configureParam.setParam(configureParamData);

Map<String, String> configureSolResultMap = (Map<String, String>) sol.execute(configureParam);

if (!configureSolResultMap.get("state").equals("success")) {
    data.put("state", "fail");
    data.put("message", "室内温度下置数据异常");
    return data;
}

return data;