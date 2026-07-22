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
param.setAlgorithmProcessId("writeRealvalByLongNames");
Map<String, String> paramData = new HashMap();
Map<String, String> paramMap = new HashMap();
paramData.put("data", paramMap);
param.setParam(paramData);

// 气候补偿曲线ID
String curveId = data.get("curveId");
data.remove("curveId");

String hpTotalRunMode = data.get("runMode");
data.remove("runMode");

// String pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\HPTotalRunMode')";
// dt = dataService.queryListDataBySql(pointSql);
// String hpTotalRunMode = "";
// if(dt.getRows().size() == 1){
//     for(int c = 0; c < dt.getColumns().size(); c++){
//         if(dt.getColumns().get(c).getColumnName() == "realval"){
//             try {
//                 hpTotalRunMode = dt.getValue(0,c).toString();
//             } catch (Exception e) {
//                 hpTotalRunMode = "1";
//             }
//         }
//     }
// }

// 查询气候补偿曲线数据
String selectWeatherCompensateSql = "SELECT weather_compensate_curve FROM sjmg_weather_compensate WHERE id = '" + curveId + "'";
List<Map<String,Object>> selectWeatherCompensateList = dynamicDataSource.excuteTenantSqlQuery(selectWeatherCompensateSql, dbCode);

Map<String, String> weatherCompensateCurveMap;
if (selectWeatherCompensateList.size() > 0) {
    String weatherCompensateCurveJson = selectWeatherCompensateList.get(0).get("weather_compensate_curve").toString();
    weatherCompensateCurveMap = JSON.parseObject(weatherCompensateCurveJson, Map.class);
} else {
    weatherCompensateCurveMap = new HashMap<>();
}

Map<String, String> dataMap = new HashMap<>();
if (hpTotalRunMode == "1") {
    for (String key : weatherCompensateCurveMap.keySet()) {
        int point = Integer.parseInt(key);

        String longName;
        String hotLongName;

        if (point < 0) {
            longName = "Sys\\ClimateCompensation\\Hot\\SetTemp_neg" + Math.abs(point);
            hotLongName = "Sys\\ClimateCompensation\\Hot\\Hot_neg" + Math.abs(point);
        } else {
            longName = "Sys\\ClimateCompensation\\Hot\\SetTemp_" + point;
            hotLongName = "Sys\\ClimateCompensation\\Hot\\Hot_" + point;
        }

        dataMap.put(longName, weatherCompensateCurveMap.get(key) + "");
        dataMap.put(hotLongName, point + "");
    }
} else {
    for (String key : weatherCompensateCurveMap.keySet()) {
        int point = Integer.parseInt(key);

        String longName;
        String hotLongName;

        
        longName = "Sys\\ClimateCompensation\\Cold\\SetTemp_" + point;
        hotLongName = "Sys\\ClimateCompensation\\Cold\\Cold_" + point;
        

        dataMap.put(longName, weatherCompensateCurveMap.get(key) + "");
        dataMap.put(hotLongName, point + "");
    }
}


// 调用逻辑编排
paramMap.put("writeData", JSON.toJSONString(dataMap));
Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);

data.put("solResultMap", solResultMap);
data.put("state", solResultMap.get("state"));

return data;