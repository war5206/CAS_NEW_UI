/*
 * Algorithm process id: saveSmartTimerPlan
 * Purpose: create or update one smart timer plan.
 *
 * Input:
 *   data.planJson: JSON string
 *   {
 *     "id": "optional",
 *     "name": "方案一",
 *     "enabled": true,
 *     "pageMode": "smart",
 *     "priority": 0,
 *     "cycles": [
 *       {
 *         "days": [1,2,3,4,5,6,0],
 *         "periods": [
 *           {"start":"00:00","end":"06:00","mode":"climate"},
 *           {"start":"06:00","end":"24:00","mode":"constant","temperature":"35"}
 *         ]
 *       }
 *     ]
 *   }
 *
 * Output:
 *   data.state: success/fail
 *   data.planId: saved plan id
 */

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
SnowFlake idWorker = new SnowFlake();

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

def toBoolInt = { Object value ->
    if (value == null) return 0;
    String text = value.toString();
    return (text.equalsIgnoreCase("true") || text.equals("1")) ? 1 : 0;
}

def parseMinute = { Object value ->
    if (value == null) return -1;
    String text = value.toString().trim();
    if (text.equals("24:00") || text.equals("24:00:00")) return 1440;
    String[] parts = text.split(":");
    if (parts.length < 2) return -1;
    int hour = Integer.parseInt(parts[0]);
    int minute = Integer.parseInt(parts[1]);
    if (hour < 0 || hour > 24 || minute < 0 || minute > 59) return -1;
    if (hour == 24 && minute != 0) return -1;
    return hour * 60 + minute;
}

def normalizeDays = { JSONArray days ->
    if (days == null || days.size() == 0) return "";
    Set<String> set = new LinkedHashSet<>();
    for (int i = 0; i < days.size(); i++) {
        String day = days.get(i).toString();
        if (["0", "1", "2", "3", "4", "5", "6"].contains(day)) {
            set.add(day);
        }
    }
    return set.join(",");
}

def buildActions = { JSONObject period ->
    JSONArray actions = period.getJSONArray("actions");
    if (actions != null && actions.size() > 0) {
        return actions;
    }

    JSONArray generated = new JSONArray();
    String mode = period.getString("mode");
    if ("constant".equals(mode)) {
        JSONObject qhbc = new JSONObject();
        qhbc.put("longName", "Sys\\FinforWorx\\QHBC");
        qhbc.put("writeValue", "0");
        qhbc.put("valueType", "number");
        generated.add(qhbc);

        JSONObject temp = new JSONObject();
        temp.put("longName", "Sys\\FinforWorx\\SetTemperature1");
        temp.put("writeValue", period.getString("temperature"));
        temp.put("valueType", "number");
        generated.add(temp);
    } else {
        JSONObject qhbc = new JSONObject();
        qhbc.put("longName", "Sys\\FinforWorx\\QHBC");
        qhbc.put("writeValue", "1");
        qhbc.put("valueType", "number");
        generated.add(qhbc);
    }
    return generated;
}

String planJson = data.get("planJson") == null ? "" : data.get("planJson").toString();
if (planJson.trim().equals("")) {
    return fail("planJson is required");
}

JSONObject plan;
try {
    plan = JSON.parseObject(planJson);
} catch (Exception e) {
    return fail("planJson is invalid JSON: " + e.getMessage());
}

String planName = plan.getString("planName");
if (planName == null || planName.trim().equals("")) {
    planName = plan.getString("name");
}
if (planName == null || planName.trim().equals("")) {
    return fail("plan name is required");
}

JSONArray cycles = plan.getJSONArray("cycles");
if (cycles == null || cycles.size() == 0) {
    return fail("cycles is required");
}

String planId = plan.get("id") == null || plan.get("id").toString().trim().equals("") ? idWorker.nextId() : plan.get("id").toString();
String pageMode = plan.getString("pageMode") == null ? "smart" : plan.getString("pageMode");
int enabled = plan.get("enabled") == null ? 1 : toBoolInt(plan.get("enabled"));
int priority = plan.get("priority") == null ? 0 : Integer.parseInt(plan.get("priority").toString());
String remark = plan.getString("remark");

