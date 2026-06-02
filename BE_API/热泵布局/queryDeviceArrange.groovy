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

// 查询项目ID
String selectProjectSql = "SELECT * FROM sjmg_project_data";
List<Map<String,Object>> selectProjectList = dynamicDataSource.excuteTenantSqlQuery(selectProjectSql, dbCode);
String projectId;
if (selectProjectList.size() > 0) {
    projectId = selectProjectList.get(0).get("id").toString();
} else {
    projectId = "";
}
data.put("projectId", projectId);

// 查询
String selectSql = "SELECT id,project_uuid,`row_number`,`column_number`,device_uuid,arrange_code,arrange_state,code_state FROM sjmg_pump_arrange";
List<Map<String,Object>> selectList = new ArrayList();
try {
    selectList = dynamicDataSource.excuteTenantSqlQuery(selectSql, dbCode);
} catch (Exception e) {
    selectList = new ArrayList();
}

data.put("pumpArrange", selectList);

return data;