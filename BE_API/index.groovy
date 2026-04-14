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

SnowFlake creatId = new SnowFlake();

int scale = 1;

// 获取热泵总台数
String selectTotalHeatPumpSql = "SELECT heat_pump FROM sjmg_project_data";
int totalHPCount = 0;
try {
    List<Map<String,Object>> selectHPDataList = dynamicDataSource.excuteTenantSqlQuery(selectTotalHeatPumpSql, dbCode);
    if (selectHPDataList.size() == 1) {
        try {
            totalHPCount = Integer.parseInt(selectHPDataList.get(0).get("heat_pump").toString());
        } catch (Exception e) {
            totalHPCount = new BigDecimal("0");
        }
    }
} catch (Exception e) {
    totalHPCount = 0;
}

// 查询热泵信息
String selectHeatPumpSql = "SELECT device_uuid,arrange_code FROM sjmg_pump_arrange ORDER BY arrange_code";
List<Map<String,Object>> selectHeatPumpList;
try {
    selectHeatPumpList = dynamicDataSource.excuteTenantSqlQuery(selectHeatPumpSql, dbCode);
} catch (Exception e) {
    selectHeatPumpList = new ArrayList<>();
}

String onlineHeatPump = "0";
String onlinePointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\HPYXTS')";
DataTable onlinedt = dataService.queryListDataBySql(onlinePointSql);
if(onlinedt.getRows().size() == 1){
    for(int c = 0; c < onlinedt.getColumns().size(); c++){
        if(onlinedt.getColumns().get(c).getColumnName() == "realval"){
            try {
                onlineHeatPump = onlinedt.getValue(0,c).toString();
            } catch (Exception e) {
                onlineHeatPump = "0";
            }
        }
    }
}

def getPointRealVal = { String taglongname ->
    String realVal = "";
    String querySql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('" + taglongname + "')";
    DataTable pointDt = dataService.queryListDataBySql(querySql);
    if(pointDt.getRows().size() == 1){
        for(int c = 0; c < pointDt.getColumns().size(); c++){
            if(pointDt.getColumns().get(c).getColumnName() == "realval"){
                try {
                    realVal = pointDt.getValue(0,c).toString().trim();
                } catch (Exception e) {
                    realVal = "";
                }
            }
        }
    }
    return realVal;
};

def isPointValue = { String pointValue, int targetValue ->
    if (pointValue == null || pointValue == "") {
        return false;
    }
    if (pointValue == targetValue.toString()) {
        return true;
    }
    try {
        return new BigDecimal(pointValue).compareTo(new BigDecimal(targetValue.toString())) == 0;
    } catch (Exception e) {
        return false;
    }
};

int offlineHeatPump = 0;
int alarmHeatPump = 0;
int defrostHeatPump = 0;
for (Map<String,Object> selectHeatPumpMap : selectHeatPumpList) {
    String heatPumpCode = selectHeatPumpMap.get("device_uuid");
    String compCur1 = getPointRealVal("HeatPump\\SJMG\\" + heatPumpCode + "\\CompreCur1");
    String compCur2 = getPointRealVal("HeatPump\\SJMG\\" + heatPumpCode + "\\CompreCur2");
    String faultState = getPointRealVal("HeatPump\\SJMG\\" + heatPumpCode + "\\RunState1_3");
    String deviceStatus = getPointRealVal("HeatPump\\SJMG\\" + heatPumpCode + "\\DeviceStatus");
    String defrostState = getPointRealVal("HeatPump\\SJMG\\" + heatPumpCode + "\\RunState1_8");

    // 待机: 电流1=0 且 电流2=0 且 故障=0 且 通讯=1
    if (isPointValue(compCur1, 0) && isPointValue(compCur2, 0) && isPointValue(faultState, 0) && isPointValue(deviceStatus, 1)) {
        offlineHeatPump++;
    }

    // 故障: 故障=1 或 通讯=0
    if (isPointValue(faultState, 1) || isPointValue(deviceStatus, 0)) {
        alarmHeatPump++;
    }

    // 化霜: 化霜点位=1
    if (isPointValue(defrostState, 1)) {
        defrostHeatPump++;
    }
}

data.put("onlineHeatPump", onlineHeatPump);
data.put("offlineHeatPump", offlineHeatPump);
data.put("alarmHeatPump", alarmHeatPump);
data.put("defrostHeatPump", defrostHeatPump);

