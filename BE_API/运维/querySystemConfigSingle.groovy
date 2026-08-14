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

String code = data.get("code").toString();
data.remove("code");

String systemTypeCode = data.get("SystemType").toString();
data.remove("SystemType");

// 模式选择集合
List<Map<String, Object>> modeList = new ArrayList();

Map<String, Object> modeMap1 = new HashMap();
modeMap1.put("longName", "Sys\\FinforWorx\\SystemOperatingMode");
modeMap1.put("name", "系统运行模式");
modeMap1.put("unit", "");
modeMap1.put("systemSchema", "");
modeList.add(modeMap1);

Map<String, Object> modeMap2 = new HashMap();
modeMap2.put("longName", "Sys\\FinforWorx\\QHBC");
modeMap2.put("name", "气候补偿功能");
modeMap2.put("unit", "");
modeList.add(modeMap2);

Map<String, Object> modeMap3 = new HashMap();
modeMap3.put("longName", "Sys\\FinforWorx\\ZNDS");
modeMap3.put("name", "智能定时模式");
modeMap3.put("unit", "");
modeList.add(modeMap3);

Map<String, Object> modeMap4 = new HashMap();
modeMap4.put("longName", "Sys\\FinforWorx\\ZNQT");
modeMap4.put("name", "智能启停功能");
modeMap4.put("unit", "");
modeList.add(modeMap4);

Map<String, Object> modeMap5 = new HashMap();
modeMap5.put("longName", "Sys\\FinforWorx\\GFTJ");
modeMap5.put("name", "峰谷调节功能");
modeMap5.put("unit", "");
modeList.add(modeMap5);

Map<String, Object> modeMap6 = new HashMap();
modeMap6.put("longName", "Sys\\FinforWorx\\OHNY");
modeMap6.put("name", "耦合能源功能");
modeMap6.put("unit", "");
modeList.add(modeMap6);

Map<String, Object> modeMap7 = new HashMap();
modeMap7.put("longName", "Sys\\FinforWorx\\MDLD");
modeMap7.put("name", "末端联动功能");
modeMap7.put("unit", "");
modeList.add(modeMap7);

Map<String, Object> modeMap8 = new HashMap();
modeMap8.put("longName", "Sys\\FinforWorx\\Function1");
modeMap8.put("name", "热泵长时间运行保护功能");
modeMap8.put("unit", "");
modeList.add(modeMap8);

Map<String, Object> modeMap9 = new HashMap();
modeMap9.put("longName", "Sys\\FinforWorx\\HPTotalRunMode");
modeMap9.put("name", "热泵总运行模式");
modeMap9.put("unit", "");
modeMap1.put("hpSchema", "");
modeList.add(modeMap9);

//气候补偿集合
List<Map<String, Object>> qhbcList = new ArrayList();

Map<String, Object> qhbcMap1 = new HashMap();
qhbcMap1.put("longName", "Sys\\FinforWorx\\TargetBackwaterTemperature");
qhbcMap1.put("name", "目标回水温度");
qhbcMap1.put("unit", "℃");
qhbcMap1.put("value", "number");
qhbcList.add(qhbcMap1);

Map<String, Object> qhbcMap2 = new HashMap();
qhbcMap2.put("longName", "Sys\\FinforWorx\\SetTemperature1");
qhbcMap2.put("name", "定温回水温度设定（全天候）");
qhbcMap2.put("unit", "℃");
qhbcList.add(qhbcMap2);

// Map<String, Object> qhbcMap3 = new HashMap();
// qhbcMap3.put("longName", "Sys\\FinforWorx\\SetTemperature2");
// qhbcMap3.put("name", "定温回水温差设定");
// qhbcMap3.put("unit", "℃");
// qhbcList.add(qhbcMap3);

// Map<String, Object> qhbcMap4 = new HashMap();
// qhbcMap4.put("longName", "Sys\\FinforWorx\\SetTemperature3");
// qhbcMap4.put("name", "制冷温差设定");
// qhbcMap4.put("unit", "℃");
// qhbcList.add(qhbcMap4);


//智能定时集合
List<Map<String, Object>> zndsList = new ArrayList();

Map<String, Object> zndsMap17 = new HashMap();
zndsMap17.put("longName", "Sys\\FinforWorx\\Time1SetTemperature");
zndsMap17.put("name", "定时一定温回水温度设定");
zndsMap17.put("unit", "℃");
zndsList.add(zndsMap17);

Map<String, Object> zndsMap18 = new HashMap();
zndsMap18.put("longName", "Sys\\FinforWorx\\Time2SetTemperature");
zndsMap18.put("name", "定时二定温回水温度设定");
zndsMap18.put("unit", "℃");
zndsList.add(zndsMap18);

Map<String, Object> zndsMap19 = new HashMap();
zndsMap19.put("longName", "Sys\\FinforWorx\\Time3SetTemperature");
zndsMap19.put("name", "定时三定温回水温度设定");
zndsMap19.put("unit", "℃");
zndsList.add(zndsMap19);

Map<String, Object> zndsMap20 = new HashMap();
zndsMap20.put("longName", "Sys\\FinforWorx\\Time4SetTemperature");
zndsMap20.put("name", "定时四定温回水温度设定");
zndsMap20.put("unit", "℃");
zndsList.add(zndsMap20);

Map<String, Object> zndsMap21 = new HashMap();
zndsMap21.put("longName", "Sys\\FinforWorx\\Time5SetTemperature");
zndsMap21.put("name", "定时五定温回水温度设定");
zndsMap21.put("unit", "℃");
zndsList.add(zndsMap21);

Map<String, Object> zndsMap22 = new HashMap();
zndsMap22.put("longName", "Sys\\FinforWorx\\Time6SetTemperature");
zndsMap22.put("name", "定时六定温回水温度设定");
zndsMap22.put("unit", "℃");
zndsList.add(zndsMap22);

Map<String, Object> zndsMap23 = new HashMap();
zndsMap23.put("longName", "Sys\\FinforWorx\\Time7SetTemperature");
zndsMap23.put("name", "定时七定温回水温度设定");
zndsMap23.put("unit", "℃");
zndsList.add(zndsMap23);

Map<String, Object> zndsMap24 = new HashMap();
zndsMap24.put("longName", "Sys\\FinforWorx\\Time8SetTemperature");
zndsMap24.put("name", "定时八定温回水温度设定");
zndsMap24.put("unit", "℃");
zndsList.add(zndsMap24);

