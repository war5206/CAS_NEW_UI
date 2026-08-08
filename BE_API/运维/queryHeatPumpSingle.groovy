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
import com.sunwayland.platform.dao.impl.PsSqlImpl;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;
import java.math.BigDecimal;
import java.math.RoundingMode;

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

// 调用逻辑编排
FeignSolAlgorithmProcess sol = ApplicationContextProvider.getBean(FeignSolAlgorithmProcess.class);
// 逻辑编排参数
AlgorithmProcessExecuteParam param = new AlgorithmProcessExecuteParam();
param.setAlgorithmProcessId("writeOperationLog");
Map<String, String> paramData = new HashMap();
Map<String, String> paramMap = new HashMap();
paramData.put("data", paramMap);
param.setParam(paramData);

// 结构
String structure = "HeatPump\\";
// 品牌
String brand = "SJMG\\";
// 设备编码
String code = data.get("code").toString();
data.remove("code");

// 去掉NO
String pureCode = code.replace(String.valueOf("No"), "")

// 结构集合
List<Map<String, Object>> structureList = new ArrayList();

Map<String, Object> structureMap1 = new HashMap();
structureMap1.put("longName", "DeviceStatus");
structureMap1.put("name", "通讯状态");
structureMap1.put("unit", "");
structureList.add(structureMap1);

Map<String, Object> structureMap9 = new HashMap();
structureMap9.put("longName", "TotalFault");
structureMap9.put("name", "总故障代码");
structureMap9.put("unit", "");
structureList.add(structureMap9);

Map<String, Object> structureMap10 = new HashMap();
structureMap10.put("longName", "InTemp");
structureMap10.put("name", "进水温度");
structureMap10.put("unit", "℃");
structureList.add(structureMap10);

Map<String, Object> structureMap11 = new HashMap();
structureMap11.put("longName", "OutTemp");
structureMap11.put("name", "出水温度");
structureMap11.put("unit", "℃");
structureList.add(structureMap11);

Map<String, Object> structureMap12 = new HashMap();
structureMap12.put("longName", "AmbTemp");
structureMap12.put("name", "环境温度");
structureMap12.put("unit", "℃");
structureList.add(structureMap12);

Map<String, Object> structureMap13 = new HashMap();
structureMap13.put("longName", "ExhTemp1");
structureMap13.put("name", "排气温度1");
structureMap13.put("unit", "℃");
structureList.add(structureMap13);

Map<String, Object> structureMap14 = new HashMap();
structureMap14.put("longName", "ReturnTemp1");
structureMap14.put("name", "回气温度1");
structureMap14.put("unit", "℃");
structureList.add(structureMap14);

Map<String, Object> structureMap15 = new HashMap();
structureMap15.put("longName", "OutCoTemp1");
structureMap15.put("name", "外盘管温度1");
structureMap15.put("unit", "℃");
structureList.add(structureMap15);

Map<String, Object> structureMap16 = new HashMap();
structureMap16.put("longName", "InCoTemp1");
structureMap16.put("name", "内盘管温度1");
structureMap16.put("unit", "℃");
structureList.add(structureMap16);

Map<String, Object> structureMap17 = new HashMap();
structureMap17.put("longName", "EconInTemp1");
structureMap17.put("name", "经济器进口温度1");
structureMap17.put("unit", "℃");
structureList.add(structureMap17);

Map<String, Object> structureMap18 = new HashMap();
structureMap18.put("longName", "EconOutTemp1");
structureMap18.put("name", "经济器出口温度1");
structureMap18.put("unit", "℃");
structureList.add(structureMap18);

Map<String, Object> structureMap19 = new HashMap();
structureMap19.put("longName", "CompreCur1");
structureMap19.put("name", "压缩机1电流");
structureMap19.put("unit", "A");
structureList.add(structureMap19);

Map<String, Object> structureMap20 = new HashMap();
structureMap20.put("longName", "MainValve1Open");
structureMap20.put("name", "主阀1开度");
structureMap20.put("unit", "");
structureList.add(structureMap20);

Map<String, Object> structureMap44 = new HashMap();
structureMap44.put("longName", "MainValve1Open");
structureMap44.put("name", "主阀1开度");
structureMap44.put("unit", "");
structureList.add(structureMap44);

Map<String, Object> structureMap21 = new HashMap();
structureMap21.put("longName", "AuxValve1Open");
structureMap21.put("name", "辅阀1开度");
structureMap21.put("unit", "");
structureList.add(structureMap21);

Map<String, Object> structureMap22 = new HashMap();
structureMap22.put("longName", "ExhTemp2");
structureMap22.put("name", "排气温度2");
structureMap22.put("unit", "℃");
structureList.add(structureMap22);

Map<String, Object> structureMap23 = new HashMap();
structureMap23.put("longName", "ReturnTemp2");
structureMap23.put("name", "回气温度2");
structureMap23.put("unit", "℃");
structureList.add(structureMap23);

Map<String, Object> structureMap24 = new HashMap();
structureMap24.put("longName", "OutCoTemp2");
structureMap24.put("name", "外盘管温度2");
structureMap24.put("unit", "℃");
structureList.add(structureMap24);

Map<String, Object> structureMap25 = new HashMap();
structureMap25.put("longName", "InCoTemp2");
structureMap25.put("name", "内盘管温度2");
structureMap25.put("unit", "℃");
structureList.add(structureMap25);