String pointSql;
DataTable dt;

// 查询泄压阀
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('PressureReliefValvePump\\SJMG\\No1\\Status')";
dt = dataService.queryListDataBySql(pointSql);
int pressureReliefValve = 0;
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            if (dt.getValue(0,c).equals("1")) {
                pressureReliefValve = 1;
            } else {
                pressureReliefValve = 0;
            }
        }
    }
} else {
    pressureReliefValve = 0;
}
data.put("pressureReliefValve", pressureReliefValve);

// 查询伴热带
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('TropicalPump\\SJMG\\No1\\Status')";
dt = dataService.queryListDataBySql(pointSql);
int tropicalCompanion = 0;
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            if (dt.getValue(0,c).equals("1")) {
                tropicalCompanion = 1;
            } else {
                tropicalCompanion = 0;
            }
        }
    }
} else {
    tropicalCompanion = 0;
}
data.put("tropicalCompanion", tropicalCompanion);

// 查询冷凝水管道温度 
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\CondensatePipeTemperature')";
dt = dataService.queryListDataBySql(pointSql);
BigDecimal condensateWaterTemperature = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                condensateWaterTemperature = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
            } catch (Exception e) {
                condensateWaterTemperature = new BigDecimal("-100");
            }
        }
    }
}

if (condensateWaterTemperature.compareTo(new BigDecimal("-100")) == 0) {
    data.put("condensateWaterTemperature", "");
} else {
    data.put("condensateWaterTemperature", condensateWaterTemperature);
}

// 查询环境温度
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\AmbientTemperature1')";
dt = dataService.queryListDataBySql(pointSql);
BigDecimal ambientTemperature = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                ambientTemperature = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
            } catch (Exception e) {
                ambientTemperature = new BigDecimal("-100");
            }
        }
    }
}

if (ambientTemperature.compareTo(new BigDecimal("-100")) == 0) {
    data.put("ambientTemperature", "");
} else {
    data.put("ambientTemperature", ambientTemperature);
}

// 查询热泵循环泵
String selectProjectDataHeatSql = "SELECT heat_circulation_pump_main,heat_circulation_pump_spare FROM sjmg_project_data";
int heatCirculationPumpMain = 0;
int heatCirculationPumpSpare = 0;
try {
    List<Map<String,Object>> selectProjectDataList = dynamicDataSource.excuteTenantSqlQuery(selectProjectDataHeatSql, dbCode);
    if (selectProjectDataList.size() == 1) {
        try {
            heatCirculationPumpMain = Integer.parseInt(selectProjectDataList.get(0).get("heat_circulation_pump_main").toString());
        } catch (Exception e) {
            heatCirculationPumpMain = new BigDecimal("0");
        }

        try {
            heatCirculationPumpSpare = Integer.parseInt(selectProjectDataList.get(0).get("heat_circulation_pump_spare").toString());
        } catch (Exception e) {
            condensateWaterTemperature = new BigDecimal("0");
        }
    }
} catch (Exception e) {
    heatCirculationPumpMain = 0;
    heatCirculationPumpSpare = 0;
}
int heatCirculationPump = heatCirculationPumpMain + heatCirculationPumpSpare;

int onlineHeatCirculationPump = 0;
int offlineHeatCirculationPump = 0;
int alarmHeatCirculationPump = 0;

