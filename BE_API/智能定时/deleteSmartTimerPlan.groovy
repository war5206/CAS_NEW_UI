/*
 * Algorithm process id: deleteSmartTimerPlan
 * Purpose: soft delete one smart timer plan and its config.
 *
 * Input:
 *   data.id: plan id
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

if (data.get("id") == null || data.get("id").toString().trim().equals("")) {
    return fail("id is required");
}

String planId = data.get("id").toString();

try {
    String result = dynamicDataSource.excuteTenantSql("UPDATE smart_timer_plan SET enabled=0,deleted=1 WHERE id=" + planId, dbCode);
    if (result == null || !result.equals("success")) {
        return fail("delete smart_timer_plan failed");
    }

    dynamicDataSource.excuteTenantSql("UPDATE smart_timer_cycle SET deleted=1 WHERE plan_id=" + planId, dbCode);
    dynamicDataSource.excuteTenantSql("UPDATE smart_timer_period SET deleted=1 WHERE cycle_id IN (SELECT id FROM smart_timer_cycle WHERE plan_id=" + planId + ")", dbCode);
    dynamicDataSource.excuteTenantSql("UPDATE smart_timer_action SET deleted=1 WHERE period_id IN (SELECT p.id FROM smart_timer_period p INNER JOIN smart_timer_cycle c ON p.cycle_id=c.id WHERE c.plan_id=" + planId + ")", dbCode);

    data.put("state", "success");
    data.put("message", "delete success");
    return data;
} catch (Exception e) {
    return fail("delete smart timer plan exception: " + e.getMessage());
}
