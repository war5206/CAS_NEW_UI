/* 算法过程 ID（与前端 ALGORITHM_PROCESS_IDS.SAVE_ENERGY_PRICE_PLAN 一致）: saveEnergyPricePlan
 *
 * 功能：电价方案「新增 / 编辑」合一
 * - 先按「清除区间」DELETE sjmg_energy_price_detail 中电类型 uuid=2 且日期区间匹配的行
 * - 再按 segments 数组逐条 INSERT
 *
 * 入参（data Map，与 callAlgorithmProcess param.data 对齐）：
 * - energyPricePlan (String) JSON 字符串，结构：
 *   {
 *     "startMonth": "MM-DD",
 *     "endMonth": "MM-DD",
 *     "segments": [
 *       { "energyPriceName": "峰电", "unitPrice": "0.52", "startTime": "08:00:00", "endTime": "22:00:00" },
 *       ...
 *     ]
 *   }
 * - clearStartMonth (String, 可选) 编辑时若改了方案日期，填「原」开始月日，用于 DELETE 旧数据；省略则使用 energyPricePlan.startMonth
 * - clearEndMonth   (String, 可选) 同上，省略则使用 energyPricePlan.endMonth
 *
 * 说明：energy_price_type_uuid 固定为 '2'（电），与既有 saveEnergyPriceDetail 一致。
 */

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONArray;
import com.alibaba.fastjson.JSONObject;
import com.sunwayland.algorithm.feign.FeignSolAlgorithmProcess;
import com.sunwayland.algorithm.pojo.AlgorithmProcessExecuteParam
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
SnowFlake creatId = new SnowFlake();

PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String dbCode = ptUser.dbCode;
if (dbCode.equals("base")) {
    dbCode = "t01"
}

FeignSolAlgorithmProcess sol = ApplicationContextProvider.getBean(FeignSolAlgorithmProcess.class);
AlgorithmProcessExecuteParam param = new AlgorithmProcessExecuteParam();
param.setAlgorithmProcessId("writeOperationLog");
Map<String, String> paramData = new HashMap();
Map<String, String> paramMap = new HashMap();
paramData.put("data", paramMap);
param.setParam(paramData);

def escapeSql(String s) {
    if (s == null) return "";
    return s.replace("'", "''");
}

String energyPricePlanJson = (String) data.get("energyPricePlan");
data.remove("energyPricePlan");
String clearStartMonth = data.get("clearStartMonth") != null ? data.get("clearStartMonth").toString() : null;
data.remove("clearStartMonth");
String clearEndMonth = data.get("clearEndMonth") != null ? data.get("clearEndMonth").toString() : null;
data.remove("clearEndMonth");

if (energyPricePlanJson == null || energyPricePlanJson.trim().equals("")) {
    data.put("state", "fail");
    data.put("message", "energyPricePlan 不能为空");
    return data;
}

JSONObject plan;
try {
    plan = JSON.parseObject(energyPricePlanJson);
} catch (Exception e) {
    data.put("state", "fail");
    data.put("message", "energyPricePlan JSON 解析失败");
    return data;
}

String startMonth = plan.getString("startMonth");
String endMonth = plan.getString("endMonth");
JSONArray segments = plan.getJSONArray("segments");

if (startMonth == null || endMonth == null || segments == null || segments.isEmpty()) {
    data.put("state", "fail");
    data.put("message", "方案日期或时段列表无效");
    return data;
}

String delStart = (clearStartMonth != null && !clearStartMonth.trim().equals("")) ? clearStartMonth.trim() : startMonth;
String delEnd = (clearEndMonth != null && !clearEndMonth.trim().equals("")) ? clearEndMonth.trim() : endMonth;

String deleteSql = "DELETE FROM sjmg_energy_price_detail WHERE energy_price_type_uuid = '2' AND start_date = '" + escapeSql(delStart) + "' AND end_date = '" + escapeSql(delEnd) + "'";
String deleteResult = dynamicDataSource.excuteTenantSql(deleteSql, dbCode);
if (deleteResult == null || !deleteResult.equals("success")) {
    data.put("state", "fail");
    data.put("message", "清除旧明细失败");
    return data;
}

for (int i = 0; i < segments.size(); i++) {
    JSONObject seg = segments.getJSONObject(i);
    String energyPriceName = seg.getString("energyPriceName");
    String unitPrice = seg.getString("unitPrice");
    String startTime = seg.getString("startTime");
    String endTime = seg.getString("endTime");

    if (energyPriceName == null || unitPrice == null || startTime == null || endTime == null) {
        data.put("state", "fail");
        data.put("message", "第 " + (i + 1) + " 条时段缺少必填字段");
        return data;
    }

    String energyDetailId = creatId.nextId();
    String insertDetailSql = "INSERT INTO sjmg_energy_price_detail (id,energy_price_type_uuid,energy_price_name,unit_price,start_time,end_time,start_date,end_date)" +
            " VALUES ('" + energyDetailId + "','2','" + escapeSql(energyPriceName) + "','" + escapeSql(unitPrice) + "','" + escapeSql(startTime) + "','" + escapeSql(endTime) + "','" + escapeSql(startMonth) + "','" + escapeSql(endMonth) + "')";
    String insResult = dynamicDataSource.excuteTenantSql(insertDetailSql, dbCode);
    if (insResult == null || !insResult.equals("success")) {
        data.put("state", "fail");
        data.put("message", "保存第 " + (i + 1) + " 条时段失败");
        return data;
    }
}

operationType = "保存";
operationContent = "能源价格-保存电价方案-日期:" + startMonth + "至" + endMonth + ",时段数:" + segments.size();
paramMap.put("operationType", operationType);
paramMap.put("operationContent", operationContent);
Map<String, String> detailSolResultMap = (Map<String, String>) sol.execute(param);

data.put("state", "success");
data.put("message", "保存成功");
return data;
