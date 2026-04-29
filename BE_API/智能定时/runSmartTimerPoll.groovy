/*
 * Algorithm process id: runSmartTimerPoll
 * Purpose: scan enabled smart timer plans, write matched period actions,
 *          then query real values to verify write result.
 *
 * Suggested scheduler: every 30s or 60s.
 *
 * Optional input:
 *   data.maxRetry: default 3
 */

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.sunwayland.algorithm.feign.FeignSolAlgorithmProcess;
import com.sunwayland.algorithm.pojo.AlgorithmProcessExecuteParam;
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
FeignSolAlgorithmProcess sol = ApplicationContextProvider.getBean(FeignSolAlgorithmProcess.class);
SnowFlake idWorker = new SnowFlake();

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser.dbCode;
if (dbCode.equals("base")) {
    dbCode = "t01";
}

def escapeSql = { Object value ->
    if (value == null) return "";
    return value.toString().replace("\\", "\\\\").replace("'", "''");
}

def normalizeValue = { Object value ->
    if (value == null) return "";
    String text = value.toString().trim();
    try {
        BigDecimal bd = new BigDecimal(text);
        return bd.stripTrailingZeros().toPlainString();
    } catch (Exception ignored) {
        return text;
    }
}

def callAlgorithm = { String algorithmProcessId, Map payload ->
    AlgorithmProcessExecuteParam param = new AlgorithmProcessExecuteParam();
    param.setAlgorithmProcessId(algorithmProcessId);
    Map<String, Object> paramData = new HashMap<>();
    paramData.put("data", payload);
    param.setParam(paramData);
    return sol.execute(param);
}

def extractRealValueMap = { Object responseObj, List<String> wantedLongNames ->
    Map<String, String> result = new LinkedHashMap<>();
    if (responseObj == null) return result;

    Set<String> wantedSet = new HashSet<>();
    if (wantedLongNames != null) {
        for (String n : wantedLongNames) wantedSet.add(n);
    }

    if (responseObj instanceof Map) {
        Map flatMap = (Map) responseObj;
        for (Object key : flatMap.keySet()) {
            String keyStr = key.toString();
            if (wantedSet.contains(keyStr)) {
                Object v = flatMap.get(key);
                result.put(keyStr, v == null ? "" : v.toString());
            }
        }
        if (!result.isEmpty()) return result;
    }

    String text = JSON.toJSONString(responseObj);
    try {
        JSONObject json = JSON.parseObject(text);
        Object dataObj = json.get("data");
        if (dataObj instanceof Map) {
            Map dataMap = (Map) dataObj;
            for (Object key : dataMap.keySet()) {
                result.put(key.toString(), dataMap.get(key) == null ? "" : dataMap.get(key).toString());
            }
        }
        Object resultObj = json.get("result");
        if (resultObj instanceof Map) {
            Map resultMap = (Map) resultObj;
            for (Object key : resultMap.keySet()) {
                result.put(key.toString(), resultMap.get(key) == null ? "" : resultMap.get(key).toString());
            }
        }
        Object listObj = json.get("list");
        if (listObj instanceof List) {
            List list = (List) listObj;
            for (Object item : list) {
                if (item instanceof Map) {
                    Map row = (Map) item;
                    Object longName = row.get("taglongname") == null ? row.get("longName") : row.get("taglongname");
                    Object value = row.get("realval") == null ? row.get("value") : row.get("realval");
                    if (longName != null) {
                        result.put(longName.toString(), value == null ? "" : value.toString());
                    }
                }
            }
        }
    } catch (Exception ignored) {
    }
    return result;
}

Calendar now = Calendar.getInstance();
int javaWeek = now.get(Calendar.DAY_OF_WEEK);
int weekday = javaWeek == Calendar.SUNDAY ? 0 : javaWeek - 1;
int currentMinute = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
String executeDate = new java.text.SimpleDateFormat("yyyy-MM-dd").format(now.getTime());
int maxRetry = data.get("maxRetry") == null ? 3 : Integer.parseInt(data.get("maxRetry").toString());

List<Map<String, Object>> results = new ArrayList<>();

