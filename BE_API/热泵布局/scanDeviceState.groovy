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

SnowFlake creatId = new SnowFlake();

boolean isReset;
if (data.containsKey("type")) {
    String type = data.get("type");
    data.remove("type");
    if (type.equals("reset")) {
        isReset = true;
    } else {
        isReset = false;
    }
} else {
    isReset = false;
}

// 查询热泵数量
String selectHeatPumpSql = "SELECT heat_pump FROM sjmg_project_data";
int heatPump;
try {
    List<Map<String,Object>> selectHeatPumpList = dynamicDataSource.excuteTenantSqlQuery(selectHeatPumpSql, dbCode);
    if (selectHeatPumpList.size() == 1) {
        heatPump = Integer.parseInt(selectHeatPumpList.get(0).get("heat_pump").toString());
    } else {
        heatPump = 0;
    }
} catch (Exception e) {
    heatPump = 0;
}

// 查询风冷模块台数（耦合能源 name=风冷模块）
int airCooledModule = 0;
String coupleEnergyName = "";
String coupleEnergyNumber = "0";
String selectCoupleEnergySql = "SELECT cet.couple_energy_name, cer.couple_energy_number FROM sjmg_couple_energy_relation AS cer " +
    "LEFT JOIN sjmg_couple_energy_type AS cet ON cer.couple_energy_type_uuid = cet.id LIMIT 1";
try {
    List<Map<String,Object>> selectCoupleEnergyList = dynamicDataSource.excuteTenantSqlQuery(selectCoupleEnergySql, dbCode);
    if (selectCoupleEnergyList.size() >= 1) {
        if (selectCoupleEnergyList.get(0).get("couple_energy_name") != null) {
            coupleEnergyName = selectCoupleEnergyList.get(0).get("couple_energy_name").toString();
        }
        if (selectCoupleEnergyList.get(0).get("couple_energy_number") != null) {
            coupleEnergyNumber = selectCoupleEnergyList.get(0).get("couple_energy_number").toString();
        }
        if (coupleEnergyName.equals("风冷模块")) {
            airCooledModule = Integer.parseInt(coupleEnergyNumber);
        }
    }
} catch (Exception e) {
    airCooledModule = 0;
}

// 查询已布局过的热泵
String selectHeatPumpArrangeSql = "SELECT device_uuid FROM sjmg_pump_arrange";
List<Map<String,Object>> selectHeatPumpArrangeList;
try {
    selectHeatPumpArrangeList = dynamicDataSource.excuteTenantSqlQuery(selectHeatPumpArrangeSql, dbCode);
} catch (Exception e) {
    selectHeatPumpArrangeList = new ArrayList();
}