Map<String, Object> zndsMap25 = new HashMap();
zndsMap25.put("longName", "Sys\\FinforWorx\\Time1Enable");
zndsMap25.put("name", "定时一使能");
zndsMap25.put("unit", "");
zndsList.add(zndsMap25);

Map<String, Object> zndsMap26 = new HashMap();
zndsMap26.put("longName", "Sys\\FinforWorx\\Time2Enable");
zndsMap26.put("name", "定时二使能");
zndsMap26.put("unit", "");
zndsList.add(zndsMap26);

Map<String, Object> zndsMap27 = new HashMap();
zndsMap27.put("longName", "Sys\\FinforWorx\\Time3Enable");
zndsMap27.put("name", "定时三使能");
zndsMap27.put("unit", "");
zndsList.add(zndsMap27);

Map<String, Object> zndsMap28 = new HashMap();
zndsMap28.put("longName", "Sys\\FinforWorx\\Time4Enable");
zndsMap28.put("name", "定时四使能");
zndsMap28.put("unit", "");
zndsList.add(zndsMap28);

Map<String, Object> zndsMap29 = new HashMap();
zndsMap29.put("longName", "Sys\\FinforWorx\\Time5Enable");
zndsMap29.put("name", "定时五使能");
zndsMap29.put("unit", "");
zndsList.add(zndsMap29);

Map<String, Object> zndsMap30 = new HashMap();
zndsMap30.put("longName", "Sys\\FinforWorx\\Time6Enable");
zndsMap30.put("name", "定时六使能");
zndsMap30.put("unit", "");
zndsList.add(zndsMap30);

Map<String, Object> zndsMap31 = new HashMap();
zndsMap31.put("longName", "Sys\\FinforWorx\\Time7Enable");
zndsMap31.put("name", "定时七使能");
zndsMap31.put("unit", "");
zndsList.add(zndsMap31);

Map<String, Object> zndsMap32 = new HashMap();
zndsMap32.put("longName", "Sys\\FinforWorx\\Time8Enable");
zndsMap32.put("name", "定时八使能");
zndsMap32.put("unit", "");
zndsList.add(zndsMap32);


//智能启停集合
List<Map<String, Object>> znqtList = new ArrayList();

Map<String, Object> znqtMap1 = new HashMap();
znqtMap1.put("longName", "Sys\\FinforWorx\\JJZWC");
znqtMap1.put("name", "加减载温差");
znqtMap1.put("unit", "℃");
znqtList.add(znqtMap1);

Map<String, Object> znqtMap2 = new HashMap();
znqtMap2.put("longName", "Sys\\FinforWorx\\JZZQ1");
znqtMap2.put("name", "加载周期");
znqtMap2.put("unit", "min");
znqtList.add(znqtMap2);

Map<String, Object> znqtMap3 = new HashMap();
znqtMap3.put("longName", "Sys\\FinforWorx\\JZZQ2");
znqtMap3.put("name", "减载周期");
znqtMap3.put("unit", "min");
znqtList.add(znqtMap3);

Map<String, Object> znqtMap4 = new HashMap();
znqtMap4.put("longName", "Sys\\FinforWorx\\ZDPL");
znqtMap4.put("name", "最低频率");
znqtMap4.put("unit", "Hz");
znqtList.add(znqtMap4);

Map<String, Object> znqtMap5 = new HashMap();
znqtMap5.put("longName", "Sys\\FinforWorx\\ZGPL");
znqtMap5.put("name", "最高频率");
znqtMap5.put("unit", "Hz");
znqtList.add(znqtMap5);

Map<String, Object> znqtMap6 = new HashMap();
znqtMap6.put("longName", "Sys\\FinforWorx\\SetTemperature3");
znqtMap6.put("name", "制冷温差设定");
znqtMap6.put("unit", "℃");
znqtList.add(znqtMap6);

//峰谷调节集合
List<Map<String, Object>> fgtjList = new ArrayList();

Map<String, Object> fgtjMap1 = new HashMap();
fgtjMap1.put("longName", "Sys\\FinforWorx\\XNQD");
fgtjMap1.put("name", "蓄能强度");
// fgtjMap1.put("unit", "h");
fgtjMap1.put("unit", "");
fgtjList.add(fgtjMap1);

Map<String, Object> fgtjMap2 = new HashMap();
fgtjMap2.put("longName", "Sys\\FinforWorx\\XNBCZ");
fgtjMap2.put("name", "蓄能补偿值");
// fgtjMap2.put("unit", "℃");
fgtjMap2.put("unit", "");
fgtjList.add(fgtjMap2);

Map<String, Object> fgtjMap3 = new HashMap();
fgtjMap3.put("longName", "Sys\\FinforWorx\\FYCZ");
fgtjMap3.put("name", "费用差值");
// fgtjMap3.put("unit", "%");
fgtjMap3.put("unit", "");
fgtjList.add(fgtjMap3);

Map<String, Object> fgtjMap4 = new HashMap();
fgtjMap4.put("longName", "Sys\\FinforWorx\\XNCXZ");
fgtjMap4.put("name", "蓄能持续值");
// fgtjMap4.put("unit", "h");
fgtjMap4.put("unit", "");
fgtjList.add(fgtjMap4);


Map<String, Object> fgtjMap5 = new HashMap();
fgtjMap5.put("longName", "Sys\\FinforWorx\\TimeState1");
fgtjMap5.put("name", "时段1状态");
fgtjMap5.put("unit", "");
fgtjList.add(fgtjMap5);

Map<String, Object> fgtjMap6 = new HashMap();
fgtjMap6.put("longName", "Sys\\FinforWorx\\TimeState2");
fgtjMap6.put("name", "时段2状态");
fgtjMap6.put("unit", "");
fgtjList.add(fgtjMap6);

Map<String, Object> fgtjMap7 = new HashMap();
fgtjMap7.put("longName", "Sys\\FinforWorx\\TimeState3");
fgtjMap7.put("name", "时段3状态");
fgtjMap7.put("unit", "");
fgtjList.add(fgtjMap7);

Map<String, Object> fgtjMap8 = new HashMap();
fgtjMap8.put("longName", "Sys\\FinforWorx\\TimeState4");
fgtjMap8.put("name", "时段4状态");
fgtjMap8.put("unit", "");
fgtjList.add(fgtjMap8);

