/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
 */

import com.alibaba.fastjson.JSON;
import com.sunwayland.algorithm.feign.FeignSolAlgorithmProcess;
import com.sunwayland.algorithm.pojo.AlgorithmProcessExecuteParam
import com.sunwayland.common.core.constant.PlatformConst;
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dao.data.DataRow;
import com.sunwayland.platform.dao.impl.PsSqlImpl;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;

import java.math.BigDecimal;
import java.math.RoundingMode;

def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);

// 开始时间
String start_time = data.get("start_time");
data.remove("start_time");
// 结束时间
String end_time = data.get("end_time");
data.remove("end_time");

Map<String, String> longNameMap = new LinkedHashMap<>();
longNameMap.put("Sys\\FinforWorx\\BackwaterTemperature", "实际回水温度");
longNameMap.put("Sys\\FinforWorx\\TargetBackwaterTemperature", "目标回水温度");
longNameMap.put("Sys\\FinforWorx\\AmbientTemperature1", "室外温度");

List<Map<String, Object>> valueList = new ArrayList<>();

boolean isFirst = true;
for (String longName : longNameMap.keySet()) {
    // 查询历史数据
    String pointSql = "SELECT a.taglongname,a.times,a.hisval FROM pshisareaintedata AS a WHERE a.taglongname IN ('" + longName + "') AND " +
    "a.starttime ='" + start_time + "' AND a.endtime = '" + end_time + "' AND a.distime = 3600";
    DataTable dt = dataService.queryListDataBySql(pointSql);

    for (int i = 0; i < dt.getRows().size(); i++){
        DataRow dataRow = dt.getDataRow(i);

        Map<String, Object> valueMap;
        if (isFirst) {
            valueMap = new LinkedHashMap<>();
            valueList.add(valueMap);
        } else {
            valueMap = valueList.get(i);
        }

        for(int c = 0; c < dataRow.getColumns().size(); c++){
            if (dataRow.getColumns().get(c).getColumnName() == "hisval") {
                BigDecimal valueBD = new BigDecimal(dataRow.getValue(c).toString()).setScale(1, RoundingMode.HALF_UP);
                valueMap.put(longNameMap.get(longName), valueBD);
            } else if (dataRow.getColumns().get(c).getColumnName() == "times" && isFirst) {
                String dateTime = dataRow.getValue(c).toString();
                dateTime = dateTime.split(" ")[1].split(":")[0];
                valueMap.put("product", dateTime);
            }
        }
    }

    isFirst = false;
}

data.put("list", valueList);

return data;