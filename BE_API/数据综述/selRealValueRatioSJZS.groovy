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
import java.math.RoundingMode;

        def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
        def dataService = ApplicationContextProvider.getBean(DataService.class);
        String selectAreaSql = "select project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
        List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, "t01");

        //供暖季开始日
        String start_heating_season = selectAreaList.get(0).get("start_heating_season").toString();
        //供暖季结束日
        String end_heating_season = selectAreaList.get(0).get("end_heating_season").toString();

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        Calendar calendar = new GregorianCalendar();
        int year = calendar.get(Calendar.YEAR);
        int monthOfYear = calendar.get(Calendar.MONTH)+1;

        //上一个采暖季结束日期
        Date endDate = null;
        try {
            if (monthOfYear<7){
                endDate = sdf.parse((year-1)+"-"+end_heating_season+" 23:59:59");
            }else {
                endDate = sdf.parse((year)+"-"+end_heating_season+" 23:59:59");
            }
        } catch (ParseException e) {
            e.printStackTrace();
        }

        Calendar lastseason_calendar = new GregorianCalendar();
        lastseason_calendar.setTime(endDate);
        String lastseason_endtime = sdf.format(lastseason_calendar.getTime());
        lastseason_calendar.add(Calendar.DAY_OF_MONTH,-3);
        String lastseason_starttime = sdf.format(lastseason_calendar.getTime());

        //查询ProjectType，确定采暖/冷暖模式
        String projectTypeSql = "select a.taglongname,a.realval from psrealdata as a where a.taglongname = 'Sys\\FinforWorx\\ProjectType'";
        DataTable projectTypeDt = dataService.queryListDataBySql(projectTypeSql);
        String projectType = "1";
        if (projectTypeDt.getRows().size() > 0) {
            projectType = projectTypeDt.getDataRow(0).getValue(1).toString();
        }

        //根据模式确定COP、HDL、GRL对应的点位
        String copTagLongName;
        String grlTagLongName;
        String hdlTagLongName;
        String mode = "heating";

        if ("2".equals(projectType)) {
            //冷暖模式，查询HPTotalRunMode确定制热/制冷
            String runModeSql = "select a.taglongname,a.realval from psrealdata as a where a.taglongname = 'Sys\\FinforWorx\\HPTotalRunMode'";
            DataTable runModeDt = dataService.queryListDataBySql(runModeSql);
            String runMode = "1";
            if (runModeDt.getRows().size() > 0) {
                runMode = runModeDt.getDataRow(0).getValue(1).toString();
            }

            if ("0".equals(runMode)) {
                //制冷
                mode = "cooling";
                copTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Cold_COP";
                grlTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Colding_Energy";
                hdlTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Cold_Energy_Consumption";
            } else {
                //制热
                mode = "heating";
                copTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Heat_COP";
                grlTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Heating_Energy";
                hdlTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Heat_Energy_Consumption";
            }
        } else {
            //采暖模式
            mode = "heating";
            copTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Heat_COP";
            grlTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Heating_Energy";
            hdlTagLongName = "Sys\\FinforWorx\\EneryCost\\System_Cumulative_Heat_Energy_Consumption";
        }

        String last_season_data_sql="select a.taglongname,last(a.times) as times from pshisdata as a where a.taglongname in ('" + copTagLongName + "','" + grlTagLongName + "','" + hdlTagLongName + "','Sys\\FinforWorx\\SJFX\\DPMYDL','Sys\\FinforWorx\\SJFX\\DPMFY','Sys\\FinforWorx\\SJFX\\JFB','Sys\\FinforWorx\\SJFX\\JTL')" +
                " and a.starttime ='"+lastseason_starttime+"' and a.endtime = '"+lastseason_endtime+"' group by a.taglongname";

        Map<String,String> taglasttimemap=new HashMap<>();
        //数据综述上一个采暖季最后一条数据时间
        DataTable dt = dataService.queryListDataBySql(last_season_data_sql);
        for (int i = 0; i<dt.getRows().size(); i++){
            DataRow dataRow = dt.getDataRow(i);
            taglasttimemap.put(dataRow.getValue(0).toString(),dataRow.getValue(1).toString());
        }

        BigDecimal lastdpmydl = new BigDecimal("0.00");
        BigDecimal lastgrl = new BigDecimal("0.00");
        BigDecimal lasthdl = new BigDecimal("0.00");
        BigDecimal lastdpmfy = new BigDecimal("0.00");
        BigDecimal lastcop = new BigDecimal("0.00");
        BigDecimal lastjfb = new BigDecimal("0.00");
        BigDecimal lastjtl = new BigDecimal("0.00");

        for (String key : taglasttimemap.keySet()){
            String time = taglasttimemap.get(key);
            String hissql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname = '"+key+"'" +
                    " and a.starttime ='"+time+"' and a.endtime = '"+time+"' limitpage 1,50";
            DataTable dt_his = dataService.queryListDataBySql(hissql);
            if(dt_his.getRows().size() == 1){
                BigDecimal value = new BigDecimal(dt_his.getValue(0,2).toString()).setScale(2, RoundingMode.HALF_UP);
                String taglongname = dt_his.getValue(0,0).toString();
                if (taglongname.contains("DPMYDL")){
                    lastdpmydl = value;
                }else if (taglongname.equals(grlTagLongName)){
                    lastgrl = value;
                }else if (taglongname.equals(hdlTagLongName)){
                    lasthdl = value;
                }else if (taglongname.contains("DPMFY")){
                    lastdpmfy = value;
                }else if (taglongname.equals(copTagLongName)){
                    lastcop = value;
                }else if (taglongname.contains("JFB")){
                    lastjfb = value;
                }else if (taglongname.contains("JTL")){
                    lastjtl = value;
                }
            }
        }

        Calendar calendar_day = Calendar.getInstance();
        String day_end_time = sdf.format(calendar_day.getTime());
        calendar_day.set(Calendar.HOUR_OF_DAY, 0);
        calendar_day.set(Calendar.MINUTE, 30);
        String day_start_time = sdf.format(calendar_day.getTime());

        BigDecimal ydl1 = new BigDecimal("0.00");
        //查询今天用电量
        String ydlday_hissql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname = 'Sys\\FinforWorx\\SJFX\\YDL1'" +
                " and a.starttime ='" + day_start_time + "' and a.endtime = '" + day_end_time + "' limitpage 1,50";
        DataTable ydlday_dt_his = dataService.queryListDataBySql(ydlday_hissql);
        for (int i = 0; i < ydlday_dt_his.getRows().size(); i++) {
            ydl1 = ydl1.add(new BigDecimal(ydlday_dt_his.getValue(i, 2).toString()).setScale(2, RoundingMode.HALF_UP)) ;
        }

        BigDecimal hrl1 = new BigDecimal("0.00");
        //查询今天热量
        String hrlday_hissql = "select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname = 'Sys\\FinforWorx\\SJFX\\HRL1'" +
                " and a.starttime ='" + day_start_time + "' and a.endtime = '" + day_end_time + "' limitpage 1,50";
        DataTable hrlday_dt_his = dataService.queryListDataBySql(hrlday_hissql);
        for (int i = 0; i < hrlday_dt_his.getRows().size(); i++) {
            hrl1 = hrl1.add(new BigDecimal(hrlday_dt_his.getValue(i, 2).toString()).setScale(2, RoundingMode.HALF_UP)) ;
        }

        String season_data_sql="select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + copTagLongName + "','" + grlTagLongName + "','" + hdlTagLongName + "','Sys\\FinforWorx\\SJFX\\DPMYDL','Sys\\FinforWorx\\SJFX\\DPMFY','Sys\\FinforWorx\\SJFX\\JFB')";

        //数据综述本采暖季最后一条数据时间
        DataTable dt_rel = dataService.queryListDataBySql(season_data_sql);
        BigDecimal dpmydl = new BigDecimal("0.00");
        BigDecimal grl = new BigDecimal("0.00");
        BigDecimal hdl = new BigDecimal("0.00");
        BigDecimal dpmfy = new BigDecimal("0.00");
        BigDecimal cop = new BigDecimal("0.00");
        BigDecimal jfb = new BigDecimal("0.00");
        BigDecimal jtl = new BigDecimal("0.00");
        for (int i = 0; i<dt_rel.getRows().size(); i++){
            DataRow dataRow = dt_rel.getDataRow(i);
            String taglongname = dataRow.getValue(0).toString();
            BigDecimal value = new BigDecimal(dataRow.getValue(2).toString()).setScale(2, RoundingMode.HALF_UP);
            if (taglongname.contains("DPMYDL")){
                dpmydl = value;
            }else if (taglongname.equals(grlTagLongName)){
                grl = value.add(hrl1).setScale(0, RoundingMode.HALF_UP);
            }else if (taglongname.equals(hdlTagLongName)){
                hdl = value.add(ydl1);
            }else if (taglongname.contains("DPMFY")){
                dpmfy = value;
            }else if (taglongname.equals(copTagLongName)){
                cop = value;
            }else if (taglongname.contains("JFB")){
                jfb = value;
            }else if (taglongname.contains("JTL")){
                jtl = value;
            }
        }

        BigDecimal dpmydl_db = new BigDecimal("0.00");
        BigDecimal grl_db = new BigDecimal("0.00");
        BigDecimal hdl_db = new BigDecimal("0.00");
        BigDecimal dpmfy_db = new BigDecimal("0.00");
        BigDecimal cop_db = new BigDecimal("0.00");
        BigDecimal jfb_db = new BigDecimal("0.00");
        BigDecimal jtl_db = new BigDecimal("0.00");

        if (lastdpmydl.compareTo(BigDecimal.ZERO)!=0){
            dpmydl_db = dpmydl.subtract(lastdpmydl).divide(lastdpmydl,2,RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        }
        if (lastgrl.compareTo(BigDecimal.ZERO)!=0){
            grl_db = grl.subtract(lastgrl).divide(lastgrl,2,RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        }
        if (lasthdl.compareTo(BigDecimal.ZERO)!=0){
            hdl_db = hdl.subtract(lasthdl).divide(lasthdl,2,RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        }
        if (lastdpmfy.compareTo(BigDecimal.ZERO)!=0){
            dpmfy_db = dpmfy.subtract(lastdpmfy).divide(lastdpmfy,2,RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        }
        if (lastcop.compareTo(BigDecimal.ZERO)!=0){
            cop_db = cop.subtract(lastcop).divide(lastcop,2,RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        }
        if (lastjfb.compareTo(BigDecimal.ZERO)!=0){
            jfb_db = jfb.subtract(lastjfb).divide(lastjfb,2,RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        }
        if (lastjtl.compareTo(BigDecimal.ZERO)!=0){
            jtl_db = jtl.subtract(lastjtl).divide(lastjtl,2,RoundingMode.HALF_UP).multiply(new BigDecimal("100"));
        }
        
        Map<String,String> res = new HashMap<>();
        res.put("startHeatingSeason",start_heating_season);
        res.put("endHeatingSeason", end_heating_season);
        res.put("dpmydl",dpmydl.toString()+"_"+dpmydl_db.toString()+"%");
        res.put("grl",grl.toString()+"_"+grl_db.toString()+"%");
        res.put("hdl",hdl.toString()+"_"+hdl_db.toString()+"%");
        res.put("dpmfy",dpmfy.toString()+"_"+dpmfy_db.toString()+"%");
        res.put("cop",cop.toString()+"_"+cop_db.toString()+"%");
        res.put("jfb",jfb.toString()+"_"+jfb_db.toString()+"%");
        //res.put("jtl",jtl.toString()+"_"+jtl_db.toString()+"%");
        res.put("mode", mode);
        return res;
