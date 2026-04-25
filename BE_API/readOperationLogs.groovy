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
String start = data.get("start");
data.remove("start");
// 结束时间
String end = data.get("end");
data.remove("end");

// 分页参数（兼容 page/limit 和 pageNum/pageSize）
String pageStr = data.get("page");
if (pageStr == null || pageStr == "") {
    pageStr = data.get("pageNum");
}
String limitStr = data.get("limit");
if (limitStr == null || limitStr == "") {
    limitStr = data.get("pageSize");
}

int pageNum = 1;
int pageSize = 20;
try {
    if (pageStr != null && pageStr != "") {
        pageNum = Integer.parseInt(pageStr);
    }
} catch (Exception ignore) {}
try {
    if (limitStr != null && limitStr != "") {
        pageSize = Integer.parseInt(limitStr);
    }
} catch (Exception ignore) {}
if (pageNum < 1) {
    pageNum = 1;
}
if (pageSize < 1) {
    pageSize = 20;
}

int offset = (pageNum - 1) * pageSize;

String whereSql = "";
if(start!=null && start!="" && end!=null && end!=""){
    whereSql = "WHERE operation_datetime BETWEEN '" + start + "' AND '" + end + "'";
}else{
    whereSql = "WHERE DATE_FORMAT(operation_datetime, '%Y-%m-%d') = DATE_FORMAT(now(), '%Y-%m-%d')";
}

String countSql = "SELECT COUNT(1) AS total FROM sjmg_operation_log " + whereSql;
String selectSql = "SELECT id,operator_uuid,operation_datetime,operation_type,operation_content FROM sjmg_operation_log " + whereSql + " ORDER BY operation_datetime DESC LIMIT " + offset + "," + pageSize;

// 查询当前页数据
List<Map<String,Object>> selectList;
try {
    selectList = dynamicDataSource.excuteTenantSqlQuery(selectSql, dbCode);
} catch (Exception e) {
    selectList = new ArrayList<>();
}

// 查询总数
long total = 0L;
try {
    List<Map<String,Object>> countList = dynamicDataSource.excuteTenantSqlQuery(countSql, dbCode);
    if (countList != null && countList.size() > 0) {
        Object totalObj = countList.get(0).get("total");
        if (totalObj != null) {
            total = Long.parseLong(totalObj.toString());
        }
    }
} catch (Exception ignore) {}

data.put("operationLog", selectList);
data.put("page", pageNum);
data.put("limit", pageSize);
data.put("total", total);

return data;