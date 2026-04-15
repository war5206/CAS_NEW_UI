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

// 结构
String structure = "HeatPump\\";
// 品牌
String brand = "SJMG\\";
// 设备编码
String code = "No";

// 信息项集合
Map<String, String> dataMap = new HashMap<>();
dataMap.put("进水温度", "\\InTemp");
dataMap.put("出水温度", "\\OutTemp");
dataMap.put("环境温度", "\\AmbTemp");
dataMap.put("压缩机1电流(A)", "\\CompreCur1");
dataMap.put("压缩机2电流(A)", "\\CompreCur2");
dataMap.put("防冻状态", "\\RunState1_1");
dataMap.put("模式状态", "\\ModeSet");
dataMap.put("化霜状态", "\\RunState1_8");
dataMap.put("故障状态", "\\RunState1_3");
dataMap.put("主板开机信号状态", "\\RunState2_10");
dataMap.put("累积运行时长(H)", "\\RunTimeHour1");
dataMap.put("持续运行时长(H)", "\\RunTimeHour2");

// 查询热泵
String selectHeatPumpSql = "SELECT heat_pump FROM sjmg_project_data";
int heatPumpNumber
try {
    List<Map<String,Object>> selectHeatPumpList = dynamicDataSource.excuteTenantSqlQuery(selectHeatPumpSql, dbCode);
    if (selectHeatPumpList != null && selectHeatPumpList.size() > 0 && selectHeatPumpList.get(0).get("heat_pump") != null) {
        heatPumpNumber = Integer.parseInt(selectHeatPumpList.get(0).get("heat_pump").toString());
    } else {
        heatPumpNumber = 0;
    }
} catch (Exception e) {
    heatPumpNumber = 0;
}

// 分页参数（每页固定10条）
int pageSize = 10
int pageNum = Integer.parseInt(data.get("pageNum").toString())

int total = heatPumpNumber
int totalPages = (int) Math.ceil(total / (double) pageSize)
if (totalPages == 0) {
    totalPages = 1
}
if (pageNum > totalPages) {
    pageNum = totalPages
}

int startIndex = (pageNum - 1) * pageSize
int endIndex = Math.min(startIndex + pageSize, total)

List<Map<String, String>> heatPumpDataList = new ArrayList<>();
for (int i = startIndex; i < endIndex; i++) {
    Map<String, String> heatPumpDataMap = new HashMap<>();

    // 同时返回中文和英文热泵标识，便于前端稳定识别
    heatPumpDataMap.put("热泵序号", "热泵" + (i + 1));
    heatPumpDataMap.put("heatPumpNo", "热泵" + (i + 1));
    heatPumpDataMap.put("heatPumpIndex", String.valueOf(i + 1));
    heatPumpDataMap.put("heatPumpCode", code + (i + 1));

    for (String key : dataMap.keySet()) {
        String longName = structure + brand + code + (i + 1) + dataMap.get(key);

        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (key.equals("模式状态")) {
                        if ("1".equals(dt.getValue(0,c))) {
                            heatPumpDataMap.put(key, "制热");
                        } else {
                            heatPumpDataMap.put(key, "制冷");
                        }
                    } else if (key.contains("状态")) {
                        if ("1".equals(dt.getValue(0,c))) {
                            heatPumpDataMap.put(key, "开");
                        } else {
                            heatPumpDataMap.put(key, "关");
                        }
                    } else {
                        heatPumpDataMap.put(key, dt.getValue(0,c));
                    }
                }
            }
        } else {
            heatPumpDataMap.put(key, "0");
        }
    }

    heatPumpDataList.add(heatPumpDataMap);
}

data.put("list", heatPumpDataList);
data.put("pageNum", pageNum);
data.put("pageSize", pageSize);
data.put("total", total);
data.put("totalPages", totalPages);

return data;