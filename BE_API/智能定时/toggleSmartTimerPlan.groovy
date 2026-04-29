/*
 * Algorithm process id: toggleSmartTimerPlan
 * Purpose: enable or disable one smart timer plan.
 *
 * Input:
 *   data.id: plan id
 *   data.enabled: 0/1 or true/false
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

def toBoolInt = { Object value ->
    if (value == null) return 0;
    String text = value.toString();
    return (text.equalsIgnoreCase("true") || text.equals("1")) ? 1 : 0;
}

if (data.get("id") == null || data.get("id").toString().trim().equals("")) {
    return fail("id is required");
}
if (data.get("enabled") == null || data.get("enabled").toString().trim().equals("")) {
    return fail("enabled is required");
}

String planId = data.get("id").toString();
int enabled = toBoolInt(data.get("enabled"));

try {
    String result = dynamicDataSource.excuteTenantSql("UPDATE smart_timer_plan SET enabled=" + enabled + " WHERE deleted=0 AND id=" + planId, dbCode);
    if (result == null || !result.equals("success")) {
        return fail("toggle smart_timer_plan failed");
    }

    data.put("state", "success");
    data.put("message", "toggle success");
    data.put("enabled", enabled);
    return data;
} catch (Exception e) {
    return fail("toggle smart timer plan exception: " + e.getMessage());
}