// 结构
String structure = "HeatPump\\";
// 品牌
String brand = "SJMG";
// 设备在线状态点
String onlineStatus = "\\DeviceStatus";
// 风机开关状态点 StartStopControl
String switchStatus = "\\FanControl";
// 查询实时数据
List<Map<String,String>> deviceList = new ArrayList<>();
for (int i = 0; i < heatPump; i++) {
    Map<String,String> deviceMap = new HashMap();
    String deviceCode = "No" + ( i + 1 );
    for (int j = 0; j < 2; j++) {
        String longName = structure + brand + "\\" + deviceCode;
        if (j == 0) {
            longName += onlineStatus;
        } else {
            longName += switchStatus;
        }
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if(dt.getRows().size() == 1){
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (j == 0) {
                        if (dt.getValue(0,c).equals("1")) {
                            if (isReset) {
                                deviceMap.put("id", creatId.nextId());
                                deviceMap.put("brand", brand);
                                deviceMap.put("code", deviceCode);
                                deviceList.add(deviceMap);
                            } else {
                                boolean isNew = true;

                                for (Map<String,Object> selectHeatPumpArrangeMap : selectHeatPumpArrangeList) {
                                    if (deviceCode.equals(selectHeatPumpArrangeMap.get("device_uuid").toString())) {
                                        isNew = false;
                                        break;
                                    }
                                }

                                if (isNew) {
                                    deviceMap.put("id", creatId.nextId());
                                    deviceMap.put("brand", brand);
                                    deviceMap.put("code", deviceCode);
                                    deviceList.add(deviceMap);
                                }
                            }
                        } 
                        // else {
                        //     deviceMap.put("id", creatId.nextId());
                        //     deviceMap.put("brand", brand);
                        //     deviceMap.put("code", deviceCode);
                        //     deviceList.add(deviceMap);
                        // }
                    } else {
                        deviceMap.put("longName", longName);
                        if (dt.getValue(0,c).equals("1")) {
                            deviceMap.put("state", "1");
                        } else {
                            deviceMap.put("state", "0");
                        }
                    } 
                }
            }
        }
        // else {
        //     if (j == 0) {
        //         deviceMap.put("id", creatId.nextId());
        //         deviceMap.put("brand", brand);
        //         deviceMap.put("code", deviceCode);
        //         deviceList.add(deviceMap);
        //     } else {
        //         deviceMap.put("longName", longName);
        //         deviceMap.put("state", "0");
        //     } 
        // }
    }
}
for (int i = 0; i < airCooledModule; i++) {
    Map<String,String> deviceMap = new HashMap();
    String deviceCode = "No" + ( 31 + i );
    for (int j = 0; j < 2; j++) {
        String longName = structure + brand + "\\" + deviceCode;
        if (j == 0) {
            longName += onlineStatus;
        } else {
            longName += switchStatus;
        }
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if(dt.getRows().size() == 1){
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (j == 0) {
                        if (dt.getValue(0,c).equals("1")) {
                            if (isReset) {
                                deviceMap.put("id", creatId.nextId());
                                deviceMap.put("brand", brand);
                                deviceMap.put("code", deviceCode);
                                deviceList.add(deviceMap);
                            } else {
                                boolean isNew = true;

                                for (Map<String,Object> selectHeatPumpArrangeMap : selectHeatPumpArrangeList) {
                                    if (deviceCode.equals(selectHeatPumpArrangeMap.get("device_uuid").toString())) {
                                        isNew = false;
                                        break;
                                    }
                                }

                                if (isNew) {
                                    deviceMap.put("id", creatId.nextId());
                                    deviceMap.put("brand", brand);
                                    deviceMap.put("code", deviceCode);
                                    deviceList.add(deviceMap);
                                }
                            }
                        } 
                        // else {
                        //     deviceMap.put("id", creatId.nextId());
                        //     deviceMap.put("brand", brand);
                        //     deviceMap.put("code", deviceCode);
                        //     deviceList.add(deviceMap);
                        // }
                    } else {
                        deviceMap.put("longName", longName);
                        if (dt.getValue(0,c).equals("1")) {
                            deviceMap.put("state", "1");
                        } else {
                            deviceMap.put("state", "0");
                        }
                    } 
                }
            }
        }
        // else {
        //     if (j == 0) {
        //         deviceMap.put("id", creatId.nextId());
        //         deviceMap.put("brand", brand);
        //         deviceMap.put("code", deviceCode);
        //         deviceList.add(deviceMap);
        //     } else {
        //         deviceMap.put("longName", longName);
        //         deviceMap.put("state", "0");
        //     } 
        // }
    }
}
data.put("isReset", isReset);
data.put("heatPump", heatPump);
data.put("airCooledModule", airCooledModule);
data.put("coupleEnergyName", coupleEnergyName);
data.put("coupleEnergyNumber", coupleEnergyNumber);
data.put("arrangedCount", selectHeatPumpArrangeList.size());
data.put("totalUnits", heatPump + airCooledModule);
data.put("device", deviceList);
data.put("deviceCount", deviceList.size());

return data;