try {
    String matchSql = "SELECT p.id AS plan_id,c.id AS cycle_id,pr.id AS period_id,p.plan_name,c.days,pr.start_minute,pr.end_minute,pr.mode,pr.temperature " +
            "FROM smart_timer_plan p " +
            "INNER JOIN smart_timer_cycle c ON c.plan_id=p.id AND c.deleted=0 " +
            "INNER JOIN smart_timer_period pr ON pr.cycle_id=c.id AND pr.deleted=0 " +
            "WHERE p.deleted=0 AND p.enabled=1 AND FIND_IN_SET('" + weekday + "', c.days) > 0 " +
            "AND pr.start_minute <= " + currentMinute + " AND pr.end_minute > " + currentMinute +
            " ORDER BY p.priority ASC,p.id ASC,c.sort_no ASC,pr.sort_no ASC";
    List<Map<String, Object>> matchedPeriods = dynamicDataSource.excuteTenantSqlQuery(matchSql, dbCode);

    for (Map<String, Object> periodRow : matchedPeriods) {
        String planId = periodRow.get("plan_id").toString();
        String cycleId = periodRow.get("cycle_id").toString();
        String periodId = periodRow.get("period_id").toString();
        String executeKey = planId + "_" + cycleId + "_" + periodId + "_" + executeDate.replace("-", "");

        Map<String, Object> oneResult = new LinkedHashMap<>();
        oneResult.put("planId", planId);
        oneResult.put("cycleId", cycleId);
        oneResult.put("periodId", periodId);
        oneResult.put("executeKey", executeKey);

        List<Map<String, Object>> logRows = dynamicDataSource.excuteTenantSqlQuery(
                "SELECT id,status,attempt_count FROM smart_timer_execution_log WHERE execute_key='" + escapeSql(executeKey) + "'",
                dbCode);

        String logId;
        int attemptCount = 0;
        if (logRows != null && logRows.size() > 0) {
            Map<String, Object> logRow = logRows.get(0);
            logId = logRow.get("id").toString();
            String oldStatus = logRow.get("status") == null ? "" : logRow.get("status").toString();
            attemptCount = logRow.get("attempt_count") == null ? 0 : Integer.parseInt(logRow.get("attempt_count").toString());
            if (oldStatus.equals("success")) {
                oneResult.put("status", "skipped_success_exists");
                results.add(oneResult);
                continue;
            }
            if (attemptCount >= maxRetry) {
                oneResult.put("status", "skipped_retry_limit");
                results.add(oneResult);
                continue;
            }
        } else {
            logId = idWorker.nextId();
            String insertLogSql = "INSERT INTO smart_timer_execution_log (id,plan_id,cycle_id,period_id,execute_date,execute_key,matched_weekday,matched_minute,status,attempt_count,verify_count,created_at,updated_at) VALUES (" +
                    logId + "," + planId + "," + cycleId + "," + periodId + ",'" + executeDate + "','" + escapeSql(executeKey) + "'," +
                    weekday + "," + currentMinute + ",'pending',0,0,NOW(),NOW())";
            dynamicDataSource.excuteTenantSql(insertLogSql, dbCode);
        }

        List<Map<String, Object>> actions = dynamicDataSource.excuteTenantSqlQuery(
                "SELECT long_name,write_value,value_type FROM smart_timer_action WHERE deleted=0 AND period_id=" + periodId + " ORDER BY sort_no ASC,id ASC",
                dbCode);
        if (actions == null || actions.size() == 0) {
            dynamicDataSource.excuteTenantSql("UPDATE smart_timer_execution_log SET status='failed',error_message='no actions configured',updated_at=NOW() WHERE id=" + logId, dbCode);
            oneResult.put("status", "failed_no_actions");
            results.add(oneResult);
            continue;
        }

        Map<String, Object> writeData = new LinkedHashMap<>();
        List<String> longNames = new ArrayList<>();
        for (Map<String, Object> action : actions) {
            String longName = action.get("long_name").toString();
            String writeValue = action.get("write_value").toString();
            writeData.put(longName, writeValue);
            longNames.add(longName);
        }

        attemptCount += 1;
        String writeDataJson = JSON.toJSONString(writeData);
        String requestBody = JSON.toJSONString(["writeData": writeDataJson]);
        dynamicDataSource.excuteTenantSql("UPDATE smart_timer_execution_log SET status='writing',attempt_count=" + attemptCount +
                ",request_body='" + escapeSql(requestBody) + "',expected_values='" + escapeSql(writeDataJson) +
                "',first_executed_at=IFNULL(first_executed_at,NOW()),last_executed_at=NOW(),updated_at=NOW() WHERE id=" + logId, dbCode);

        Object writeResponse = null;
        try {
            writeResponse = callAlgorithm("writeRealvalByLongNames", ["writeData": writeDataJson]);
            dynamicDataSource.excuteTenantSql("UPDATE smart_timer_execution_log SET status='verifying',write_response_body='" +
                    escapeSql(JSON.toJSONString(writeResponse)) + "',updated_at=NOW() WHERE id=" + logId, dbCode);
        } catch (Exception e) {
            dynamicDataSource.excuteTenantSql("UPDATE smart_timer_execution_log SET status='retrying',error_message='" +
                    escapeSql("write failed: " + e.getMessage()) + "',updated_at=NOW() WHERE id=" + logId, dbCode);
            oneResult.put("status", "write_failed");
            oneResult.put("message", e.getMessage());
            results.add(oneResult);
            continue;
        }

        String writeState = "";
        if (writeResponse instanceof Map) {
            Object stateObj = ((Map) writeResponse).get("state");
            if (stateObj != null) writeState = stateObj.toString();
        }
        if (!writeState.equals("success")) {
            String writeMsg = "";
            if (writeResponse instanceof Map) {
                Object m = ((Map) writeResponse).get("message");
                if (m != null) writeMsg = m.toString();
            }
            String finalStatusOnFail = (attemptCount >= maxRetry) ? "failed" : "retrying";
            dynamicDataSource.excuteTenantSql("UPDATE smart_timer_execution_log SET status='" + finalStatusOnFail + "',error_message='" +
                    escapeSql("write returned non-success state: " + writeState + " " + writeMsg) +
                    "',updated_at=NOW() WHERE id=" + logId, dbCode);
            oneResult.put("status", finalStatusOnFail);
            oneResult.put("attemptCount", attemptCount);
            oneResult.put("message", "write returned state=" + writeState + " " + writeMsg);
            results.add(oneResult);
            continue;
        }

        try {
            Thread.sleep(2000);
        } catch (Exception ignored) {
        }

        Object verifyResponse = null;
        Map<String, String> actualMap = new LinkedHashMap<>();
        try {
            String longNamesText = longNames.join(",");
            verifyResponse = callAlgorithm("queryRealvalByLongNames", ["longNames": longNamesText]);
            actualMap = extractRealValueMap(verifyResponse, longNames);
        } catch (Exception e) {
            dynamicDataSource.excuteTenantSql("UPDATE smart_timer_execution_log SET status='retrying',verify_count=verify_count+1,error_message='" +
                    escapeSql("verify failed: " + e.getMessage()) + "',updated_at=NOW() WHERE id=" + logId, dbCode);
            oneResult.put("status", "verify_failed");
            oneResult.put("message", e.getMessage());
            results.add(oneResult);
            continue;
        }

        boolean allMatched = true;
        dynamicDataSource.excuteTenantSql("DELETE FROM smart_timer_execution_detail WHERE execution_log_id=" + logId, dbCode);
        for (String longName : longNames) {
            String expected = normalizeValue(writeData.get(longName));
            String actual = normalizeValue(actualMap.get(longName));
            boolean matched = expected.equals(actual);
            if (!matched) allMatched = false;

            String detailId = idWorker.nextId();
            String detailSql = "INSERT INTO smart_timer_execution_detail (id,execution_log_id,long_name,expected_value,actual_value,verify_status,error_message) VALUES (" +
                    detailId + "," + logId + ",'" + escapeSql(longName) + "','" + escapeSql(expected) + "','" + escapeSql(actual) + "','" +
                    (matched ? "success" : "failed") + "','" + (matched ? "" : "actual value does not match expected value") + "')";
            dynamicDataSource.excuteTenantSql(detailSql, dbCode);
        }

        String finalStatus = allMatched ? "success" : (attemptCount >= maxRetry ? "failed" : "retrying");
        String errorMessage = allMatched ? "" : "one or more point values did not match";
        dynamicDataSource.excuteTenantSql("UPDATE smart_timer_execution_log SET status='" + finalStatus + "',verify_count=verify_count+1,verify_request_body='" +
                escapeSql(JSON.toJSONString(["longNames": longNames.join(",")])) + "',verify_response_body='" +
                escapeSql(JSON.toJSONString(verifyResponse)) + "',actual_values='" + escapeSql(JSON.toJSONString(actualMap)) +
                "',error_message='" + escapeSql(errorMessage) + "',verified_at=NOW(),updated_at=NOW() WHERE id=" + logId, dbCode);

        oneResult.put("status", finalStatus);
        oneResult.put("attemptCount", attemptCount);
        oneResult.put("expected", writeData);
        oneResult.put("actual", actualMap);
        results.add(oneResult);
    }

    data.put("state", "success");
    data.put("message", "poll finished");
    data.put("weekday", weekday);
    data.put("currentMinute", currentMinute);
    data.put("executeDate", executeDate);
    data.put("results", results);
    return data;
} catch (Exception e) {
    data.put("state", "fail");
    data.put("message", "run smart timer poll exception: " + e.getMessage());
    data.put("results", results);
    return data;
}
