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

// 曲线ID
String curveId = data.get("curveId");
data.remove("curveId");
// 曲线点位
String curvePoint = data.get("curvePoint");
data.remove("curvePoint");
// 曲线数值
int curveValue = Integer.parseInt(data.get("curveValue"));
data.remove("curveValue");

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

// 查询气候补偿曲线数据
String selectCurveSql = "SELECT weather_compensate_curve FROM sjmg_weather_compensate WHERE id = '" + curveId + "'"
List<Map<String,Object>> selectCurveList = dynamicDataSource.excuteTenantSqlQuery(selectCurveSql, dbCode);

if (selectCurveList.size() == 1) {
    String curveValueJson = selectCurveList.get(0).get("weather_compensate_curve").toString();

    Map<String, String> curveValueMap = (Map<String, Integer>) JSON.parse(curveValueJson);
    for (String key : curveValueMap.keySet()) {
        if (curvePoint.equals(key)) {
            curveValueMap.put(curvePoint, String.valueOf(curveValue));
            break;
        }
    }
    curveValueJson = JSON.toJSONString(curveValueMap);

    // 修改气候补偿曲线
    String updateSql = "UPDATE sjmg_weather_compensate SET weather_compensate_curve = '" + curveValueJson + "' WHERE `id` = '" + curveId + "'";
    String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);
    
    if (result.equals("success")) {
        operationType = "修改";
        operationContent = "气候补偿页面-修改气候补偿曲线-气候补偿曲线ID:" + curveId + ",气候补偿曲线数据:" + curveValueJson;

        // 执行业务编排
        paramMap.put("operationType", operationType);
        paramMap.put("operationContent", operationContent);
        Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);

        // 下置数据
        Map<String, String> dataMap = new HashMap<>();

        String longName;
        int point = Integer.parseInt(curvePoint);
        if (hpTotalRunMode == "1") {
            if (point < 0) {
                longName = "Sys\\ClimateCompensation\\Hot\\SetTemp_neg" + Math.abs(point);
            } else {
                longName = "Sys\\ClimateCompensation\\Hot\\SetTemp_" + point;
            }
        } else {
            longName = "Sys\\ClimateCompensation\\Cold\\SetTemp_" + point;
        }
        

        dataMap.put(longName, curveValue + "");

        AlgorithmProcessExecuteParam writeParam = new AlgorithmProcessExecuteParam();
        writeParam.setAlgorithmProcessId("writeRealvalByLongNames");
        Map<String, String> writeParamData = new HashMap();
        Map<String, String> writeParamMap = new HashMap();
        writeParamMap.put("writeData", JSON.toJSONString(dataMap));
        writeParamData.put("data", writeParamMap);
        writeParam.setParam(writeParamData);
        
        Map<String, String> writeSolResultMap = (Map<String, String>) sol.execute(writeParam);

        if (!writeSolResultMap.get("state").equals("success")) {
            data.put("state", "fail");
            data.put("message", "气候补偿下置数据异常");
            return data;
        }
    } else {
        data.put("state", "fail");
        data.put("message", "修改气候补偿曲线数据失败");
        return data;
    }
} else {
    data.put("state", "fail");
    data.put("message", "气候补偿曲线异常");
    return data;
}

return data;