Map<String, Object> fgtjMap9 = new HashMap();
fgtjMap9.put("longName", "Sys\\FinforWorx\\TimeState5");
fgtjMap9.put("name", "时段5状态");
fgtjMap9.put("unit", "");
fgtjList.add(fgtjMap9);

Map<String, Object> fgtjMap10 = new HashMap();
fgtjMap10.put("longName", "Sys\\FinforWorx\\TimeState6");
fgtjMap10.put("name", "时段6状态");
fgtjMap10.put("unit", "");
fgtjList.add(fgtjMap10);

Map<String, Object> fgtjMap11 = new HashMap();
fgtjMap11.put("longName", "Sys\\FinforWorx\\TimeState7");
fgtjMap11.put("name", "时段7状态");
fgtjMap11.put("unit", "");
fgtjList.add(fgtjMap11);

Map<String, Object> fgtjMap12 = new HashMap();
fgtjMap12.put("longName", "Sys\\FinforWorx\\TimeState8");
fgtjMap12.put("name", "时段8状态");
fgtjMap12.put("unit", "");
fgtjList.add(fgtjMap12);

Map<String, Object> fgtjMap13 = new HashMap();
fgtjMap13.put("longName", "Sys\\FinforWorx\\TimeLength1");
fgtjMap13.put("name", "时段1时长");
fgtjMap13.put("unit", "min");
fgtjList.add(fgtjMap13);

Map<String, Object> fgtjMap14 = new HashMap();
fgtjMap14.put("longName", "Sys\\FinforWorx\\TimeLength2");
fgtjMap14.put("name", "时段2时长");
fgtjMap14.put("unit", "min");
fgtjList.add(fgtjMap14);

Map<String, Object> fgtjMap15 = new HashMap();
fgtjMap15.put("longName", "Sys\\FinforWorx\\TimeLength3");
fgtjMap15.put("name", "时段3时长");
fgtjMap15.put("unit", "min");
fgtjList.add(fgtjMap15);

Map<String, Object> fgtjMap16 = new HashMap();
fgtjMap16.put("longName", "Sys\\FinforWorx\\TimeLength4");
fgtjMap16.put("name", "时段4时长");
fgtjMap16.put("unit", "min");
fgtjList.add(fgtjMap16);

Map<String, Object> fgtjMap17 = new HashMap();
fgtjMap17.put("longName", "Sys\\FinforWorx\\TimeLength5");
fgtjMap17.put("name", "时段5时长");
fgtjMap17.put("unit", "min");
fgtjList.add(fgtjMap17);

Map<String, Object> fgtjMap18 = new HashMap();
fgtjMap18.put("longName", "Sys\\FinforWorx\\TimeLength6");
fgtjMap18.put("name", "时段6时长");
fgtjMap18.put("unit", "min");
fgtjList.add(fgtjMap18);

Map<String, Object> fgtjMap19 = new HashMap();
fgtjMap19.put("longName", "Sys\\FinforWorx\\TimeLength7");
fgtjMap19.put("name", "时段7时长");
fgtjMap19.put("unit", "min");
fgtjList.add(fgtjMap19);

Map<String, Object> fgtjMap20 = new HashMap();
fgtjMap20.put("longName", "Sys\\FinforWorx\\TimeLength8");
fgtjMap20.put("name", "时段8时长");
fgtjMap20.put("unit", "min");
fgtjList.add(fgtjMap20);

//耦合能源集合
List<Map<String, Object>> ohnyList = new ArrayList();

Map<String, Object> ohnyMap1 = new HashMap();
ohnyMap1.put("longName", "Sys\\FinforWorx\\OHType");
ohnyMap1.put("name", "耦合能源类型");
ohnyMap1.put("unit", "");
ohnyList.add(ohnyMap1);

Map<String, Object> ohnyMap2 = new HashMap();
ohnyMap2.put("longName", "Sys\\FinforWorx\\OHNumber");
ohnyMap2.put("name", "耦合能源台数");
ohnyMap2.put("unit", "");
ohnyMap2.put("value", "number");
ohnyList.add(ohnyMap2);

//热泵集合
List<Map<String, Object>> rbList = new ArrayList();

Map<String, Object> rbMap1 = new HashMap();
rbMap1.put("longName", "Sys\\FinforWorx\\HPYXBH1");
rbMap1.put("name", "热泵持续运行保护判断时长");
rbMap1.put("unit", "h");
rbList.add(rbMap1);

Map<String, Object> rbMap2 = new HashMap();
rbMap2.put("longName", "Sys\\FinforWorx\\HPYXBH2");
rbMap2.put("name", "热泵运行保护停机时长");
rbMap2.put("unit", "s");
rbList.add(rbMap2);

Map<String, Object> rbMap3 = new HashMap();
rbMap3.put("longName", "Sys\\FinforWorx\\HPYXTS");
rbMap3.put("name", "机组正在运行台数");
rbMap3.put("unit", "");
rbMap3.put("value", "number");
rbList.add(rbMap3);

Map<String, Object> rbMap4 = new HashMap();
rbMap4.put("longName", "Sys\\FinforWorx\\HPZXYXSC");
rbMap4.put("name", "热泵最小运行时长");
rbMap4.put("unit", "s");
rbMap4.put("value", "number");
rbList.add(rbMap4);

//水泵集合
List<Map<String, Object>> sbList = new ArrayList();

Map<String, Object> sbMap1 = new HashMap();
sbMap1.put("longName", "HotWaterPump\\SJMG\\No1\\Status");
sbMap1.put("name", "热泵1号水泵手动开关");
sbMap1.put("unit", "");
sbList.add(sbMap1);

Map<String, Object> sbMap2 = new HashMap();
sbMap2.put("longName", "HotWaterPump\\SJMG\\No2\\Status");
sbMap2.put("name", "热泵2号水泵手动开关");
sbMap2.put("unit", "");
sbList.add(sbMap2);

Map<String, Object> sbMap3 = new HashMap();
sbMap3.put("longName", "HotWaterPump\\SJMG\\No3\\Status");
sbMap3.put("name", "热泵3号水泵手动开关");
sbMap3.put("unit", "");
sbList.add(sbMap3);

Map<String, Object> sbMap4 = new HashMap();
sbMap4.put("longName", "HotWaterPump\\SJMG\\No4\\Status");
sbMap4.put("name", "热泵4号水泵手动开关");
sbMap4.put("unit", "");
sbList.add(sbMap4);

