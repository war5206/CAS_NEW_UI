/* 注意!以下包无需导入 默认可以使用
 *java.io.*
 *java.lang.*
 *java.math.BigDecimal*
 *java.math.BigInteger
 *java.net.*
 *java.util.*
 * 下面的data为全局变量数据类型为HashMap<String,Object> 其中key： result、exception 已经被系统默认使用, 其他全局变量还有request、response 以及特殊变量limit、page 
 */
import cn.hutool.core.codec.Base64;
import com.alibaba.fastjson.JSON;
import com.sunwayland.algorithm.feign.FeignSolAlgorithmProcess;
import com.sunwayland.algorithm.pojo.AlgorithmProcessExecuteParam
import com.sunwayland.common.core.constant.PlatformConst;
import com.sunwayland.common.core.pojo.PtUser;
import com.sunwayland.common.core.utils.ThreadLocalUtil;
import com.sunwayland.platform.biz.algorithm.utils.ApplicationContextProvider;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.dao.impl.PsSqlImpl;
import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

import java.math.BigDecimal;
import java.math.RoundingMode;

def dataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
def dataService = ApplicationContextProvider.getBean(DataService.class);
// 登录用户信息
PtUser ptUser = ThreadLocalUtil.getCurrentUser();
String userUuid = ptUser.userUuid;
String niceName = ptUser.niceName;
String dbCode = ptUser.dbCode;
if(dbCode.equals("base")){
    dbCode = "t01";
}
// 调用逻辑编排
FeignSolAlgorithmProcess sol = ApplicationContextProvider.getBean(FeignSolAlgorithmProcess.class);
// 逻辑编排参数
AlgorithmProcessExecuteParam param = new AlgorithmProcessExecuteParam();
Map<String, Object> paramMap = new HashMap();
param.setAlgorithmProcessId("writeRealvalByLongNames");
Map<String, Object> paramData = new HashMap();

String indoorTemperatureCntSql="select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('Sys\\FinforWorx\\WDGS')";
DataTable indoorTemperatureCntDt = dataService.queryListDataBySql(indoorTemperatureCntSql);
int indoorTemperatureCnt = 0;
if(indoorTemperatureCntDt.getRows().size() == 1){
    for(int c = 0; c < indoorTemperatureCntDt.getColumns().size(); c++){
        if(indoorTemperatureCntDt.getColumns().get(c).getColumnName() == "realval"){
            indoorTemperatureCnt=Integer.parseInt(indoorTemperatureCntDt.getValue(0,c));
        }
    }
}

LocalDate currentDate = LocalDate.now();
LocalDate oneDaysAgo = currentDate.minusDays(1);
LocalDate threeDaysAgo = currentDate.minusDays(3);
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
String oneDaysAgoDate = oneDaysAgo.format(formatter);
String threeDaysAgoDate = threeDaysAgo.format(formatter);

BigDecimal temperatureOne = new BigDecimal("0");
BigDecimal temperatureThree = new BigDecimal("0");
BigDecimal temperatureOneAvgDou = new BigDecimal("0");
BigDecimal temperatureThreeAvgDou = new BigDecimal("0");
int temperatureOneCnt = 0;
int temperatureThreeCnt = 0;
if (indoorTemperatureCnt > 0) {
    for (int i=1; i<=indoorTemperatureCnt; i++) {
    
        String indoorTemperatureLongName="Sys\\FinforWorx\\WD"+i;
        
        String indoorTemperatureOneSql = "select a.taglongname,psavg(a.hisval) as hisval, a.times from pshisdata as a where a.taglongname = '"+indoorTemperatureLongName+"' and a.starttime ='"+oneDaysAgoDate+" 00:00:00' and a.endtime = '"+oneDaysAgoDate+" 23:59:59' group by a.taglongname";
        String indoorTemperatureThreeSql="select a.taglongname,psavg(a.hisval) as hisval, a.times from pshisdata as a where a.taglongname = '"+indoorTemperatureLongName+"' and a.starttime ='"+threeDaysAgoDate+" 00:00:00' and a.endtime = '"+oneDaysAgoDate+" 23:59:59' group by a.taglongname";

        // data.put("one",indoorTemperatureOneSql);
        // data.put("Three",indoorTemperatureThreeSql);

        DataTable indoorTemperatureOneDt = dataService.queryListDataBySql(indoorTemperatureOneSql);
        DataTable indoorTemperatureThreeDt = dataService.queryListDataBySql(indoorTemperatureThreeSql);
    
        try{
            
            if(indoorTemperatureOneDt.getRows().size() == 1){
                for(int c = 0; c < indoorTemperatureOneDt.getColumns().size(); c++){
                    if(indoorTemperatureOneDt.getColumns().get(c).getColumnName().equals("hisval")){
                        BigDecimal formattedNumberOne = new BigDecimal(indoorTemperatureOneDt.getValue(0,c)).setScale(2, RoundingMode.HALF_UP);
                        if(formattedNumberOne.compareTo(new BigDecimal("5"))>0){
                            temperatureOne = temperatureOne.add(formattedNumberOne);
                            temperatureOneCnt++;
                        }
                    }
                }
            } 
            else {
                temperatureOne = temperatureOne.add(new BigDecimal("0"));
            }
            if(indoorTemperatureThreeDt.getRows().size() == 1){
                for(int c = 0; c < indoorTemperatureThreeDt.getColumns().size(); c++){
                    if(indoorTemperatureThreeDt.getColumns().get(c).getColumnName() == "hisval"){
                        BigDecimal formattedNumberThree = new BigDecimal(indoorTemperatureThreeDt.getValue(0,c)).setScale(2, RoundingMode.HALF_UP);
                        if(formattedNumberThree.compareTo(new BigDecimal("5"))>0){
                            temperatureThree = temperatureThree.add(formattedNumberThree);
                            temperatureThreeCnt++;
                        }
                        
                    }
                }
            } 
            else {
                temperatureThree = temperatureThree.add(new BigDecimal("0"));
            }
        }catch(error){
            temperatureOne = temperatureOne.add(new BigDecimal("0"));
            temperatureThree = temperatureThree.add(new BigDecimal("0"));
        }
    }
    try {
        temperatureOneAvgDou = temperatureOne.divide(new BigDecimal(temperatureOneCnt), 2, RoundingMode.HALF_UP);//String.format("%.2f",temperatureOne/temperatureOneCnt);
        temperatureThreeAvgDou = temperatureThree.divide(new BigDecimal(temperatureThreeCnt), 2, RoundingMode.HALF_UP);//String.format("%.2f",temperatureThree/temperatureThreeCnt);
    } catch(error) {
        temperatureOneAvgDou=new BigDecimal("18");
        temperatureThreeAvgDou=new BigDecimal("18");
    }
}

Map<String,String> writeData = new HashMap<>();
//1/3天室内温度平均值
writeData.put("Sys\\FinforWorx\\WDPJZ1",temperatureOneAvgDou);
writeData.put("Sys\\FinforWorx\\WDPJZ3",temperatureThreeAvgDou);
// 执行下置业务编排
paramMap.put("writeData", JSON.toJSONString(writeData));
paramData.put("data", paramMap);
param.setParam(paramData);
Map<String, Object> solResultMap = (Map<String, Object>) sol.execute(param);

// data.put("temperatureOne", temperatureOne);
// data.put("temperatureThree", temperatureThree);
data.put("WDPJZ1", temperatureOneAvgDou);
data.put("WDPJZ3", temperatureThreeAvgDou);

return data;