/*
 * Algorithm process id: querySmartTimerExecutionLog
 * Purpose: query smart timer execution logs and detail rows.
 *
 * Optional input:
 *   data.planId
 *   data.status
 *   data.startDate: yyyy-MM-dd
 *   data.endDate: yyyy-MM-dd
 *   data.page
 *   data.limit
 */

import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.dynamic.DynamicDataSource;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser.dbCode;
if (dbCode.equals("base")) {
    dbCode = "t01";
}

def fail = { String message ->
    data.put("state", "fail");
    data.put("message", message);
    return data;
}

def escapeSql = { Object value ->
    if (value == null) return "";
    return value.toString().replace("\\", "\\\\").replace("'", "''");
}

int pageNo = data.get("page") == null ? 1 : Integer.parseInt(data.get("page").toString());
int pageSize = data.get("limit") == null ? 20 : Integer.parseInt(data.get("limit").toString());
if (pageNo <= 0) pageNo = 1;
if (pageSize <= 0) pageSize = 20;
int offset = (pageNo - 1) * pageSize;

String whereSql = " WHERE 1=1";
if (data.get("planId") != null && !data.get("planId").toString().trim().equals("")) {
    whereSql += " AND l.plan_id=" + data.get("planId").toString();
}
if (data.get("status") != null && !data.get("status").toString().trim().equals("")) {
    whereSql += " AND l.status='" + escapeSql(data.get("status")) + "'";
}
if (data.get("startDate") != null && !data.get("startDate").toString().trim().equals("")) {
    whereSql += " AND l.execute_date>='" + escapeSql(data.get("startDate")) + "'";
}
if (data.get("endDate") != null && !data.get("endDate").toString().trim().equals("")) {
    whereSql += " AND l.execute_date<='" + escapeSql(data.get("endDate")) + "'";
}

try {
    List<Map<String, Object>> countRows = dynamicDataSource.excuteTenantSqlQuery(
            "SELECT COUNT(1) AS total FROM smart_timer_execution_log l" + whereSql,
            dbCode);
    int total = countRows == null || countRows.size() == 0 ? 0 : Integer.parseInt(countRows.get(0).get("total").toString());

    String logSql = "SELECT l.*,p.plan_name FROM smart_timer_execution_log l LEFT JOIN smart_timer_plan p ON l.plan_id=p.id" +
            whereSql + " ORDER BY l.created_at DESC,l.id DESC LIMIT " + offset + "," + pageSize;
    List<Map<String, Object>> logRows = dynamicDataSource.excuteTenantSqlQuery(logSql, dbCode);

    List<Map<String, Object>> list = new ArrayList<>();
    for (Map<String, Object> logRow : logRows) {
        String logId = logRow.get("id").toString();
        Map<String, Object> item = new LinkedHashMap<>(logRow);

        List<Map<String, Object>> detailRows = dynamicDataSource.excuteTenantSqlQuery(
                "SELECT id,long_name,expected_value,actual_value,verify_status,error_message,created_at,updated_at FROM smart_timer_execution_detail WHERE execution_log_id=" + logId + " ORDER BY id ASC",
                dbCode);
        item.put("details", detailRows);
        list.add(item);
    }

    data.put("state", "success");
    data.put("message", "query success");
    data.put("total", total);
    data.put("list", list);
    return data;
} catch (Exception e) {
    return fail("query smart timer execution log exception: " + e.getMessage());
}