if (systemTypeCode == "2") {
    Map<String, Object> sbMap5 = new HashMap();
    sbMap5.put("longName", "TerminalPump\\SJMG\\No1\\Status");
    sbMap5.put("name", "末端1号水泵手动开关");
    sbMap5.put("unit", "");
    sbList.add(sbMap5);

    Map<String, Object> sbMap6 = new HashMap();
    sbMap6.put("longName", "TerminalPump\\SJMG\\No2\\Status");
    sbMap6.put("name", "末端2号水泵手动开关");
    sbMap6.put("unit", "");
    sbList.add(sbMap6);

    Map<String, Object> sbMap7 = new HashMap();
    sbMap7.put("longName", "TerminalPump\\SJMG\\No3\\Status");
    sbMap7.put("name", "末端3号水泵手动开关");
    sbMap7.put("unit", "");
    sbList.add(sbMap7);

    Map<String, Object> sbMap8 = new HashMap();
    sbMap8.put("longName", "TerminalPump\\SJMG\\No4\\Status");
    sbMap8.put("name", "末端4号水泵手动开关");
    sbMap8.put("unit", "");
    sbList.add(sbMap8);

    Map<String, Object> sbMap11 = new HashMap();
    sbMap11.put("longName", "Sys\\FinforWorx\\MDBNumber1");
    sbMap11.put("name", "末端循环泵主泵台数选择");
    sbMap11.put("unit", "");
    sbMap11.put("value", "number");
    sbList.add(sbMap11);

    Map<String, Object> sbMap12 = new HashMap();
    sbMap12.put("longName", "Sys\\FinforWorx\\MDBNumber2");
    sbMap12.put("name", "末端循环泵备泵台数选择");
    sbMap12.put("unit", "");
    sbMap12.put("value", "number");
    sbList.add(sbMap12);

    Map<String, Object> sbMap18 = new HashMap();
    sbMap18.put("longName", "Sys\\FinforWorx\\MDXHB1");
    sbMap18.put("name", "末端循环泵间隔循环节能功能");
    sbMap18.put("unit", "");
    sbList.add(sbMap18);

    Map<String, Object> sbMap19 = new HashMap();
    sbMap19.put("longName", "Sys\\FinforWorx\\MDXHB2");
    sbMap19.put("name", "末端循环泵间隔启动时间");
    sbMap19.put("unit", "min");
    sbList.add(sbMap19);

    Map<String, Object> sbMap20 = new HashMap();
    sbMap20.put("longName", "Sys\\FinforWorx\\MDXHB3");
    sbMap20.put("name", "末端循环泵间隔停止时间");
    sbMap20.put("unit", "min");
    sbList.add(sbMap20);

    Map<String, Object> sbMap21 = new HashMap();
    sbMap21.put("longName", "Sys\\FinforWorx\\MDXHB4");
    sbMap21.put("name", "末端循环泵轮值时间");
    sbMap21.put("unit", "h");
    sbList.add(sbMap21);

    Map<String, Object> sbMap22 = new HashMap();
    sbMap22.put("longName", "Sys\\FinforWorx\\MDWaterState");
    sbMap22.put("name", "末端水泵运行模式");
    sbMap22.put("unit", "");
    sbList.add(sbMap22);

    Map<String, Object> sbMap23 = new HashMap();
    sbMap23.put("longName", "Sys\\FinforWorx\\GHSWCSD");
    sbMap23.put("name", "供回水压差设定");
    sbMap23.put("unit", "kPa");
    sbList.add(sbMap23);
}


Map<String, Object> sbMap9 = new HashMap();
sbMap9.put("longName", "Sys\\FinforWorx\\XHBNumber1");
sbMap9.put("name", "热泵循环泵主泵台数选择");
sbMap9.put("unit", "");
sbList.add(sbMap9);

Map<String, Object> sbMap10 = new HashMap();
sbMap10.put("longName", "Sys\\FinforWorx\\XHBNumber2");
sbMap10.put("name", "热泵循环泵备泵台数选择");
sbMap10.put("unit", "");
sbMap10.put("value", "number");
sbList.add(sbMap10);

Map<String, Object> sbMap13 = new HashMap();
sbMap13.put("longName", "Sys\\FinforWorx\\RunMode");
sbMap13.put("name", "运行模式");
sbMap13.put("unit", "");
sbList.add(sbMap13);

Map<String, Object> sbMap14 = new HashMap();
sbMap14.put("longName", "Sys\\FinforWorx\\HPXHB1");
sbMap14.put("name", "热泵循环泵间隔循环节能功能");
sbMap14.put("unit", "");
sbList.add(sbMap14);

Map<String, Object> sbMap15 = new HashMap();
sbMap15.put("longName", "Sys\\FinforWorx\\HPXHB2");
sbMap15.put("name", "热泵循环泵间隔启动时间");
sbMap15.put("unit", "min");
sbList.add(sbMap15);

Map<String, Object> sbMap16 = new HashMap();
sbMap16.put("longName", "Sys\\FinforWorx\\HPXHB3");
sbMap16.put("name", "热泵循环泵间隔停止时间");
sbMap16.put("unit", "min");
sbList.add(sbMap16);

Map<String, Object> sbMap17 = new HashMap();
sbMap17.put("longName", "Sys\\FinforWorx\\HPXHB4");
sbMap17.put("name", "热泵循环泵轮值时间");
sbMap17.put("unit", "h");
sbList.add(sbMap17);

//定压泵集合
List<Map<String, Object>> dybList = new ArrayList();

Map<String, Object> dybMap1 = new HashMap();
dybMap1.put("longName", "ConstantPressurePump\\SJMG\\No1\\Status");
dybMap1.put("name", "定压泵1手动开关");
dybMap1.put("unit", "");
dybList.add(dybMap1);

Map<String, Object> dybMap2 = new HashMap();
dybMap2.put("longName", "ConstantPressurePump\\SJMG\\No2\\Status");
dybMap2.put("name", "定压泵2手动开关");
dybMap2.put("unit", "");
dybList.add(dybMap2);

Map<String, Object> dybMap3 = new HashMap();
dybMap3.put("longName", "Sys\\FinforWorx\\YLSet1");
dybMap3.put("name", "定压补水启动压力设置");
dybMap3.put("unit", "kPa");
dybList.add(dybMap3);

Map<String, Object> dybMap4 = new HashMap();
dybMap4.put("longName", "Sys\\FinforWorx\\YLSet2");
dybMap4.put("name", "定压补水停止压力设置");
dybMap4.put("unit", "kPa");
dybList.add(dybMap4);


