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
// 说明：查询接口只读取数据用于展示，不再执行 EF -> MySQL 归档同步。
// 归档同步统一收口到 saveCustomizeCurve / saveWeatherCompensateGear 等写操作接口，
// 避免查询时把 EF 中可能属于其他档位/自定义曲线的数据误写进当前自定义曲线备份记录。

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