List<Map<String, String>> heatCirculationPumpList = new ArrayList<>();
for (int i = 0; i < heatCirculationPump; i++) {
    Map<String, String> heatCirculationPumpPumpMap = new HashMap<>();
    heatCirculationPumpPumpMap.put("name", "水泵" + (i + 1));

    String state;
    // 查询热泵循环泵在线
    pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a " + 
    "WHERE a.taglongname IN ('HotWaterPump\\SJMG\\No" + (i + 1) + "\\RunState')";
    dt = dataService.queryListDataBySql(pointSql);
    if(dt.getRows().size() == 1){
        for(int c = 0; c < dt.getColumns().size(); c++){
            if(dt.getColumns().get(c).getColumnName() == "realval"){
                if (dt.getValue(0,c).equals("1")) {
                    onlineHeatCirculationPump++;
                    state = "运行";
                } else {
                    offlineHeatCirculationPump++;
                    state = "待机";
                }
            }
        }
    } else {
        offlineHeatCirculationPump++;
        state = "待机";
    }

    // 查询热泵循环泵报警
    pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a " + 
    "WHERE a.taglongname IN ('HotWaterPump\\SJMG\\No" + (i + 1) + "\\FaultState')";
    dt = dataService.queryListDataBySql(pointSql);
    if(dt.getRows().size() == 1){
        for(int c = 0; c < dt.getColumns().size(); c++){
            if(dt.getColumns().get(c).getColumnName() == "realval"){
                if (dt.getValue(0,c).equals("1")) {
                    alarmHeatCirculationPump++;
                    state = "报警";
                }
            }
        }
    }

    heatCirculationPumpPumpMap.put("state", state);
    heatCirculationPumpList.add(heatCirculationPumpPumpMap);
}
data.put("onlineHeatCirculationPump", onlineHeatCirculationPump);
data.put("offlineHeatCirculationPump", offlineHeatCirculationPump);
data.put("alarmHeatCirculationPump", alarmHeatCirculationPump);

data.put("heatCirculationPump", heatCirculationPumpList);

// 查询回水总管压力
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\BackwaterPressure')";
dt = dataService.queryListDataBySql(pointSql);
BigDecimal backWaterPressure = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                backWaterPressure = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
            } catch (Exception e) {
                backWaterPressure = new BigDecimal("-100");
            }
        }
    }
}

if (backWaterPressure.compareTo(new BigDecimal("-100")) == 0) {
    data.put("backWaterPressure", "");
} else {
    data.put("backWaterPressure", backWaterPressure);
}

// 查询除污器
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('SewageValvePump\\SJMG\\No1\\Status')";
dt = dataService.queryListDataBySql(pointSql);
int dirtSeparator = 0;
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            if (dt.getValue(0,c).equals("1")) {
                dirtSeparator = 1;
            } else {
                dirtSeparator = 0;
            }
        }
    }
} else {
    dirtSeparator = "关闭";
}
data.put("dirtSeparator", dirtSeparator);

// 查询定压补水泵
for (int i = 0; i < 2; i++) {
    pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('ConstantPressurePump\\SJMG\\No" + (i + 1) + "\\Status')";
    dt = dataService.queryListDataBySql(pointSql);
    String replenishWaterPump;
    if(dt.getRows().size() == 1){
        for(int c = 0; c < dt.getColumns().size(); c++){
            if(dt.getColumns().get(c).getColumnName() == "realval"){
                if (dt.getValue(0,c).equals("1")) {
                    replenishWaterPump = "开启";
                } else {
                    replenishWaterPump = "待机";
                }
            }
        }
    } else {
        replenishWaterPump = "待机";
    }
    data.put("replenishWaterPump" + (i + 1), replenishWaterPump);
}

// 查询软化水箱
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\WaterLevel')";
dt = dataService.queryListDataBySql(pointSql);
BigDecimal softenWaterTank = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                softenWaterTank = new BigDecimal(dt.getValue(0,c).toString()).divide(new BigDecimal("1.5"), scale + 2, RoundingMode.HALF_UP)
                .multiply(new BigDecimal("100"));
            } catch (Exception e) {
                softenWaterTank = new BigDecimal("-100");
            }
        }
    }
}
data.put("softenWaterTank", softenWaterTank);

// 查询耦合能源
String selectCoupleEnergySql = "SELECT cet.couple_energy_code,cet.couple_energy_name,cer.couple_energy_number FROM sjmg_couple_energy_relation AS cer " + 
"LEFT JOIN sjmg_couple_energy_type AS cet ON cer.couple_energy_type_uuid = cet.id";

String coupleEnergyName;
try {
    List<Map<String,Object>> selectCoupleEnergyList = dynamicDataSource.excuteTenantSqlQuery(selectCoupleEnergySql, dbCode);

    if (selectCoupleEnergyList.size() == 1) {
        coupleEnergyName = selectCoupleEnergyList.get(0).get("couple_energy_name").toString();
    } else {
        coupleEnergyName = "无耦合能源";
    }
} catch (Exception e) {
    coupleEnergyName = "无耦合能源";
}
data.put("coupleEnergyName", coupleEnergyName);

pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\OHNY')";
dt = dataService.queryListDataBySql(pointSql);
int coupleEnergy = 0;
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            if (dt.getValue(0,c).equals("1")) {
                coupleEnergy = 1;
            } else {
                coupleEnergy = 0;
            }
        }
    }
} else {
    coupleEnergy = 0;
}
data.put("coupleEnergy", coupleEnergy);

// 查询供水总管压力
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\WaterSupplyPressure')";
dt = dataService.queryListDataBySql(pointSql);
BigDecimal supplyWaterPressure = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                supplyWaterPressure = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
            } catch (Exception e) {
                supplyWaterPressure = new BigDecimal("-100");
            }
        }
    }
}

if (supplyWaterPressure.compareTo(new BigDecimal("-100")) == 0) {
    data.put("supplyWaterPressure", "");
} else {
    data.put("supplyWaterPressure", supplyWaterPressure);
}

// 查询用户侧总供水温度
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\UserWaterSupplyTemperature')";
dt = dataService.queryListDataBySql(pointSql);
BigDecimal userSupplyWaterTemperature = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                userSupplyWaterTemperature = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
            } catch (Exception e) {
                userSupplyWaterTemperature = new BigDecimal("-100");
            }
        }
    }
}

if (userSupplyWaterTemperature.compareTo(new BigDecimal("-100")) == 0) {
    data.put("userSupplyWaterTemperature", "");
} else {
    data.put("userSupplyWaterTemperature", userSupplyWaterTemperature);
}

// 查询用户侧总回水温度
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\BackwaterTemperature')";
dt = dataService.queryListDataBySql(pointSql);
BigDecimal userBackWaterTemperature = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                userBackWaterTemperature = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
            } catch (Exception e) {
                userBackWaterTemperature = new BigDecimal("-100");
            }
        }
    }
}

if (userBackWaterTemperature.compareTo(new BigDecimal("-100")) == 0) {
    data.put("userBackWaterTemperature", "");
} else {
    data.put("userBackWaterTemperature", userBackWaterTemperature);
}

// 查询末端温度个数 
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\WDGS')";
dt = dataService.queryListDataBySql(pointSql);
int terminalTemperatureNumber = 0;
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                terminalTemperatureNumber = Integer.parseInt(dt.getValue(0,c).toString());
            } catch (Exception e) {
                terminalTemperatureNumber = new BigDecimal("0");
            }
        }
    }
}

// 查询末端温度
List<Map<String, Object>> terminalTemperatureList = new ArrayList<>();
for (int i = 0; i < 5; i++) {
    pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\WD" + (i + 1) + "')";
    dt = dataService.queryListDataBySql(pointSql);

    BigDecimal terminalTemperature = new BigDecimal("-100");
    if(dt.getRows().size() == 1){
        for(int c = 0; c < dt.getColumns().size(); c++){
            if(dt.getColumns().get(c).getColumnName() == "realval"){
                try {
                    terminalTemperature = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
                } catch (Exception e) {
                    terminalTemperature = new BigDecimal("-100");
                }
            }
        }
    } else {
        terminalTemperature = new BigDecimal("-100");
    }

    if (terminalTemperature.compareTo(new BigDecimal("-100")) == 0) {
        terminalTemperatureList = new ArrayList<>();
        break;
    } else {
        Map<String, Object> terminalTemperatureMap = new HashMap<>();
        terminalTemperatureMap.put("name", "室内温度" + (i + 1));
        terminalTemperatureMap.put("value", terminalTemperature);
        terminalTemperatureList.add(terminalTemperatureMap);
    }               
}

if (terminalTemperatureList.size() > 5) {
    BigDecimal allTerminalTemperature = new BigDecimal("0");

    for (Map<String, String> terminalTemperatureMap : terminalTemperatureList) {
        try {
            allTerminalTemperature = allTerminalTemperature.add(new BigDecimal(terminalTemperatureMap.get("value").toString()));
        } catch (Exception e) {
            allTerminalTemperature = allTerminalTemperature;
        }
    }

    List<Map<String, String>> terminalTemperatureAverageList = new ArrayList<>();
    Map<String, String> terminalTemperatureAverageMap = new HashMap<>();
    terminalTemperatureAverageMap.put("name", "平均室内温度");

    BigDecimal avgTerminalTemperature;
    try {
        avgTerminalTemperature = allTerminalTemperature.divide(new BigDecimal(terminalTemperatureList.size()), scale, RoundingMode.HALF_UP);
    } catch (Exception e) {
        avgTerminalTemperature = new BigDecimal("0");
    }
    terminalTemperatureAverageMap.put("value", avgTerminalTemperature);
    terminalTemperatureAverageList.add(terminalTemperatureAverageMap);

    data.put("terminalTemperature", terminalTemperatureAverageList);
} else {
    for (Map<String, Object> terminalTemperatureMap : terminalTemperatureList) {
        String valueString = terminalTemperatureMap.get("value").toString();
        if (!valueString.contains(".")) {
            valueString = valueString + ".";
            for (int i = 0; i < scale; i++) {
                valueString = valueString + "0";
            }
        }
        terminalTemperatureMap.put("value", valueString);
    }
    data.put("terminalTemperature", terminalTemperatureList);
}