//伴热带集合
List<Map<String, Object>> brdList = new ArrayList();

Map<String, Object> brdMap1 = new HashMap();
brdMap1.put("longName", "TropicalPump\\SJMG\\No1\\Status");
brdMap1.put("name", "伴热带手动开关");
brdMap1.put("unit", "");
brdList.add(brdMap1);

Map<String, Object> brdMap2 = new HashMap();
brdMap2.put("longName", "TropicalPump\\SJMG\\No1\\WDSet1");
brdMap2.put("name", "伴热带启动温度设置");
brdMap2.put("unit", "℃");
brdList.add(brdMap2);

Map<String, Object> brdMap3 = new HashMap();
brdMap3.put("longName", "TropicalPump\\SJMG\\No1\\WDSet2");
brdMap3.put("name", "伴热带关闭温度设置");
brdMap3.put("unit", "℃");
brdList.add(brdMap3);

Map<String, Object> brdMap4 = new HashMap();
brdMap4.put("longName", "Sys\\FinforWorx\\TSGBTime");
brdMap4.put("name", "延时关闭时间");
brdMap4.put("unit", "min");
brdList.add(brdMap4);

//排污阀集合
List<Map<String, Object>> pwfList = new ArrayList();

Map<String, Object> pwfMap1 = new HashMap();
pwfMap1.put("longName", "SewageValvePump\\SJMG\\No1\\Status");
pwfMap1.put("name", "排污阀手动开关");
pwfMap1.put("unit", "");
pwfList.add(pwfMap1);

Map<String, Object> pwfMap2 = new HashMap();
pwfMap2.put("longName", "SewageValvePump\\SJMG\\No1\\PWZQ");
pwfMap2.put("name", "排污周期");
pwfMap2.put("unit", "d");
pwfList.add(pwfMap2);

Map<String, Object> pwfMap3 = new HashMap();
pwfMap3.put("longName", "SewageValvePump\\SJMG\\No1\\PWSJD1,SewageValvePump\\SJMG\\No1\\PWSJD2");
pwfMap3.put("name", "排污时间点");
pwfMap3.put("unit", "");
pwfList.add(pwfMap3);

Map<String, Object> pwfMap4 = new HashMap();
pwfMap4.put("longName", "SewageValvePump\\SJMG\\No1\\PWTime");
pwfMap4.put("name", "排污持续时间");
pwfMap4.put("unit", "s");
pwfList.add(pwfMap4);

//泄压阀集合
List<Map<String, Object>> xyfList = new ArrayList();

Map<String, Object> xyfMap1 = new HashMap();
xyfMap1.put("longName", "PressureReliefValvePump\\SJMG\\No1\\Status");
xyfMap1.put("name", "泄压阀手动开关");
xyfMap1.put("unit", "");
xyfList.add(xyfMap1);

Map<String, Object> xyfMap2 = new HashMap();
xyfMap2.put("longName", "PressureReliefValvePump\\SJMG\\No1\\YL1");
xyfMap2.put("name", "泄压阀启动压力");
xyfMap2.put("unit", "kPa");
xyfList.add(xyfMap2);

Map<String, Object> xyfMap3 = new HashMap();
xyfMap3.put("longName", "PressureReliefValvePump\\SJMG\\No1\\YL2");
xyfMap3.put("name", "泄压阀停止压力");
xyfMap3.put("unit", "kPa");
xyfList.add(xyfMap3);

//项目系统类型集合
List<Map<String, Object>>  protypeList = new ArrayList();

Map<String, Object> protypeMap1 = new HashMap();
protypeMap1.put("longName", "Sys\\FinforWorx\\ProjectType");
protypeMap1.put("name", "项目类型");
protypeMap1.put("unit", "");
protypeList.add(protypeMap1);

Map<String, Object> protypeMap2 = new HashMap();
protypeMap2.put("longName", "Sys\\FinforWorx\\TerminalForm");
protypeMap2.put("name", "末端形式");
protypeMap2.put("unit", "");
protypeList.add(protypeMap2);

Map<String, Object> protypeMap3 = new HashMap();
protypeMap3.put("longName", "Sys\\FinforWorx\\SystemType");
protypeMap3.put("name", "系统类型");
protypeMap3.put("unit", "");
protypeList.add(protypeMap3);

Map<String, Object> protypeMap4 = new HashMap();
protypeMap4.put("longName", "");
protypeMap4.put("name", "区域");
protypeMap4.put("unit", "");
protypeList.add(protypeMap4);

Map<String, Object> protypeMap5 = new HashMap();
protypeMap5.put("longName", "Sys\\FinforWorx\\HPTotalNumber");
protypeMap5.put("name", "热泵总台数");
protypeMap5.put("unit", "");
protypeList.add(protypeMap5);

//能源价格集合
List<Map<String, Object>>  energyPriceList = new ArrayList();

Map<String, Object> energyPriceMap1 = new HashMap();
energyPriceMap1.put("longName", "Sys\\FinforWorx\\ElectricityPrices1");
energyPriceMap1.put("name", "电价1");
energyPriceMap1.put("unit", "元/kW·h");
energyPriceMap1.put("value", "number");
energyPriceList.add(energyPriceMap1);

Map<String, Object> energyPriceMap2 = new HashMap();
energyPriceMap2.put("longName", "Sys\\FinforWorx\\ElectricityPrices2");
energyPriceMap2.put("name", "电价2");
energyPriceMap2.put("unit", "元/kW·h");
energyPriceMap2.put("value", "number");
energyPriceList.add(energyPriceMap2);

Map<String, Object> energyPriceMap3 = new HashMap();
energyPriceMap3.put("longName", "Sys\\FinforWorx\\ElectricityPrices3");
energyPriceMap3.put("name", "电价3");
energyPriceMap3.put("unit", "元/kW·h");
energyPriceMap3.put("value", "number");
energyPriceList.add(energyPriceMap3);

Map<String, Object> energyPriceMap4 = new HashMap();
energyPriceMap4.put("longName", "Sys\\FinforWorx\\ElectricityPrices4");
energyPriceMap4.put("name", "电价4");
energyPriceMap4.put("unit", "元/kW·h");
energyPriceMap4.put("value", "number");
energyPriceList.add(energyPriceMap4);

Map<String, Object> energyPriceMap5 = new HashMap();
energyPriceMap5.put("longName", "Sys\\FinforWorx\\ElectricityPrices5");
energyPriceMap5.put("name", "电价5");
energyPriceMap5.put("unit", "元/kW·h");
energyPriceMap5.put("value", "number");
energyPriceList.add(energyPriceMap5);

