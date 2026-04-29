/*
 * Algorithm process id: querySmartTimerPlan
 * Purpose: query smart timer plans as nested plan -> cycle -> period -> action data.
 *
 * Optional input:
 *   data.enabled: 0/1
 *   data.page: page number, default 1
 *   data.limit: page size, default 100
 */

import com.alibaba.fastjson.JSON;
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

int pageNo = data.get("page") == null ? 1 : Integer.parseInt(data.get("page").toString());
int pageSize = data.get("limit") == null ? 100 : Integer.parseInt(data.get("limit").toString());
if (pageNo <= 0) pageNo = 1;
if (pageSize <= 0) pageSize = 100;
int offset = (pageNo - 1) * pageSize;

String whereSql = " WHERE deleted=0";
if (data.get("enabled") != null && !data.get("enabled").toString().trim().equals("")) {
    whereSql += " AND enabled=" + Integer.parseInt(data.get("enabled").toString());
}

try {
    List<Map<String, Object>> countRows = dynamicDataSource.excuteTenantSqlQuery("SELECT COUNT(1) AS total FROM smart_timer_plan" + whereSql, dbCode);
    int total = countRows == null || countRows.size() == 0 ? 0 : Integer.parseInt(countRows.get(0).get("total").toString());

    String planSql = "SELECT id,plan_name,enabled,page_mode,priority,remark,created_at,updated_at FROM smart_timer_plan" +
            whereSql + " ORDER BY priority ASC,id ASC LIMIT " + offset + "," + pageSize;
    List<Map<String, Object>> planRows = dynamicDataSource.excuteTenantSqlQuery(planSql, dbCode);

    List<Map<String, Object>> plans = new ArrayList<>();
    for (Map<String, Object> planRow : planRows) {
        String planId = planRow.get("id").toString();
        Map<String, Object> plan = new LinkedHashMap<>();
        plan.put("id", planId);
        plan.put("name", planRow.get("plan_name"));
        plan.put("planName", planRow.get("plan_name"));
        plan.put("enabled", planRow.get("enabled"));
        plan.put("pageMode", planRow.get("page_mode"));
        plan.put("priority", planRow.get("priority"));
        plan.put("remark", planRow.get("remark"));

        List<Map<String, Object>> cycles = new ArrayList<>();
        String cycleSql = "SELECT id,cycle_name,days,sort_no FROM smart_timer_cycle WHERE deleted=0 AND plan_id=" + planId + " ORDER BY sort_no ASC,id ASC";
        List<Map<String, Object>> cycleRows = dynamicDataSource.excuteTenantSqlQuery(cycleSql, dbCode);
        for (Map<String, Object> cycleRow : cycleRows) {
            String cycleId = cycleRow.get("id").toString();
            Map<String, Object> cycle = new LinkedHashMap<>();
            cycle.put("id", cycleId);
            cycle.put("cycleName", cycleRow.get("cycle_name"));
            List<Integer> days = new ArrayList<>();
            String daysText = cycleRow.get("days") == null ? "" : cycleRow.get("days").toString();
            for (String day : daysText.split(",")) {
                if (!day.trim().equals("")) {
                    days.add(Integer.parseInt(day.trim()));
                }
            }
            cycle.put("days", days);

            List<Map<String, Object>> periods = new ArrayList<>();
            String periodSql = "SELECT id,start_minute,end_minute,mode,temperature,sort_no FROM smart_timer_period WHERE deleted=0 AND cycle_id=" + cycleId + " ORDER BY sort_no ASC,id ASC";
            List<Map<String, Object>> periodRows = dynamicDataSource.excuteTenantSqlQuery(periodSql, dbCode);
            for (Map<String, Object> periodRow : periodRows) {
                String periodId = periodRow.get("id").toString();
                Map<String, Object> period = new LinkedHashMap<>();
                int startMinute = Integer.parseInt(periodRow.get("start_minute").toString());
                int endMinute = Integer.parseInt(periodRow.get("end_minute").toString());
                period.put("id", periodId);
                period.put("startMinute", startMinute);
                period.put("endMinute", endMinute);
                period.put("start", String.format("%02d:%02d", (int)(startMinute / 60), startMinute % 60));
                period.put("end", endMinute == 1440 ? "24:00" : String.format("%02d:%02d", (int)(endMinute / 60), endMinute % 60));
                period.put("mode", periodRow.get("mode"));
                period.put("temperature", periodRow.get("temperature"));

                List<Map<String, Object>> actions = new ArrayList<>();
                String actionSql = "SELECT id,long_name,write_value,value_type,sort_no FROM smart_timer_action WHERE deleted=0 AND period_id=" + periodId + " ORDER BY sort_no ASC,id ASC";
                List<Map<String, Object>> actionRows = dynamicDataSource.excuteTenantSqlQuery(actionSql, dbCode);
                for (Map<String, Object> actionRow : actionRows) {
                    Map<String, Object> action = new LinkedHashMap<>();
                    action.put("id", actionRow.get("id"));
                    action.put("longName", actionRow.get("long_name"));
                    action.put("writeValue", actionRow.get("write_value"));
                    action.put("valueType", actionRow.get("value_type"));
                    actions.add(action);
                }
                period.put("actions", actions);
                periods.add(period);
            }
            cycle.put("periods", periods);
            cycles.add(cycle);
        }
        plan.put("cycles", cycles);
        plans.add(plan);
    }

    data.put("state", "success");
    data.put("message", "query success");
    data.put("total", total);
    data.put("list", plans);
    data.put("plans", plans);
    return data;
} catch (Exception e) {
    return fail("query smart timer plan exception: " + e.getMessage());
}
