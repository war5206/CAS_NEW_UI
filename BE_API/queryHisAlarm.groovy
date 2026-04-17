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

// 开始时间
String startTime = data.get("startTime");
data.remove("startTime");
startTime = startTime.replaceAll("-", "/");
// 结束时间
String endTime = data.get("endTime");
data.remove("endTime");
endTime = endTime.replaceAll("-", "/");
// 名称
String name = data.get("name");
data.remove("name");
// 等级
String grade = data.get("grade");
data.remove("grade");

// 开启分页
boolean page;
// 当前页码
int current;
// 每页显示条数
int limit;
if (data.get("current") != null && !data.get("current").equals("")) {
    page = true;
    current = Integer.parseInt(data.get("current").toString());
    data.remove("current");
    limit = 6;
} else {
    page = false;
    current = 0;
    limit = 0;
}

// 查询历史报警（先拼接统一条件，分页查询与总数查询共用）
String alarmWhereSql = " FROM sjmg_alarm WHERE `点描述` NOT LIKE '%预留%' AND " +
"(`报警状态` = '恢复' OR handle_status = '处理') AND handle_status != '删除' AND `开始时间` BETWEEN '" + startTime + "' AND '" + endTime + "'"

if (name != null && !name.equals("")) {
    alarmWhereSql += " AND `报警组` = '" + name + "'"
} else {
    alarmWhereSql += " AND (`报警组` = '1' OR `报警组` = '2' OR `报警组` = '3')"
}

if (grade != null && !grade.equals("")) {
    alarmWhereSql += " AND `优先级` = '" + grade + "'"
}

// 查询总数与总页数
int totalCount = 0;
int totalPage = 1;
String countAlarmSql = "SELECT COUNT(1) AS totalCount" + alarmWhereSql;
List<Map<String,Object>> countAlarmList;
try {
    countAlarmList = dynamicDataSource.excuteTenantSqlQuery(countAlarmSql, dbCode);
} catch (Exception e) {
    countAlarmList = new ArrayList<>();
}

if (!countAlarmList.isEmpty() && countAlarmList.get(0).get("totalCount") != null) {
    totalCount = Integer.parseInt(countAlarmList.get(0).get("totalCount").toString());
}
if (page) {
    totalPage = Math.max(1, (int) Math.ceil((double) totalCount / (double) limit));
}

String selectAlarmSql = "SELECT `报警序号` AS 'alarmid',DATE_FORMAT(`开始时间`, '%Y-%m-%d %H:%i:%s') AS 'alarm_time',`优先级` AS 'alarm_grade'," +
"`报警组` AS 'alarm_type',`点描述` AS 'alarm_description',`标签` AS 'alarm_message',handle_status" + alarmWhereSql

selectAlarmSql += " ORDER BY `开始时间` DESC";

if (page) {
    int endNumber = current * limit;
    int startNumber = endNumber - limit;
    selectAlarmSql += " LIMIT " + startNumber + "," + limit;
}

List<Map<String,Object>> selectAlarmList;
try {
    selectAlarmList = dynamicDataSource.excuteTenantSqlQuery(selectAlarmSql, dbCode);
} catch (Exception e) {
    selectAlarmList = new ArrayList();
}

if (page && selectAlarmList.isEmpty()) {
    if (current == 1) {
        data.put("state", "null");
        data.put("message", "");
    } else {
        data.put("state", "fail");
        data.put("message", "没有更多报警数据");
    }
    return data;
}

// 查询热泵
String selectHeatPumpSql = "SELECT device_uuid,arrange_code FROM sjmg_pump_arrange ORDER BY arrange_code";
List<Map<String,Object>> selectHeatPumpList;
try {
    selectHeatPumpList = dynamicDataSource.excuteTenantSqlQuery(selectHeatPumpSql, dbCode);
} catch (Exception e) {
    selectHeatPumpList = new ArrayList<>();
}

// 查询故障
String selectFaultTreeSql = "SELECT fault_code,fault_name,handle FROM sjmg_fault_tree ORDER BY CAST(SUBSTRING(fault_code, 2, 3) AS SIGNED)";
List<Map<String,Object>> selectFaultTreeList;
try {
    selectFaultTreeList = dynamicDataSource.excuteTenantSqlQuery(selectFaultTreeSql, dbCode);
} catch (Exception e) {
    selectFaultTreeList = new ArrayList<>();
}

for (Map<String,Object> selectAlarmMap : selectAlarmList) {
    String alarmType = selectAlarmMap.get("alarm_type").toString();

    if (alarmType.equals("1")) {
        String alarmDescription = selectAlarmMap.get("alarm_description").toString();

        if (alarmDescription.contains("@")) {
            String code = alarmDescription.split("@")[0];
            code = code.replace("HP", "No");

            String malfunction = alarmDescription.split("@")[1];

            for (Map<String,Object> selectHeatPumpMap : selectHeatPumpList) {
                if (code.equals(selectHeatPumpMap.get("device_uuid"))) {
                    selectAlarmMap.put("alarm_description", "热泵" + selectHeatPumpMap.get("arrange_code") + malfunction);
                    break;
                }
            }

            // for (Map<String,Object> selectFaultTreeMap : selectFaultTreeList) {
            //     if (malfunction.equals(selectFaultTreeMap.get("fault_name"))) {
            //         selectAlarmMap.put("alarm_message", selectFaultTreeMap.get("handle").toString());
            //         break;
            //     }
            // }
        }
    }
}

data.put("realAlarm", selectAlarmList);
data.put("totalCount", totalCount);
data.put("totalPage", totalPage);

return data;