// 查询自选区
Map<String, Object> optionalMap = new HashMap<>();

// 系统开关机
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\SystemStatus')";
dt = dataService.queryListDataBySql(pointSql);
int stateOnOff = 0;
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                stateOnOff = Integer.parseInt(dt.getValue(0,c).toString());
            } catch (Exception e) {
                stateOnOff = 0;
            }
        }
    }
}
optionalMap.put("stateOnOff", stateOnOff);
optionalMap.put("longNameOnOff", "Sys\\FinforWorx\\SystemStatus");

// 热泵总运行模式
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\HPTotalRunMode')";
dt = dataService.queryListDataBySql(pointSql);
String hpTotalRunMode = "";
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                String value = dt.getValue(0,c).toString();
                if (value.equals("0") || value.equals("1")) {
                    hpTotalRunMode = value;
                } else {
                    hpTotalRunMode = "";
                }
            } catch (Exception e) {
                hpTotalRunMode = "";
            }
        }
    }
}
optionalMap.put("hpTotalRunMode", hpTotalRunMode);
optionalMap.put("longNameHPTotalRunMode", "Sys\\FinforWorx\\HPTotalRunMode");

// 气候补偿
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\QHBC')";
dt = dataService.queryListDataBySql(pointSql);
String QHBC = "";
String qhbcValue = "";
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                String value = dt.getValue(0,c).toString();
                qhbcValue = value;
                if (value.equals("0")) {
                    QHBC = "关闭";
                } else if (value.equals("1")) {
                    QHBC = "开启";
                } else {
                    QHBC = "";
                    qhbcValue = "";
                }
            } catch (Exception e) {
                QHBC = "";
                qhbcValue = "";
            }
        }
    }
}
optionalMap.put("QHBC", QHBC);
optionalMap.put("qhbcValue", qhbcValue);

// 智能定时
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\ZNDS')";
dt = dataService.queryListDataBySql(pointSql);
String ZNDS = "";
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                String value = dt.getValue(0,c).toString();
                if (value.equals("0")) {
                    ZNDS = "关闭";
                } else if (value.equals("1")) {
                    ZNDS = "开启";
                } else {
                    ZNDS = "";
                }
            } catch (Exception e) {
                ZNDS = "";
            }
        }
    }
}
optionalMap.put("ZNDS", ZNDS);

// 目标回水温度
if (QHBC.equals("开启")) {
    pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\TargetBackwaterTemperature')";
} else {
    pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\SetTemperature1')";
}

dt = dataService.queryListDataBySql(pointSql);
BigDecimal targetBackwaterTemperature = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                targetBackwaterTemperature = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
            } catch (Exception e) {
                targetBackwaterTemperature = new BigDecimal("-100");
            }
        }
    }
}
optionalMap.put("targetBackwaterTemperature", targetBackwaterTemperature + "℃");

data.put("optional", optionalMap);

// 查询系统类型
String selectProjectSql = "SELECT system_type_uuid FROM sjmg_project_data";
try {
    List<Map<String,Object>> selectProjectList = dynamicDataSource.excuteTenantSqlQuery(selectProjectSql, dbCode);
    if (selectProjectList.size() == 1) {
        if (selectProjectList.get(0).get("system_type_uuid").equals("1")) {
            return data;
        }
    } else {
        return data;
    }
} catch (Exception e) {
    return data;
}

