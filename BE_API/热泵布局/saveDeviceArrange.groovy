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

// 查询系统是否初始化
String initState;
String selectInitSql = "SELECT sys_config_code,sys_config_value,sys_config_isno FROM pt_sys_config WHERE sys_config_code = 'PT_INIT_STATE'";
try {
    List<Map<String,Object>> selectInitList = dynamicDataSource.excuteTenantSqlQuery(selectInitSql, "base");
    if (selectInitList.size() == 1) {
        initState = selectInitList.get(0).get("sys_config_value").toString();
    } else {
        initState = "0";
    }
} catch (Exception e) {
    initState = "0";
}

// 机组排布数据
String deviceArrangeJson = data.get("deviceArrange");
data.remove("deviceArrange");
List<Map<String, String>> deviceArrangeList = (List<Map<String, String>>) JSON.parse(deviceArrangeJson);

if (initState.equals("0")) {
    // 删除
    String deleteSql = "DELETE FROM sjmg_pump_arrange"
    String deleteResult = dynamicDataSource.excuteTenantSql(deleteSql, dbCode);

    operationType = "删除";
    operationContent = "机组排布页面-初始化机组排布-清空全部机组排布数据";

    // 执行业务编排
    paramMap.put("operationType", operationType);
    paramMap.put("operationContent", operationContent);
    Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);
}

Map<String, String> writeData = new HashMap<>();
for (Map<String, String> deviceArrangeMap : deviceArrangeList) {
    // 排布ID
    String id = deviceArrangeMap.get("id");
    // 项目ID
    String projectId = deviceArrangeMap.get("projectId");
    // 行序号
    String rowNumber = deviceArrangeMap.get("rowNumber");
    // 列序号
    String columnNumber = deviceArrangeMap.get("columnNumber");
    // 设备ID
    String deviceId = deviceArrangeMap.get("deviceId");
    // 布局编号
    String arrangeCode = deviceArrangeMap.get("arrangeCode");
    // 布局状态
    String arrangeState = deviceArrangeMap.get("arrangeState");
    // 编号状态
    String codeState = deviceArrangeMap.get("codeState");

    // 查询布局是否存在
    String arrangeExist;
    String selectArrangeSql = "SELECT * FROM sjmg_pump_arrange WHERE device_uuid = '" + deviceId + "'";
    try {
        List<Map<String,Object>> selecArrangeList = dynamicDataSource.excuteTenantSqlQuery(selectArrangeSql, dbCode);
        if (selecArrangeList.size() == 1) {
            arrangeExist = "1";
        } else {
            arrangeExist = "0";
        }
    } catch (Exception e) {
        arrangeExist = "0";
    }
    
    if (arrangeExist.equals("0")) {
        // 新增
        String insertSql = "INSERT INTO sjmg_pump_arrange (id,project_uuid,`row_number`,`column_number`,device_uuid,arrange_code,arrange_state,code_state) " + 
        "VALUES ('" + id + "','" + projectId + "','" + rowNumber + "','" + columnNumber + "','" + deviceId + "','" + arrangeCode + "'," + 
        "'" + arrangeState + "','" + codeState +"')";
        String result = dynamicDataSource.excuteTenantSql(insertSql, dbCode);

        if (result.equals("success")) {
            data.put("state", "success");
            data.put("message", "保存成功");
        } else {
            data.put("state", "fail");
            data.put("message", "保存失败");
        }
        
        operationType = "新增";
        operationContent = "机组排布页面-初始化机组排布-排布ID:" + id + ",项目ID:" + projectId + ",行序号:" + rowNumber + ",列序号:" + columnNumber + 
        ",设备ID:" + deviceId + ",编号:" + arrangeCode + ",布局状态:" + arrangeState + ",编号状态:" + codeState;
    } else {
        // 修改
        String updateSql = "UPDATE sjmg_pump_arrange SET `row_number` = '" + rowNumber + "',`column_number` = '" + columnNumber + "',arrange_code = '" + arrangeCode + 
        "', arrange_state = '" + arrangeState + "', code_state = '" + codeState +"' WHERE device_uuid = '" + deviceId + "'";
        String result = dynamicDataSource.excuteTenantSql(updateSql, dbCode);

        if (result.equals("success")) {
            data.put("state", "success");
            data.put("message", "保存成功");
        } else {
            data.put("state", "fail");
            data.put("message", "保存失败");
        }
        
        operationType = "修改";
        operationContent = "机组排布页面-修改机组排布-排布ID:" + id + ",项目ID:" + projectId + ",行序号:" + rowNumber + ",列序号:" + columnNumber + 
        ",设备ID:" + deviceId + ",编号:" + arrangeCode + ",布局状态:" + arrangeState + ",编号状态:" + codeState;
    }

    // 执行业务编排
    paramMap.put("operationType", operationType);
    paramMap.put("operationContent", operationContent);
    Map<String, String> solResultMap = (Map<String, String>) sol.execute(param);

    // 横坐标
    writeData.put("HeatPump\\SJMG\\" + deviceId + "\\HPX", columnNumber);
    // 纵坐标
    writeData.put("HeatPump\\SJMG\\" + deviceId + "\\HPY", rowNumber);
}

if (writeData.keySet().size() > 0) {
    String writeDataJson = JSON.toJSONString(writeData);

    AlgorithmProcessExecuteParam param1 = new AlgorithmProcessExecuteParam();
    param1.setAlgorithmProcessId("writeRealvalByLongNames");
    Map<String, String> paramData1 = new HashMap();
    Map<String, String> paramMap1 = new HashMap();
    paramMap1.put("writeData", writeDataJson);
    paramData1.put("data", paramMap1);
    param1.setParam(paramData1);

    Map<String, String> solResultMap1 = (Map<String, String>) sol.execute(param1);
}

return data;