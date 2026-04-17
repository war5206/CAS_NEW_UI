/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page
 */

import com.sunwayland.algorithm.feign.FeignSolAlgorithmProcess;
import com.sunwayland.algorithm.pojo.AlgorithmProcessExecuteParam
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.dynamic.DynamicDataSource;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);

// 登录用户信息
PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser.dbCode;
if (dbCode.equals("base")) {
    dbCode = "t01"
}

// 查询条件
String startTime = data.get("startTime");
data.remove("startTime");
if (startTime == null || startTime.equals("")) {
    data.put("deleteCount", 0);
    data.put("state", "fail");
    data.put("message", "开始时间不能为空");
    return data;
}
startTime = startTime.toString().replaceAll("-", "/");

String endTime = data.get("endTime");
data.remove("endTime");
if (endTime == null || endTime.equals("")) {
    data.put("deleteCount", 0);
    data.put("state", "fail");
    data.put("message", "结束时间不能为空");
    return data;
}
endTime = endTime.toString().replaceAll("-", "/");

String name = data.get("name");
data.remove("name");

String grade = data.get("grade");
data.remove("grade");

int current = 1;
if (data.get("current") != null && !data.get("current").equals("")) {
    current = Integer.parseInt(data.get("current").toString());
}
data.remove("current");

int limit = 6;
int endNumber = current * limit;
int startNumber = endNumber - limit;

String alarmWhereSql = " FROM sjmg_alarm WHERE `点描述` NOT LIKE '%预留%' AND " +
        "(`报警状态` = '恢复' OR handle_status = '处理') AND handle_status != '删除' AND `开始时间` BETWEEN '" + startTime + "' AND '" + endTime + "'";

if (name != null && !name.equals("")) {
    alarmWhereSql += " AND `报警组` = '" + name + "'";
} else {
    alarmWhereSql += " AND (`报警组` = '1' OR `报警组` = '2' OR `报警组` = '3')";
}

if (grade != null && !grade.equals("")) {
    alarmWhereSql += " AND `优先级` = '" + grade + "'";
}

String pageIdSql = "SELECT `报警序号` AS alarmid" + alarmWhereSql + " ORDER BY `开始时间` DESC LIMIT " + startNumber + "," + limit;
List<Map<String, Object>> pageAlarmList;
try {
    pageAlarmList = dynamicDataSource.excuteTenantSqlQuery(pageIdSql, dbCode);
} catch (Exception e) {
    pageAlarmList = new ArrayList<>();
}

if (pageAlarmList.isEmpty()) {
    data.put("deleteCount", 0);
    data.put("state", "null");
    data.put("message", "当前页无可删除历史告警");
    return data;
}

List<String> idList = new ArrayList<>();
for (Map<String, Object> row : pageAlarmList) {
    if (row.get("alarmid") != null) {
        idList.add(row.get("alarmid").toString());
    }
}

if (idList.isEmpty()) {
    data.put("deleteCount", 0);
    data.put("state", "null");
    data.put("message", "当前页无可删除历史告警");
    return data;
}

String idInSql = idList.collect { "'" + it + "'" }.join(",");
String updateSql = "UPDATE sjmg_alarm SET handle_status = '删除' WHERE `报警序号` IN (" + idInSql + ")";
dynamicDataSource.excuteTenantSql(updateSql, dbCode);

// 调用逻辑编排记录操作日志
FeignSolAlgorithmProcess sol = ApplicationContextProvider.getBean(FeignSolAlgorithmProcess.class);
AlgorithmProcessExecuteParam param = new AlgorithmProcessExecuteParam();
param.setAlgorithmProcessId("writeOperationLog");
Map<String, String> paramData = new HashMap();
Map<String, String> paramMap = new HashMap();
paramData.put("data", paramMap);
param.setParam(paramData);

String operationType = "修改";
String operationContent = "系统报警页面-删除历史报警-当前页批量删除,页码:" + current + ",条数:" + idList.size();
paramMap.put("operationType", operationType);
paramMap.put("operationContent", operationContent);
sol.execute(param);

data.put("deleteCount", idList.size());
data.put("state", "success");
data.put("message", "删除成功");
return data;