Map<String, Object> energyPriceMap6 = new HashMap();
energyPriceMap6.put("longName", "Sys\\FinforWorx\\ElectricityPrices6");
energyPriceMap6.put("name", "电价6");
energyPriceMap6.put("unit", "元/kW·h");
energyPriceMap6.put("value", "number");
energyPriceList.add(energyPriceMap6);

Map<String, Object> energyPriceMap7 = new HashMap();
energyPriceMap7.put("longName", "Sys\\FinforWorx\\ElectricityPrices7");
energyPriceMap7.put("name", "电价7");
energyPriceMap7.put("unit", "元/kW·h");
energyPriceMap7.put("value", "number");
energyPriceList.add(energyPriceMap7);

Map<String, Object> energyPriceMap8 = new HashMap();
energyPriceMap8.put("longName", "Sys\\FinforWorx\\ElectricityPrices8");
energyPriceMap8.put("name", "电价8");
energyPriceMap8.put("unit", "元/kW·h");
energyPriceMap8.put("value", "number");
energyPriceList.add(energyPriceMap8);

Map<String, Object> energyPriceMap9 = new HashMap();
energyPriceMap9.put("longName", "Sys\\FinforWorx\\GasPrices");
energyPriceMap9.put("name", "气价");
energyPriceMap9.put("unit", "元/m³");
energyPriceMap9.put("value", "number");
energyPriceList.add(energyPriceMap9);

Map<String, Object> energyPriceMap10 = new HashMap();
energyPriceMap10.put("longName", "Sys\\FinforWorx\\WaterPrices");
energyPriceMap10.put("name", "水价");
energyPriceMap10.put("unit", "元/m³");
energyPriceMap10.put("value", "number");
energyPriceList.add(energyPriceMap10);


//系统集合
List<Map<String, Object>>  sysList = new ArrayList();

Map<String, Object> sysMap1 = new HashMap();
sysMap1.put("longName", "Sys\\FinforWorx\\SystemStatus");
sysMap1.put("name", "系统开关机");
sysMap1.put("unit", "");
sysList.add(sysMap1);

Map<String, Object> sysMap2 = new HashMap();
sysMap2.put("longName", "Sys\\FinforWorx\\WDPJZ1");
sysMap2.put("name", "一天的室内温度平均值");
sysMap2.put("unit", "℃");
sysMap2.put("value", "number");
sysList.add(sysMap2);

Map<String, Object> sysMap3 = new HashMap();
sysMap3.put("longName", "Sys\\FinforWorx\\WDPJZ3");
sysMap3.put("name", "三天的室内温度平均值");
sysMap3.put("unit", "℃");
sysMap3.put("value", "number");
sysList.add(sysMap3);

Map<String, Object> sysMap4 = new HashMap();
sysMap4.put("longName", "Sys\\FinforWorx\\SNPJZ1");
sysMap4.put("name", "采暖季累计的室内平均值");
sysMap4.put("unit", "℃");
sysMap4.put("value", "number");
sysList.add(sysMap4);

Map<String, Object> sysMap5 = new HashMap();
sysMap5.put("longName", "Sys\\FinforWorx\\SNPJZ2");
sysMap5.put("name", "制冷季累计的室内平均值");
sysMap5.put("unit", "℃");
sysMap5.put("value", "number");
sysList.add(sysMap5);

// 电表点位生成：热泵电表/水泵电表/耦合能源电表结构一致，仅点位前缀不同
def buildElectricityMeterPoints = { String prefix, int index ->
    List<Map<String, Object>> list = new ArrayList();
    list.add([longName: prefix + "DY1", name: "A相电压", unit: "V"]);
    list.add([longName: prefix + "DY2", name: "B相电压", unit: "V"]);
    list.add([longName: prefix + "DY3", name: "C相电压", unit: "V"]);
    list.add([longName: prefix + "DL1", name: "A相电流", unit: "A"]);
    list.add([longName: prefix + "DL2", name: "B相电流", unit: "A"]);
    list.add([longName: prefix + "DL3", name: "C相电流", unit: "A"]);
    list.add([longName: prefix + "totalPower", name: "电表" + index + "总功率", unit: "kW"]);
    list.add([longName: prefix + "LJHDL", name: "累积耗电量", unit: "kW·h"]);
    return list;
}

// 热表点位生成
def buildHeatMeterPoints = { String prefix ->
    List<Map<String, Object>> list = new ArrayList();
    list.add([longName: prefix + "GSWD", name: "供水温度", unit: "℃"]);
    list.add([longName: prefix + "HSWD", name: "回水温度", unit: "℃"]);
    list.add([longName: prefix + "Power", name: "功率", unit: "kW"]);
    list.add([longName: prefix + "SSLL", name: "瞬时流量", unit: "m³"]);
    list.add([longName: prefix + "LJLL", name: "累积流量", unit: "m³"]);
    list.add([longName: prefix + "LJLLHot", name: "累积热量", unit: "kW·h"]);
    list.add([longName: prefix + "LJLLCold", name: "累积冷量", unit: "kW·h"]);
    return list;
}

// 电表/热表集合：key 为前端传入的 code
Map<String, List<Map<String, Object>>> meterListMap = new HashMap();
for (int i = 1; i <= 10; i++) {
    meterListMap.put("热泵电表" + i, buildElectricityMeterPoints("ElectricityMeter\\SJMG\\No" + i + "\\", i));
    meterListMap.put("水泵电表" + i, buildElectricityMeterPoints("WPElectricityMeter\\SJMG\\No" + i + "\\", i));
    meterListMap.put("耦合能源电表" + i, buildElectricityMeterPoints("OHNYElectricityMeter\\SJMG\\No" + i + "\\", i));
}
for (int i = 1; i <= 3; i++) {
    meterListMap.put("热表" + i, buildHeatMeterPoints("HeatMeter\\SJMG\\No" + i + "\\"));
}


//水表
List<Map<String, Object>>  shuibiaoList = new ArrayList();

Map<String, Object> shuibiaoMap1 = new HashMap();
shuibiaoMap1.put("longName", "WaterMeter\\SJMG\\No1\\LJLL");
shuibiaoMap1.put("name", "累积流量");
shuibiaoMap1.put("unit", "m³");
shuibiaoMap1.put("value", "number");
shuibiaoList.add(shuibiaoMap1);