Map<String, Object> structureMap26 = new HashMap();
structureMap26.put("longName", "EconInTemp2");
structureMap26.put("name", "经济器进口温度2");
structureMap26.put("unit", "℃");
structureList.add(structureMap26);

Map<String, Object> structureMap27 = new HashMap();
structureMap27.put("longName", "EconOutTemp2");
structureMap27.put("name", "经济器出口温度2");
structureMap27.put("unit", "℃");
structureList.add(structureMap27);

Map<String, Object> structureMap28 = new HashMap();
structureMap28.put("longName", "CompreCur2");
structureMap28.put("name", "压缩机2电流");
structureMap28.put("unit", "A");
structureList.add(structureMap28);

Map<String, Object> structureMap29 = new HashMap();
structureMap29.put("longName", "MainValveOpen2");
structureMap29.put("name", "主阀开度2");
structureMap29.put("unit", "");
structureList.add(structureMap29);

Map<String, Object> structureMap30 = new HashMap();
structureMap30.put("longName", "AuxValveOpen2");
structureMap30.put("name", "辅阀开度2");
structureMap30.put("unit", "");
structureList.add(structureMap30);

Map<String, Object> structureMap31 = new HashMap();
structureMap31.put("longName", "HeatTempSet");
structureMap31.put("name", "采暖设定温度");
structureMap31.put("unit", "℃");
structureList.add(structureMap31);

Map<String, Object> structureMap32 = new HashMap();
structureMap32.put("longName", "CoolTempSet");
structureMap32.put("name", "制冷设定温度");
structureMap32.put("unit", "℃");
structureList.add(structureMap32);

Map<String, Object> structureMap33 = new HashMap();
structureMap33.put("longName", "HeatHystere");
structureMap33.put("name", "采暖回差");
structureMap33.put("unit", "");
structureList.add(structureMap33);

Map<String, Object> structureMap34 = new HashMap();
structureMap34.put("longName", "RefriHystere");
structureMap34.put("name", "制冷回差");
structureMap34.put("unit", "");
structureList.add(structureMap34);

Map<String, Object> structureMap35 = new HashMap();
structureMap35.put("longName", "StartStopControl");
structureMap35.put("name", "启停控制");
structureMap35.put("unit", "");
structureList.add(structureMap35);

Map<String, Object> structureMap36 = new HashMap();
structureMap36.put("longName", "ModeSet");
structureMap36.put("name", "模式设定");
structureMap36.put("unit", "");
structureList.add(structureMap36);

Map<String, Object> structureMap37 = new HashMap();
structureMap37.put("longName", "DeviceControl");
structureMap37.put("name", "设备控制");
structureMap37.put("unit", "");
structureList.add(structureMap37);

Map<String, Object> structureMap38 = new HashMap();
structureMap38.put("longName", "FanControl");
structureMap38.put("name", "风机强制控制");
structureMap38.put("unit", "");
structureList.add(structureMap38);

Map<String, Object> structureMap39 = new HashMap();
structureMap39.put("longName", "RunTimeHour1");
structureMap39.put("name", "热泵累积运行时长");
structureMap39.put("unit", "h");
structureList.add(structureMap39);

Map<String, Object> structureMap40 = new HashMap();
structureMap40.put("longName", "Sort");
structureMap40.put("name", "热泵排序");
structureMap40.put("unit", "");
structureList.add(structureMap40);

Map<String, Object> structureMap41 = new HashMap();
structureMap41.put("longName", "RunTimeHour2");
structureMap41.put("name", "热泵持续运行时长");
structureMap41.put("unit", "h");
structureList.add(structureMap41);

Map<String, Object> structureMap42 = new HashMap();
structureMap42.put("longName", "Number1");
structureMap42.put("name", "控制器开/关机次数");
structureMap42.put("unit", "");
structureList.add(structureMap42);

Map<String, Object> structureMap43 = new HashMap();
structureMap43.put("longName", "Number2");
structureMap43.put("name", "化霜次数");
structureMap43.put("unit", "");
structureList.add(structureMap43);

// 热泵信息集合
List<Map<String, String>> heatPumpDataList = new ArrayList<>();

for (Map<String, Object> structureMap : structureList) {
    Map<String, Object> heatPumpDataMap = new HashMap();
    
    String name = structureMap.get("name");
    heatPumpDataMap.put("name", name);

    String longName = structureMap.get("longName");
    

    String unit = structureMap.get("unit");
    heatPumpDataMap.put("unit", unit);

    String tagLongName=structure+brand+code+"\\"+longName;
    heatPumpDataMap.put("longName", tagLongName);

    String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + tagLongName + "')";
 
    DataTable dt = dataService.queryListDataBySql(pointSql);
    if (dt.getRows().size() == 1) {
        for(int c = 0; c < dt.getColumns().size(); c++){
            if(dt.getColumns().get(c).getColumnName() == "realval"){
                if (longName.contains("Status")||longName.contains("State")||longName.contains("Control")) {
                    if (dt.getValue(0,c).equals("0")) {
                        heatPumpDataMap.put("value", "关闭");
                    } else if (dt.getValue(0,c).equals("1")) {
                        heatPumpDataMap.put("value", "开启");
                    } else {
                        heatPumpDataMap.put("value", "异常");
                    }
                }else{
                     heatPumpDataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP) +" "+unit);
                }
            }
        }
    } else {
        heatPumpDataMap.put("value", "异常");
    }
    heatPumpDataList.add(heatPumpDataMap);
}

data.put("heatPumpData", heatPumpDataList);

return data;