// 查询一次侧供水总管温度
pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a WHERE a.taglongname IN ('Sys\\FinforWorx\\OneWaterSupplyTemperature')";
dt = dataService.queryListDataBySql(pointSql);
BigDecimal onceSupplyWaterTemperature = new BigDecimal("-100");
if(dt.getRows().size() == 1){
    for(int c = 0; c < dt.getColumns().size(); c++){
        if(dt.getColumns().get(c).getColumnName() == "realval"){
            try {
                onceSupplyWaterTemperature = new BigDecimal(dt.getValue(0,c).toString()).setScale(scale, RoundingMode.HALF_UP);
            } catch (Exception e) {
                onceSupplyWaterTemperature = new BigDecimal("-100");
            }
        }
    }
}

if (onceSupplyWaterTemperature.compareTo(new BigDecimal("-100")) == 0) {
    data.put("onceSupplyWaterTemperature", "");
} else {
    data.put("onceSupplyWaterTemperature", onceSupplyWaterTemperature);
}

// 查询末端循环泵
String selectProjectDataTerminalSql = "SELECT terminal_circulation_pump_main,terminal_circulation_pump_spare FROM sjmg_project_data";
int terminalCirculationPumpMain = 0;
int terminalCirculationPumpSpare = 0;
try {
    List<Map<String,Object>> selectProjectDataList = dynamicDataSource.excuteTenantSqlQuery(selectProjectDataTerminalSql, dbCode);
    if (selectProjectDataList.size() == 1) {
        try {
            terminalCirculationPumpMain = Integer.parseInt(selectProjectDataList.get(0).get("terminal_circulation_pump_main").toString());
        } catch (Exception e) {
            terminalCirculationPumpMain = 0;
        }

        try {
            terminalCirculationPumpSpare = Integer.parseInt(selectProjectDataList.get(0).get("terminal_circulation_pump_spare").toString());
        } catch (Exception e) {
            terminalCirculationPumpSpare = 0;
        }
    }
} catch (Exception e) {
    heatCirculationPumpMain = 0;
    heatCirculationPumpSpare = 0;
}
int terminalCirculationPump = terminalCirculationPumpMain + terminalCirculationPumpSpare;

// 查询末端循环泵
int onlineTerminalCirculationPump = 0;
int offlineTerminalCirculationPump = 0;
int alarmTerminalCirculationPump = 0;

List<Map<String, String>> terminalCirculationPumpList = new ArrayList<>();
for (int i = 0; i < terminalCirculationPump; i++) {
    Map<String, String> terminalCirculationPumpMap = new HashMap<>();
    terminalCirculationPumpMap.put("name", "水泵" + (i + 1));

    String state;
    // 查询热泵循环泵在线
    pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a " + 
    "WHERE a.taglongname IN ('TerminalPump\\SJMG\\No" + (i + 1) + "\\RunState')";
    dt = dataService.queryListDataBySql(pointSql);
    if(dt.getRows().size() == 1){
        for(int c = 0; c < dt.getColumns().size(); c++){
            if(dt.getColumns().get(c).getColumnName() == "realval"){
                if (dt.getValue(0,c).equals("1")) {
                    onlineTerminalCirculationPump++;
                    state = "运行";
                } else {
                    offlineTerminalCirculationPump++;
                    state = "待机";
                }
            }
        }
    } else {
        offlineTerminalCirculationPump++;
        state = "待机";
    }

    // 查询热泵循环泵报警
    pointSql = "SELECT a.taglongname,a.times,a.realval,a.quality FROM psrealdata AS a " + 
    "WHERE a.taglongname IN ('TerminalPump\\SJMG\\No" + (i + 1) + "\\FaultState')";
    dt = dataService.queryListDataBySql(pointSql);
    if(dt.getRows().size() == 1){
        for(int c = 0; c < dt.getColumns().size(); c++){
            if(dt.getColumns().get(c).getColumnName() == "realval"){
                if (dt.getValue(0,c).equals("1")) {
                    alarmTerminalCirculationPump++;
                    state = "报警";
                }
            }
        }
    }

    terminalCirculationPumpMap.put("state", state);
    terminalCirculationPumpList.add(terminalCirculationPumpMap);
}
data.put("onlineTerminalCirculationPump", onlineTerminalCirculationPump);
data.put("offlineTerminalCirculationPump", offlineTerminalCirculationPump);
data.put("alarmTerminalCirculationPump", alarmTerminalCirculationPump);

data.put("terminalCirculationPump", terminalCirculationPumpList);

return data;