// 数据集合
List<Map<String, Object>> dataList = new ArrayList();

// 集合
List<Map<String, Object>> structureList = new ArrayList();

if(code.equals("模式选择")){
    structureList = new ArrayList();
    structureList.addAll(modeList);
}else if(code.equals("气候补偿")){
    structureList = new ArrayList();
    structureList.addAll(qhbcList);
}else if(code.equals("智能定时")){
    structureList = new ArrayList();
    structureList.addAll(zndsList);
}else if(code.equals("智能启停")){
    structureList = new ArrayList();
    structureList.addAll(znqtList);
}else if(code.equals("峰谷调节")){
    structureList = new ArrayList();
    structureList.addAll(fgtjList);
}else if(code.equals("耦合能源")){
    structureList = new ArrayList();
    structureList.addAll(ohnyList);
}else if(code.equals("热泵")){
    structureList = new ArrayList();
    structureList.addAll(rbList);
}else if(code.equals("水泵")){
    structureList = new ArrayList();
    structureList.addAll(sbList);
}else if(code.equals("定压泵")){
    structureList = new ArrayList();
    structureList.addAll(dybList);
}else if(code.equals("伴热带")){
    structureList = new ArrayList();
    structureList.addAll(brdList);
}else if(code.equals("排污阀")){
    structureList = new ArrayList();
    structureList.addAll(pwfList);
}else if(code.equals("泄压阀")){
    structureList = new ArrayList();
    structureList.addAll(xyfList);
}else if(code.equals("项目系统类型")){
    structureList = new ArrayList();
    structureList.addAll(protypeList);
}else if(code.equals("能源价格")){
    structureList = new ArrayList();
    structureList.addAll(energyPriceList);
}else if(code.equals("系统")){
    structureList = new ArrayList();
    structureList.addAll(sysList);
}else if(meterListMap.containsKey(code)){
    // 热泵电表1-10、水泵电表1-10、耦合能源电表1-10、热表1-3
    structureList = new ArrayList();
    structureList.addAll(meterListMap.get(code));
}else if(code.equals("水表")){
    structureList = new ArrayList();
    structureList.addAll(shuibiaoList);
}