try {
    List<Map<String, Object>> exists = dynamicDataSource.excuteTenantSqlQuery("SELECT id FROM smart_timer_plan WHERE id = " + planId, dbCode);
    String savePlanSql;
    if (exists != null && exists.size() > 0) {
        savePlanSql = "UPDATE smart_timer_plan SET plan_name='" + escapeSql(planName) + "', enabled=" + enabled +
                ", page_mode='" + escapeSql(pageMode) + "', priority=" + priority + ", remark='" + escapeSql(remark) +
                "', deleted=0 WHERE id=" + planId;
    } else {
        savePlanSql = "INSERT INTO smart_timer_plan (id,plan_name,enabled,page_mode,priority,remark,deleted) VALUES (" +
                planId + ",'" + escapeSql(planName) + "'," + enabled + ",'" + escapeSql(pageMode) + "'," + priority +
                ",'" + escapeSql(remark) + "',0)";
    }

    String result = dynamicDataSource.excuteTenantSql(savePlanSql, dbCode);
    if (result == null || !result.equals("success")) {
        return fail("save smart_timer_plan failed");
    }

    dynamicDataSource.excuteTenantSql("DELETE a FROM smart_timer_action a INNER JOIN smart_timer_period p ON a.period_id=p.id INNER JOIN smart_timer_cycle c ON p.cycle_id=c.id WHERE c.plan_id=" + planId, dbCode);
    dynamicDataSource.excuteTenantSql("DELETE p FROM smart_timer_period p INNER JOIN smart_timer_cycle c ON p.cycle_id=c.id WHERE c.plan_id=" + planId, dbCode);
    dynamicDataSource.excuteTenantSql("DELETE FROM smart_timer_cycle WHERE plan_id=" + planId, dbCode);

    for (int c = 0; c < cycles.size(); c++) {
        JSONObject cycle = cycles.getJSONObject(c);
        String days = normalizeDays(cycle.getJSONArray("days"));
        if (days.equals("")) {
            return fail("cycle " + (c + 1) + " days is required");
        }

        String cycleId = idWorker.nextId();
        String cycleName = cycle.getString("cycleName");
        String insertCycleSql = "INSERT INTO smart_timer_cycle (id,plan_id,cycle_name,days,sort_no,deleted) VALUES (" +
                cycleId + "," + planId + ",'" + escapeSql(cycleName) + "','" + escapeSql(days) + "'," + c + ",0)";
        result = dynamicDataSource.excuteTenantSql(insertCycleSql, dbCode);
        if (result == null || !result.equals("success")) {
            return fail("save smart_timer_cycle failed");
        }

        JSONArray periods = cycle.getJSONArray("periods");
        if (periods == null || periods.size() == 0) {
            return fail("cycle " + (c + 1) + " periods is required");
        }

        for (int p = 0; p < periods.size(); p++) {
            JSONObject period = periods.getJSONObject(p);
            String mode = period.getString("mode") == null ? "climate" : period.getString("mode");
            if (!mode.equals("climate") && !mode.equals("constant")) {
                return fail("period mode must be climate or constant");
            }

            int startMinute = period.get("startMinute") == null ? parseMinute(period.get("start")) : Integer.parseInt(period.get("startMinute").toString());
            int endMinute = period.get("endMinute") == null ? parseMinute(period.get("end")) : Integer.parseInt(period.get("endMinute").toString());
            if (startMinute < 0 || endMinute <= startMinute || endMinute > 1440) {
                return fail("period time range is invalid");
            }
            if (mode.equals("constant") && (period.get("temperature") == null || period.get("temperature").toString().trim().equals(""))) {
                return fail("constant period temperature is required");
            }

            String periodId = idWorker.nextId();
            String temperatureSql = mode.equals("constant") ? period.get("temperature").toString() : "NULL";
            String insertPeriodSql = "INSERT INTO smart_timer_period (id,cycle_id,start_minute,end_minute,mode,temperature,sort_no,deleted) VALUES (" +
                    periodId + "," + cycleId + "," + startMinute + "," + endMinute + ",'" + escapeSql(mode) + "'," +
                    temperatureSql + "," + p + ",0)";
            result = dynamicDataSource.excuteTenantSql(insertPeriodSql, dbCode);
            if (result == null || !result.equals("success")) {
                return fail("save smart_timer_period failed");
            }

            JSONArray actions = buildActions(period);
            for (int a = 0; a < actions.size(); a++) {
                JSONObject action = actions.getJSONObject(a);
                String longName = action.getString("longName");
                if (longName == null || longName.trim().equals("")) {
                    longName = action.getString("long_name");
                }
                String writeValue = action.getString("writeValue");
                if (writeValue == null) {
                    writeValue = action.getString("write_value");
                }
                String valueType = action.getString("valueType") == null ? "number" : action.getString("valueType");
                if (longName == null || longName.trim().equals("") || writeValue == null || writeValue.trim().equals("")) {
                    return fail("period action longName/writeValue is required");
                }

                String actionId = idWorker.nextId();
                String insertActionSql = "INSERT INTO smart_timer_action (id,period_id,long_name,write_value,value_type,sort_no,deleted) VALUES (" +
                        actionId + "," + periodId + ",'" + escapeSql(longName) + "','" + escapeSql(writeValue) + "','" +
                        escapeSql(valueType) + "'," + a + ",0)";
                result = dynamicDataSource.excuteTenantSql(insertActionSql, dbCode);
                if (result == null || !result.equals("success")) {
                    return fail("save smart_timer_action failed");
                }
            }
        }
    }
} catch (Exception e) {
    return fail("save smart timer plan exception: " + e.getMessage());
}

data.put("state", "success");
data.put("message", "save success");
data.put("planId", planId);
return data;
