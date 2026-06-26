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
import com.sunwayland.platform.biz.platform.modules.dynamicsql.service.DataService;
import com.sunwayland.platform.dao.data.DataTable;
import com.sunwayland.platform.dao.impl.PsSqlImpl;
import com.sunwayland.platform.dynamic.DynamicDataSource;
import com.sunwayland.platform.utils.SnowFlake;
import java.text.SimpleDateFormat;
import com.sunwayland.platform.utils.HttpRequest;
import com.sunwayland.platform.dao.data.DataRow;
import java.text.ParseException;
import java.text.DecimalFormat;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.math.BigDecimal;
import java.math.RoundingMode;

        def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
        def dataService = ApplicationContextProvider.getBean(DataService.class);
        // 调用逻辑编排
        FeignSolAlgorithmProcess sol = ApplicationContextProvider.getBean(FeignSolAlgorithmProcess.class);

        String selectAreaSql = "select project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
        List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, "t01");
        //供暖面积
        BigDecimal heating_area = new BigDecimal(selectAreaList.get(0).get("project_acreage").toString());
        String start_heating_season = selectAreaList.get(0).get("start_heating_season").toString();
        String end_heating_season = selectAreaList.get(0).get("end_heating_season").toString();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        Calendar calendar = Calendar.getInstance();
        //当前年
        int year = calendar.get(Calendar.YEAR);
        //当前月
        int monthOfYear = calendar.get(Calendar.MONTH)+1;
        Date startDate = null;
        Date endDate = null;

        try {
            if (monthOfYear<7){
                startDate = sdf.parse((year-1)+"-"+start_heating_season+" 00:00:00");
                endDate = sdf.parse(year+"-"+end_heating_season+" 23:59:59");
            }else {
                startDate = sdf.parse(year+"-"+start_heating_season+" 00:00:00");
                endDate = sdf.parse((year+1)+"-"+end_heating_season+" 23:59:59");
            }
        } catch (ParseException e) {
            e.printStackTrace();
        }
        //是否在采暖季
        boolean isno_season = calendar.getTime().compareTo(startDate) >= 0 && calendar.getTime().compareTo(endDate) <= 0;

        if (!isno_season){
            return;
        }

        calendar.set(Calendar.SECOND,0);
        calendar.set(Calendar.MINUTE,0);
        calendar.set(Calendar.MILLISECOND,0);
        Instant instant = calendar.toInstant();
        LocalDateTime endtime_now = LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
        //当前天
        int day = calendar.get(Calendar.DAY_OF_MONTH);
        //当前小时
        int hour = calendar.get(Calendar.HOUR_OF_DAY);
        String end_time = sdf.format(calendar.getTime());
        calendar.add(Calendar.HOUR_OF_DAY,-1);
        Instant start_instant = calendar.toInstant();
        LocalDateTime starttime_now = LocalDateTime.ofInstant(start_instant, ZoneId.systemDefault());
        //上半小时的年
        int last_year = calendar.get(Calendar.YEAR);
        //上半小时的月
        int last_monthOfYear = calendar.get(Calendar.MONTH)+1;
        //上半小时的天
        int last_day = calendar.get(Calendar.DAY_OF_MONTH);
        String start_time = sdf.format(calendar.getTime());
        calendar.add(Calendar.MINUTE,-30);
        String last_start_time = sdf.format(calendar.getTime());

        Calendar calendaraf = Calendar.getInstance();
        calendaraf.add(Calendar.DAY_OF_MONTH,+1);
        //后一年
        int after_year = calendaraf.get(Calendar.YEAR);
        //后一月
        int after_monthOfYear = calendaraf.get(Calendar.MONTH)+1;
        //后一天
        int after_day = calendaraf.get(Calendar.DAY_OF_MONTH);

        //查询五个水泵上一周期最后一天数据时间
        String lasttime_sql="select a.taglongname,last(a.times) as times from pshisdata as a where a.taglongname in ('WaterMeter\\SJMG\\No1\\LJLL','WaterMeter\\SJMG\\No2\\LJLL'," +
                "'WaterMeter\\SJMG\\No3\\LJLL','WaterMeter\\SJMG\\No4\\LJLL','WaterMeter\\SJMG\\No5\\LJLL')" +
                " and a.starttime ='"+last_start_time+"' and a.endtime = '"+start_time+"' group by a.taglongname";

        Map<String,String> taglasttimemap=new HashMap<>();
        //查询五个热表上一周期最后一条数据时间
        DataTable dt = dataService.queryListDataBySql(lasttime_sql);
        for (int i = 0; i<dt.getRows().size(); i++){
            DataRow dataRow = dt.getDataRow(i);
            taglasttimemap.put(dataRow.getValue(0).toString(),dataRow.getValue(1).toString());
        }
        //根据上一周期最后一条时间和当前周期最后一条时间 计算增量
        DecimalFormat df = new DecimalFormat("0.00");
        //用水量
        BigDecimal waterdoconsumption = new BigDecimal("0.00");
        for (int i=1;i<=5;i++){
            String tag_long_name="WaterMeter\\SJMG\\No"+i+"\\LJLL";
            if (taglasttimemap.containsKey(tag_long_name)){
                String tag_start = taglasttimemap.get(tag_long_name);
                //查询上一周期最后一条和这个周期最后一条数据增量
                String subSql = "select a.taglongname,sub(a.hisval) as hisval,a.times from pshisdata as a where a.taglongname in ('"+tag_long_name+"') " +
                        "and a.starttime ='"+tag_start+"' and a.endtime = '"+end_time+"' group by a.taglongname";
                DataTable dt_sub = dataService.queryListDataBySql(subSql);
                if(dt_sub.getRows().size() == 1){
                    BigDecimal value = new BigDecimal(dt_sub.getValue(0,1).toString());
                    waterdoconsumption = waterdoconsumption.add(value);
                }
            }
        }
        waterdoconsumption = waterdoconsumption.setScale(2, RoundingMode.HALF_UP);

        //查询电价 水价配置信息
        String selectTimingSql = "select sept.energy_price_type_name,sept.fixed_price,sepd.unit_price,sepd.start_time,sepd.end_time,sepd.start_date,sepd.end_date,sepd.energy_price_name " +
                "from sjmg_energy_price_type sept LEFT JOIN sjmg_energy_price_detail sepd on sept.id=sepd.energy_price_type_uuid ORDER BY start_time asc";
        List<Map<String,Object>> selectTimingList = dynamicDataSource.excuteTenantSqlQuery(selectTimingSql, "t01");

        List<Map<String,Object>> selectTimingList_in = new ArrayList<>();
        BigDecimal waterprice=new BigDecimal("0.00");

        for(Map<String,Object> timing:selectTimingList){
            if (timing.get("energy_price_type_name").toString().equals("水")){
                waterprice = waterprice.add(new BigDecimal(timing.get("fixed_price").toString()));
                continue;
            }

            if (timing.get("energy_price_type_name").toString().equals("电")){
                String start_date = timing.get("start_date").toString();
                String end_date = timing.get("end_date").toString();
                String start_time_pz = timing.get("start_time").toString();
                String end_time_pz = timing.get("end_time").toString();
                Integer start_month = Integer.parseInt(start_date.split("-")[0]);
                Integer end_month = Integer.parseInt(end_date.split("-")[0]);
                
                Date startDate_eq = null;
                Date endDate_eq = null;

                try {
                    if (monthOfYear<7){
                        if (start_month>end_month){
                            startDate_eq = sdf.parse((year-1)+"-"+start_date+" 00:00:00");
                            endDate_eq = sdf.parse(year+"-"+end_date+" 23:59:59");
                        }else {
                            startDate_eq = sdf.parse(year+"-"+start_date+" 00:00:00");
                            endDate_eq = sdf.parse(year+"-"+end_date+" 23:59:59");
                        }
                    }else {
                        if (start_month>end_month){
                            startDate_eq = sdf.parse(year+"-"+start_date+" 00:00:00");
                            endDate_eq = sdf.parse((year+1)+"-"+end_date+" 23:59:59");
                        }else {
                            startDate_eq = sdf.parse(year+"-"+start_date+" 00:00:00");
                            endDate_eq = sdf.parse(year+"-"+end_date+" 23:59:59");
                        }
                    }
                } catch (ParseException e) {
                    e.printStackTrace();
                }
                //判断当前月是否在电价配置月里
                Calendar calendar1 = Calendar.getInstance();
                //判断当前月是否在电价配置月里
                boolean isno_inmonth = calendar1.getTime().compareTo(startDate_eq) >= 0 && calendar1.getTime().compareTo(endDate_eq) <= 0;
                if (isno_inmonth){
                    String[] start_time_sz = start_time_pz.split(":");
                    String[] end_time_sz = end_time_pz.split(":");
                    LocalDateTime starttime = null;
                    LocalDateTime endtime = null;
                    //根据数据库配置的时间 整理为当前天信息  进行时间段比较
                    if (hour==0){
                        starttime = LocalDateTime.of(last_year,last_monthOfYear,last_day,Integer.parseInt(start_time_sz[0]),Integer.parseInt(start_time_sz[1]),Integer.parseInt(start_time_sz[2]));
                        if (end_time_pz.equals("00:00:00")){
                            endtime = LocalDateTime.of(year,monthOfYear,day,Integer.parseInt(end_time_sz[0]),Integer.parseInt(end_time_sz[1]),Integer.parseInt(end_time_sz[2]));
                        }else {
                            endtime = LocalDateTime.of(last_year,last_monthOfYear,last_day,Integer.parseInt(end_time_sz[0]),Integer.parseInt(end_time_sz[1]),Integer.parseInt(end_time_sz[2]));
                        }
                    }else {
                        starttime = LocalDateTime.of(year,monthOfYear,day,Integer.parseInt(start_time_sz[0]),Integer.parseInt(start_time_sz[1]),Integer.parseInt(start_time_sz[2]));
                        if (end_time_pz.equals("00:00:00")){
                            endtime = LocalDateTime.of(after_year,after_monthOfYear,after_day,Integer.parseInt(end_time_sz[0]),Integer.parseInt(end_time_sz[1]),Integer.parseInt(end_time_sz[2]));
                        }else {
                            endtime = LocalDateTime.of(year,monthOfYear,day,Integer.parseInt(end_time_sz[0]),Integer.parseInt(end_time_sz[1]),Integer.parseInt(end_time_sz[2]));
                        }
                    }

                    //获取当前时间段和配置的时间段交集
                    LocalDateTime intersectionStart = starttime_now.isBefore(starttime) ? starttime : starttime_now;
                    LocalDateTime intersectionEnd = endtime_now.isBefore(endtime) ? endtime_now : endtime;
                    //如果有交集则放到集合
                    if (!intersectionStart.isAfter(intersectionEnd) && intersectionStart.compareTo(intersectionEnd)<0) {
                        Map<String,Object> timing_in = new HashMap<>();
                        DateTimeFormatter format = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                        timing_in.put("start",format.format(intersectionStart));
                        timing_in.put("end",format.format(intersectionEnd));
                        timing_in.put("unit_price",timing.get("unit_price").toString());
                        selectTimingList_in.add(timing_in);
                    }
                }
            }
        }


        //热泵支出
        BigDecimal heatcost = new BigDecimal("0.00");
        //水泵电支出
        BigDecimal watercostsb = new BigDecimal("0.00");
        //耦合支出
        BigDecimal ouhecost = new BigDecimal("0.00");

        //根据时间交集计算电支出
        for (Map<String,Object> timing_in : selectTimingList_in){
            String in_start = timing_in.get("start").toString();
            String in_end = timing_in.get("end").toString();
            BigDecimal unit_price = new BigDecimal(timing_in.get("unit_price").toString());

            String lasttimeeq_sql="select a.taglongname,last(a.times) as times from pshisdata as a where a.taglongname in ('ElectricityMeter\\SJMG\\No1\\LJHDL','ElectricityMeter\\SJMG\\No2\\LJHDL'," +
                    "'ElectricityMeter\\SJMG\\No3\\LJHDL','ElectricityMeter\\SJMG\\No4\\LJHDL','ElectricityMeter\\SJMG\\No5\\LJHDL','ElectricityMeter\\SJMG\\No6\\LJHDL','ElectricityMeter\\SJMG\\No7\\LJHDL'," +
                    "'ElectricityMeter\\SJMG\\No8\\LJHDL','ElectricityMeter\\SJMG\\No9\\LJHDL','ElectricityMeter\\SJMG\\No10\\LJHDL')" +
                    " and a.starttime ='"+last_start_time+"' and a.endtime = '"+in_start+"' group by a.taglongname";

            Map<String,String> taglasttimemapeq=new HashMap<>();
            //查询十个电表上一周期最后一条数据时间
            DataTable dteq = dataService.queryListDataBySql(lasttimeeq_sql);
            for (int i = 0; i<dteq.getRows().size(); i++){
                DataRow dataRow = dteq.getDataRow(i);
                taglasttimemap.put(dataRow.getValue(0).toString(),dataRow.getValue(1).toString());
            }

            last_start_time = in_start;

            //热泵用电量
            BigDecimal heatconsumption = new BigDecimal("0.00");
            //水泵用电量
            BigDecimal waterconsumption = new BigDecimal("0.00");
            //耦合能源用电量
            BigDecimal ouheconsumption = new BigDecimal("0.00");
            for (int i=1;i<=10;i++){
                String tag_long_name="ElectricityMeter\\SJMG\\No"+i+"\\LJHDL";
                if (taglasttimemap.containsKey(tag_long_name)){
                    String tag_start = taglasttimemap.get(tag_long_name);
                    //查询上一周期最后一条和这个周期最后一条数据增量
                    String subSql = "select a.taglongname,sub(a.hisval) as hisval,a.times from pshisdata as a where a.taglongname in ('"+tag_long_name+"') " +
                            "and a.starttime ='"+tag_start+"' and a.endtime = '"+in_end+"' group by a.taglongname";
                    DataTable dt_sub = dataService.queryListDataBySql(subSql);
                    if(dt_sub.getRows().size() == 1){
                        BigDecimal value = new BigDecimal(dt_sub.getValue(0,1).toString());
                        if (i<8){
                            heatconsumption = heatconsumption.add(value);
                        }else if (i<10){
                            waterconsumption = waterconsumption.add(value);
                        }else {
                            ouheconsumption = ouheconsumption.add(value);
                        }
                    }
                }
            }
            heatconsumption = heatconsumption.setScale(2, RoundingMode.HALF_UP);
            waterconsumption = waterconsumption.setScale(2, RoundingMode.HALF_UP);
            ouheconsumption = ouheconsumption.setScale(2, RoundingMode.HALF_UP);

            heatcost = heatcost.add(heatconsumption.multiply(unit_price)).setScale(2, RoundingMode.HALF_UP);
            watercostsb = watercostsb.add(waterconsumption.multiply(unit_price)).setScale(2, RoundingMode.HALF_UP);
            ouhecost = ouhecost.add(ouheconsumption.multiply(unit_price)).setScale(2, RoundingMode.HALF_UP);

        }
        //水费支出
        BigDecimal watercost=waterdoconsumption.multiply(waterprice).setScale(2, RoundingMode.HALF_UP);


        // 逻辑编排参数
        AlgorithmProcessExecuteParam param_write = new AlgorithmProcessExecuteParam();
        Map<String, Object> paramMap_write = new HashMap();
        param_write.setAlgorithmProcessId("writeRealvalByLongNames");
        Map<String, Object> paramData_write = new HashMap();

        //每小时支出点长名
        String tag_long_name_hour = "Sys\\FinforWorx\\SJFX\\ZC1";
        //每天支出点长名
        String tag_long_name_day = "Sys\\FinforWorx\\SJFX\\ZC2";
        //每月支出点长名
        String tag_long_name_month = "Sys\\FinforWorx\\SJFX\\ZC3";
        //每年支出点长名
        String tag_long_name_year = "Sys\\FinforWorx\\SJFX\\ZC4";
        //采暖季支出点长名
        String tag_long_name_season = "Sys\\FinforWorx\\SJFX\\ZC";

        Map<String,String> writeData = new HashMap<>();

        writeData.put(tag_long_name_hour+"_1",heatcost.toString());
        writeData.put(tag_long_name_hour+"_2",watercostsb.toString());
        writeData.put(tag_long_name_hour+"_3",ouhecost.toString());
        writeData.put(tag_long_name_hour+"_4",watercost.toString());
        writeData.put(tag_long_name_hour,heatcost.add(watercostsb).add(ouhecost).add(watercost).toString());

        int day_of_month = calendar.get(Calendar.DAY_OF_MONTH);

        if (hour==0){
            Calendar calendar_now = new GregorianCalendar();
            calendar_now.set(Calendar.MINUTE,0);
            calendar_now.set(Calendar.SECOND,0);
            //当天零点
            String nowday = sdf.format(calendar_now.getTime());
            calendar_now.add(Calendar.DAY_OF_MONTH,-1);
            //昨天零点
            String lastday = sdf.format(calendar_now.getTime());
            calendar_now.set(Calendar.DAY_OF_MONTH,1);

            for (int i=1;i<=5;i++){
                String num = "";
                if (i<5){
                    num="_"+i;
                }
                String day_sql="select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname = '"+tag_long_name_hour+num+"' and a.starttime ='"+lastday+"' and a.endtime = '"+nowday+"' limitpage 1,50";
                DataTable day_dt = dataService.queryListDataBySql(day_sql);
                //上一日支出
                BigDecimal lastdayvalue = new BigDecimal("0.00");
                for (int j = 0; j<day_dt.getRows().size(); j++){
                    DataRow dataRow = day_dt.getDataRow(j);
                    BigDecimal value = new BigDecimal(dataRow.getValue(2).toString());
                    lastdayvalue = lastdayvalue.add(value);
                }
                writeData.put(tag_long_name_day+num,lastdayvalue.add(new BigDecimal(writeData.get(tag_long_name_hour+num))).setScale(2, RoundingMode.HALF_UP).toString());
            }

            //是否是当月2号凌晨
            if (day_of_month==2){
                writeData.put(tag_long_name_month+"_1",heatcost.toString());
                writeData.put(tag_long_name_month+"_2",watercostsb.toString());
                writeData.put(tag_long_name_month+"_3",ouhecost.toString());
                writeData.put(tag_long_name_month+"_4",watercost.toString());
                writeData.put(tag_long_name_month,heatcost.add(watercostsb).add(ouhecost).add(watercost).toString());

                if (monthOfYear==1){
                    writeData.put(tag_long_name_year+"_1",heatcost.toString());
                    writeData.put(tag_long_name_year+"_2",watercostsb.toString());
                    writeData.put(tag_long_name_year+"_3",ouhecost.toString());
                    writeData.put(tag_long_name_year+"_4",watercost.toString());
                    writeData.put(tag_long_name_year,heatcost.add(watercostsb).add(ouhecost).add(watercost).toString());

                }else {
                    for (int i=1;i<=5;i++){
                        String num = "";
                        if (i<5){
                            num="_"+i;
                        }
                        String day_sql="select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('"+tag_long_name_year+num+"')";
                        //查询年支出并更新
                        DataTable day_dt = dataService.queryListDataBySql(day_sql);
                        for (int j = 0; j<day_dt.getRows().size(); j++){
                            DataRow dataRow = day_dt.getDataRow(j);
                            BigDecimal value = new BigDecimal(dataRow.getValue(2).toString());
                            writeData.put(dataRow.getValue(0).toString(),value.add(new BigDecimal(writeData.get(tag_long_name_day+num))).setScale(2, RoundingMode.HALF_UP).toString());
                        }

                    }

                }
            }else {
                for (int i=1;i<=5;i++){
                    String num = "";
                    if (i<5){
                        num="_"+i;
                    }
                    String day_sql="select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('"+tag_long_name_month+num+"','"+tag_long_name_year+num+"')";
                    //查询月年支出并更新
                    DataTable day_dt = dataService.queryListDataBySql(day_sql);
                    for (int j = 0; j<day_dt.getRows().size(); j++){
                        DataRow dataRow = day_dt.getDataRow(j);
                        BigDecimal value = new BigDecimal(dataRow.getValue(2).toString());
                        writeData.put(dataRow.getValue(0).toString(),value.add(new BigDecimal(writeData.get(tag_long_name_day+num))).setScale(2, RoundingMode.HALF_UP).toString());
                    }
                }
            }
        }


        for (int i=1;i<=5;i++){
            String num = "";
            if (i<5){
                num="_"+i;
            }
            String day_sql="select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('"+tag_long_name_season+num+"')";
            //查询采暖季并更新
            DataTable day_dt = dataService.queryListDataBySql(day_sql);
            for (int j = 0; j<day_dt.getRows().size(); j++){
                DataRow dataRow = day_dt.getDataRow(j);
                BigDecimal value = new BigDecimal(dataRow.getValue(2).toString());
                //单平米费用
                if (i==5){
                    BigDecimal dpmfy = value.add(new BigDecimal(writeData.get(tag_long_name_hour+num))).divide(heating_area, 2, BigDecimal.ROUND_HALF_UP);
                    writeData.put("Sys\\FinforWorx\\SJFX\\DPMFY",dpmfy.toString());
                }
                writeData.put(dataRow.getValue(0).toString(),value.add(new BigDecimal(writeData.get(tag_long_name_hour+num))).setScale(2, RoundingMode.HALF_UP).toString());
            }
        }


        // 执行下置业务编排
        paramMap_write.put("writeData", JSON.toJSONString(writeData));
        paramData_write.put("data", paramMap_write);
        param_write.setParam(paramData_write);
        sol.execute(param_write);

        // 逻辑编排参数
        AlgorithmProcessExecuteParam param_log = new AlgorithmProcessExecuteParam();
        Map<String, Object> paramMap_log = new HashMap();
        param_log.setAlgorithmProcessId("writeOperationLog");
        Map<String, Object> paramData_log = new HashMap();
        // 执行业务编排
        paramMap_log.put("operationType", "定时");
        paramMap_log.put("operationContent", "小时日月年支出统计计算");
        paramMap_log.put("operationPerson", "系统");
        paramData_log.put("data", paramMap_log);
        param_log.setParam(paramData_log);
        sol.execute(param_log);
        return data;