for (Map<String, Object> structureMap : structureList) {
    Map<String, Object> dataMap = new HashMap();
    
    String name = structureMap.get("name");
    dataMap.put("name", name);

    String longName = structureMap.get("longName");
    dataMap.put("longName", longName);

    String unit = structureMap.get("unit");
    dataMap.put("unit", unit);
    
    if(code.equals("项目系统类型")&&name.equals("区域")){
        String areaSql="SELECT CONCAT(area.province_name,area.city_name) as areaname FROM sjmg_project_data pro inner join sjmg_project_area area on pro.project_area_uuid=area.id";
        try {
            List<Map<String,Object>> selectList = dynamicDataSource.excuteTenantSqlQuery(areaSql, dbCode);
            dataMap.put("value", selectList.get(0).get("areaname"));
        } catch (Exception e) {
           dataMap.put("value", "");
        }

    }else if(code.equals("排污阀")&&name.equals("排污时间点")){
        String[] longNameArr = longName.split(",");
        String pwTimes="";
        for(int i=0;i<longNameArr.length;i++){
            String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longNameArr[i] + "')";
            DataTable dt = dataService.queryListDataBySql(pointSql);
            if (dt.getRows().size() == 1) {
                for(int c = 0; c < dt.getColumns().size(); c++){
                    if(dt.getColumns().get(c).getColumnName() == "realval"){
                        String pwTimeVal=dt.getValue(0,c);
                        if(dt.getValue(0,c).equals("0")){
                            pwTimeVal="00";
                        }
                        pwTimes+=pwTimeVal+":";
                    }
                }
            }
        }
        dataMap.put("value", pwTimes.substring(0,pwTimes.length()-1));
    }else if(code.equals("模式选择")&&name.equals("系统运行模式")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "智能模式");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "手动模式");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(code.equals("模式选择")&&name.equals("热泵总运行模式")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "制冷模式");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "制热模式");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(code.equals("系统")&&name.equals("系统开关机")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "关机");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "开机");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(code.equals("耦合能源")&&name.equals("耦合能源类型")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "无");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "电锅炉");
                    } else if (dt.getValue(0,c).equals("2")) {
                        dataMap.put("value", "水源热泵");
                    } else if (dt.getValue(0,c).equals("3")) {
                        dataMap.put("value", "风冷模块");
                    } else if (dt.getValue(0,c).equals("4")) {
                        dataMap.put("value", "燃气锅炉");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(code.equals("水泵")&&name.equals("运行模式")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "定频");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "变频");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(code.equals("水泵")&&name.equals("末端水泵运行模式")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "定频");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "变频");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(code.equals("项目系统类型")&&name.equals("项目类型")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "制冷");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "制热");
                    } else if (dt.getValue(0,c).equals("2")) {
                        dataMap.put("value", "热水");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(code.equals("项目系统类型")&&name.equals("末端形式")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "地暖");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "暖气片");
                    } else if (dt.getValue(0,c).equals("2")) {
                        dataMap.put("value", "风盘");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(code.equals("项目系统类型")&&name.equals("系统类型")){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "一次系统");
                    } else if (dt.getValue(0,c).equals("2")) {
                        dataMap.put("value", "二次系统");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(
        (code.equals("智能定时")&&name.equals("定时一使能")) ||
        (code.equals("智能定时")&&name.equals("定时二使能")) ||
        (code.equals("智能定时")&&name.equals("定时三使能")) ||
        (code.equals("智能定时")&&name.equals("定时四使能")) ||
        (code.equals("智能定时")&&name.equals("定时五使能")) ||
        (code.equals("智能定时")&&name.equals("定时六使能")) ||
        (code.equals("智能定时")&&name.equals("定时七使能")) ||
        (code.equals("智能定时")&&name.equals("定时八使能")) ||
        (code.equals("峰谷调节")&&name.equals("时段1状态")) ||
        (code.equals("峰谷调节")&&name.equals("时段2状态")) ||
        (code.equals("峰谷调节")&&name.equals("时段3状态")) ||
        (code.equals("峰谷调节")&&name.equals("时段4状态")) ||
        (code.equals("峰谷调节")&&name.equals("时段5状态")) ||
        (code.equals("峰谷调节")&&name.equals("时段6状态")) ||
        (code.equals("峰谷调节")&&name.equals("时段7状态")) ||
        (code.equals("峰谷调节")&&name.equals("时段8状态"))
    ){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "关闭");
                    } else {
                        dataMap.put("value", "开启");
                    }
                }
            }
        }
    }else if(
        (code.equals("峰谷调节")&&name.equals("时段1时长")) ||
        (code.equals("峰谷调节")&&name.equals("时段2时长")) ||
        (code.equals("峰谷调节")&&name.equals("时段3时长")) ||
        (code.equals("峰谷调节")&&name.equals("时段4时长")) ||
        (code.equals("峰谷调节")&&name.equals("时段5时长")) ||
        (code.equals("峰谷调节")&&name.equals("时段6时长")) ||
        (code.equals("峰谷调节")&&name.equals("时段7时长")) ||
        (code.equals("峰谷调节")&&name.equals("时段8时长"))
    ){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "关闭");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if(
        (code.equals("气候补偿")&&name.equals("目标回水温度")) ||
        (code.equals("气候补偿")&&name.equals("定温回水温度设定（全天候）")) ||
        (code.equals("智能定时")&&name.equals("定时一定温回水温度设定")) ||
        (code.equals("智能定时")&&name.equals("定时二定温回水温度设定")) ||
        (code.equals("智能定时")&&name.equals("定时三定温回水温度设定")) ||
        (code.equals("智能定时")&&name.equals("定时四定温回水温度设定")) ||
        (code.equals("智能定时")&&name.equals("定时五定温回水温度设定")) ||
        (code.equals("智能定时")&&name.equals("定时六定温回水温度设定")) ||
        (code.equals("智能定时")&&name.equals("定时七定温回水温度设定")) ||
        (code.equals("智能定时")&&name.equals("定时八定温回水温度设定")) ||
        (code.equals("智能启停")&&name.equals("加减载温差")) ||
        (code.equals("智能启停")&&name.equals("加载周期")) ||
        (code.equals("智能启停")&&name.equals("减载周期")) ||
        (code.equals("智能启停")&&name.equals("最低频率")) ||
        (code.equals("智能启停")&&name.equals("最高频率")) ||
        (code.equals("智能启停")&&name.equals("制冷温差设定")) ||
        (code.equals("峰谷调节")&&name.equals("蓄能强度")) ||
        (code.equals("峰谷调节")&&name.equals("蓄能补偿值")) ||
        (code.equals("峰谷调节")&&name.equals("费用差值")) ||
        (code.equals("峰谷调节")&&name.equals("蓄能持续值")) ||
        (code.equals("峰谷调节")&&name.equals("制冷温差设定")) ||
        (code.equals("耦合能源")&&name.equals("耦合能源台数")) ||
        (code.equals("热泵")&&name.equals("热泵持续运行保护判断时长")) ||
        (code.equals("热泵")&&name.equals("热泵运行保护停机时长")) ||
        (code.equals("热泵")&&name.equals("机组正在运行台数")) ||
        (code.equals("热泵")&&name.equals("热泵最小运行时长")) ||
        (code.equals("水泵")&&name.equals("热泵循环泵主泵台数选择")) || 
        (code.equals("水泵")&&name.equals("热泵循环泵备泵台数选择")) ||
        (code.equals("水泵")&&name.equals("末端循环泵主泵台数选择")) ||
        (code.equals("水泵")&&name.equals("末端循环泵备泵台数选择")) ||
        (code.equals("水泵")&&name.equals("热泵循环泵间隔启动时间")) ||
        (code.equals("水泵")&&name.equals("热泵循环泵间隔停止时间")) ||
        (code.equals("水泵")&&name.equals("热泵循环泵轮值时间")) ||
        (code.equals("定压泵")&&name.equals("定压补水启动压力设置")) ||
        (code.equals("定压泵")&&name.equals("定压补水停止压力设置")) ||
        (code.equals("伴热带")&&name.equals("伴热带启动温度设置")) ||
        (code.equals("伴热带")&&name.equals("伴热带关闭温度设置")) ||
        (code.equals("伴热带")&&name.equals("延时关闭时间")) ||
        (code.equals("排污阀")&&name.equals("排污周期")) ||
        (code.equals("排污阀")&&name.equals("排污持续时间")) ||
        (code.equals("泄压阀")&&name.equals("泄压阀启动压力")) ||
        (code.equals("泄压阀")&&name.equals("泄压阀停止压力")) ||
        (code.equals("系统")&&name.equals("一天的室内温度平均值")) ||
        (code.equals("系统")&&name.equals("三天的室内温度平均值")) ||
        (code.equals("系统")&&name.equals("采暖季累计的室内平均值")) ||
        (code.equals("系统")&&name.equals("制冷季累计的室内平均值")) ||
        code.startsWith("热泵电表") ||
        code.startsWith("水泵电表") ||
        code.startsWith("耦合能源电表") ||
        code.startsWith("热表") ||
        (code.equals("水表")&&name.equals("累积流量"))
    ){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "0"+"  "+unit);
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else if (
        (code.equals("能源价格")&&name.equals("电价1")) ||
        (code.equals("能源价格")&&name.equals("电价2")) ||
        (code.equals("能源价格")&&name.equals("电价3")) ||
        (code.equals("能源价格")&&name.equals("电价4")) ||
        (code.equals("能源价格")&&name.equals("电价5")) ||
        (code.equals("能源价格")&&name.equals("电价6")) ||
        (code.equals("能源价格")&&name.equals("电价7")) ||
        (code.equals("能源价格")&&name.equals("电价8")) ||
        (code.equals("能源价格")&&name.equals("水价")) ||
        (code.equals("能源价格")&&name.equals("气价"))
    ){
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "0"+"  "+unit);
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(2, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }else{
        String pointSql = "select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + longName + "')";
        DataTable dt = dataService.queryListDataBySql(pointSql);
        if (dt.getRows().size() == 1) {
            for(int c = 0; c < dt.getColumns().size(); c++){
                if(dt.getColumns().get(c).getColumnName() == "realval"){
                    if (dt.getValue(0,c).equals("0")) {
                        dataMap.put("value", "关闭");
                    } else if (dt.getValue(0,c).equals("1")) {
                        dataMap.put("value", "开启");
                    } else {
                        dataMap.put("value", new BigDecimal(dt.getValue(0,c).toString()).setScale(1, RoundingMode.HALF_UP)+"  "+unit);
                    }
                }
            }
        }
    }
    dataList.add(dataMap);
}

data.put("dataList", dataList);

return data;