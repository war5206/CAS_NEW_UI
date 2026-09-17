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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

        def dynamicDataSource = ApplicationContextProvider.getBean(DynamicDataSource.class);
        def dataService = ApplicationContextProvider.getBean(DataService.class);

        PtUser ptUser = ThreadLocalUtil.getCurrentUser();
        String dbCode = ptUser != null && ptUser.dbCode != null ? ptUser.dbCode.toString() : "t01";
        if ("base".equals(dbCode)) {
            dbCode = "t01";
        }

        def escapeSql(String s) {
            if (s == null) return "";
            return s.replace("'", "''");
        }

        def queryCostSum(dynamicDataSource, dbCode, startDate, endDate) {
            String sql = "SELECT COALESCE(SUM(cost_amount), 0) AS total_cost FROM sjmg_energy_cost_daily_detail " +
                    "WHERE stat_date >= '" + escapeSql(startDate) + "' AND stat_date <= '" + escapeSql(endDate) + "' " +
                    "AND device_code = 'SYSTEM'";
            try {
                List<Map<String,Object>> rows = dynamicDataSource.excuteTenantSqlQuery(sql, dbCode);
                if (rows != null && !rows.isEmpty() && rows.get(0).get("total_cost") != null) {
                    return new BigDecimal(rows.get(0).get("total_cost").toString()).setScale(2, RoundingMode.HALF_UP);
                }
            } catch (Exception ignored) {
            }
            return new BigDecimal("0.00");
        }

        def resolveHeatingSeasonCostRanges(String startMonthDay, String endMonthDay) {
            int startMonth = Integer.parseInt(startMonthDay.substring(0, 2));
            int startDay = Integer.parseInt(startMonthDay.substring(3, 5));
            int endMonth = Integer.parseInt(endMonthDay.substring(0, 2));
            int endDay = Integer.parseInt(endMonthDay.substring(3, 5));
            boolean crossYear = startMonth > endMonth || (startMonth == endMonth && startDay > endDay);

            LocalDate today = LocalDate.now();
            LocalDate currentStart;
            LocalDate currentEnd;
            LocalDate startThisYear = LocalDate.of(today.getYear(), startMonth, startDay);
            LocalDate endThisYear = LocalDate.of(today.getYear(), endMonth, endDay);

            if (crossYear) {
                if (!today.isBefore(startThisYear)) {
                    // 当年跨年采暖季已开始：当年开始日至今日
                    currentStart = startThisYear;
                    currentEnd = today;
                } else if (!today.isAfter(endThisYear)) {
                    // 处于上年开始、当年结束的采暖季内
                    currentStart = LocalDate.of(today.getYear() - 1, startMonth, startDay);
                    currentEnd = today;
                } else {
                    // 非采暖季：展示最近一个已完成采暖季
                    currentStart = LocalDate.of(today.getYear() - 1, startMonth, startDay);
                    currentEnd = endThisYear;
                }
            } else {
                if (today.isBefore(startThisYear)) {
                    currentStart = LocalDate.of(today.getYear() - 1, startMonth, startDay);
                    currentEnd = LocalDate.of(today.getYear() - 1, endMonth, endDay);
                } else if (today.isAfter(endThisYear)) {
                    currentStart = startThisYear;
                    currentEnd = endThisYear;
                } else {
                    currentStart = startThisYear;
                    currentEnd = today;
                }
            }

            LocalDate previousStart = currentStart.minusYears(1);
            LocalDate previousEnd = currentEnd.minusYears(1);
            Map<String, String> ranges = new HashMap<>();
            ranges.put("currentStart", currentStart.format(DateTimeFormatter.ISO_LOCAL_DATE));
            ranges.put("currentEnd", currentEnd.format(DateTimeFormatter.ISO_LOCAL_DATE));
            ranges.put("previousStart", previousStart.format(DateTimeFormatter.ISO_LOCAL_DATE));
            ranges.put("previousEnd", previousEnd.format(DateTimeFormatter.ISO_LOCAL_DATE));
            return ranges;
        }

        /*
         * 数据综述同比测试改变“上期历史窗口”、“本期日辅助量窗口”和费用对比日期。
         * 点位选择、实时读取、历史读取、同比公式和页面返回全部复用正式代码。
         * 测试完成后必须把 SUMMARY_TEST_MODE 改为 false。
         */
        boolean SUMMARY_TEST_MODE = false;
        String TEST_PREVIOUS_START_TIME = "11:00:00";
        String TEST_PREVIOUS_END_TIME = "11:04:59";
        String TEST_CURRENT_START_TIME = "11:05:00";
        String TEST_CURRENT_END_TIME = "11:07:59";
        String TEST_PREVIOUS_COST_DATE = "2025-09-01";
        String TEST_CURRENT_COST_DATE = "2026-09-01";

        String selectAreaSql = "select project_acreage,start_heating_season,end_heating_season from sjmg_project_data";
        List<Map<String,Object>> selectAreaList = dynamicDataSource.excuteTenantSqlQuery(selectAreaSql, dbCode);

        //供暖面积
        BigDecimal projectAcreage = new BigDecimal("0.00");
        try {
            Object acreageObj = selectAreaList.get(0).get("project_acreage");
            if (acreageObj != null && !"".equals(acreageObj.toString().trim())) {
                projectAcreage = new BigDecimal(acreageObj.toString().trim()).setScale(2, RoundingMode.HALF_UP);
            }
        } catch (Exception ignored) {
        }

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
        if (SUMMARY_TEST_MODE) {
            String testDate = new SimpleDateFormat("yyyy-MM-dd").format(calendar.getTime());
            lastseason_starttime = testDate + " " + TEST_PREVIOUS_START_TIME;
            lastseason_endtime = testDate + " " + TEST_PREVIOUS_END_TIME;
        }

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
                copTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Cold_COP";
                grlTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Colding_Energy";
                hdlTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Cold_Energy_Consumption";
            } else {
                //制热
                mode = "heating";
                copTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Heat_COP";
                grlTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Heating_Energy";
                hdlTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Heat_Energy_Consumption";
            }
        } else {
            //采暖模式
            mode = "heating";
            copTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Heat_COP";
            grlTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Heating_Energy";
            hdlTagLongName = "Sys\\FinforWorx\\EnergyCost\\System_Cumulative_Heat_Energy_Consumption";
        }

        String last_season_data_sql="select a.taglongname,a.times,a.hisval from pshisdata as a where a.taglongname in ('" + copTagLongName + "','" + grlTagLongName + "','" + hdlTagLongName + "','Sys\\FinforWorx\\SJFX\\DPMYDL','Sys\\FinforWorx\\SJFX\\DPMFY','Sys\\FinforWorx\\SJFX\\JFB','Sys\\FinforWorx\\SJFX\\JTL')" +
                " and a.starttime ='"+lastseason_starttime+"' and a.endtime = '"+lastseason_endtime+"'";

        BigDecimal lastdpmydl = new BigDecimal("0.00");
        BigDecimal lastgrl = new BigDecimal("0.00");
        BigDecimal lasthdl = new BigDecimal("0.00");
        BigDecimal lastdpmfy = new BigDecimal("0.00");
        BigDecimal lastcop = new BigDecimal("0.00");
        BigDecimal lastjfb = new BigDecimal("0.00");
        BigDecimal lastjtl = new BigDecimal("0.00");

        DataTable dt = dataService.queryListDataBySql(last_season_data_sql);
        for (int i = 0; i<dt.getRows().size(); i++){
            DataRow dataRow = dt.getDataRow(i);
            String taglongname = dataRow.getValue(0).toString();
            BigDecimal value = new BigDecimal(dataRow.getValue(2).toString()).setScale(2, RoundingMode.HALF_UP);
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

        Calendar calendar_day = Calendar.getInstance();
        String day_end_time = sdf.format(calendar_day.getTime());
        calendar_day.set(Calendar.HOUR_OF_DAY, 0);
        calendar_day.set(Calendar.MINUTE, 30);
        String day_start_time = sdf.format(calendar_day.getTime());
        if (SUMMARY_TEST_MODE) {
            String testDate = new SimpleDateFormat("yyyy-MM-dd").format(calendar_day.getTime());
            day_start_time = testDate + " " + TEST_CURRENT_START_TIME;
            day_end_time = testDate + " " + TEST_CURRENT_END_TIME;
        }

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

        String season_data_sql="select a.taglongname,a.times,a.realval,a.quality from psrealdata as a where a.taglongname in ('" + copTagLongName + "','" + grlTagLongName + "','" + hdlTagLongName + "','Sys\\FinforWorx\\SJFX\\JFB')";

        //数据综述本采暖季最后一条数据时间
        DataTable dt_rel = dataService.queryListDataBySql(season_data_sql);
        BigDecimal grl = new BigDecimal("0.00");
        BigDecimal hdl = new BigDecimal("0.00");
        BigDecimal cop = new BigDecimal("0.00");
        BigDecimal jfb = new BigDecimal("0.00");
        BigDecimal jtl = new BigDecimal("0.00");
        for (int i = 0; i<dt_rel.getRows().size(); i++){
            DataRow dataRow = dt_rel.getDataRow(i);
            String taglongname = dataRow.getValue(0).toString();
            BigDecimal value = new BigDecimal(dataRow.getValue(2).toString()).setScale(2, RoundingMode.HALF_UP);
            if (taglongname.equals(grlTagLongName)){
                grl = value.add(hrl1).setScale(0, RoundingMode.HALF_UP);
            }else if (taglongname.equals(hdlTagLongName)){
                hdl = value.add(ydl1);
            }else if (taglongname.equals(copTagLongName)){
                cop = value;
            }else if (taglongname.contains("JFB")){
                jfb = value;
            }else if (taglongname.contains("JTL")){
                jtl = value;
            }
        }

        // 单平米用电量/费用：仅在制热模式下按公式计算；制冷模式返回空
        String dpmydl = "";
        String dpmfy = "";
        BigDecimal dpmydl_db = new BigDecimal("0.00");
        BigDecimal dpmfy_db = new BigDecimal("0.00");
        BigDecimal currentCostSum = new BigDecimal("0.00");
        BigDecimal lastCostSum = new BigDecimal("0.00");
        if ("heating".equals(mode) && projectAcreage.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal perAreaElec = hdl.divide(projectAcreage, 2, RoundingMode.HALF_UP);
            dpmydl = perAreaElec.toString();

            // 正式模式按采暖季当期/上年同期查询；测试模式仅替换日期范围。
            Map<String, String> costRanges = resolveHeatingSeasonCostRanges(start_heating_season, end_heating_season);
            String currentCostStart = costRanges.get("currentStart");
            String currentCostEnd = costRanges.get("currentEnd");
            String previousCostStart = costRanges.get("previousStart");
            String previousCostEnd = costRanges.get("previousEnd");
            if (SUMMARY_TEST_MODE) {
                currentCostStart = TEST_CURRENT_COST_DATE;
                currentCostEnd = TEST_CURRENT_COST_DATE;
                previousCostStart = TEST_PREVIOUS_COST_DATE;
                previousCostEnd = TEST_PREVIOUS_COST_DATE;
            }
            currentCostSum = queryCostSum(dynamicDataSource, dbCode, currentCostStart, currentCostEnd);
            BigDecimal perAreaCost = currentCostSum.divide(projectAcreage, 2, RoundingMode.HALF_UP);
            dpmfy = perAreaCost.toString();

            // 单平米用电量同比 = 用电量同比（同除面积，比例不变）
            if (lasthdl.compareTo(BigDecimal.ZERO) != 0) {
                dpmydl_db = hdl.subtract(lasthdl).multiply(new BigDecimal("100")).divide(lasthdl, 2, RoundingMode.HALF_UP);
            }

            // 单平米费用同比：当期费用与上年同期费用对比（面积相同，比例不变）。
            lastCostSum = queryCostSum(dynamicDataSource, dbCode, previousCostStart, previousCostEnd);

            if (lastCostSum.compareTo(BigDecimal.ZERO) != 0) {
                dpmfy_db = currentCostSum.subtract(lastCostSum).multiply(new BigDecimal("100")).divide(lastCostSum, 2, RoundingMode.HALF_UP);
            }
        }

        BigDecimal grl_db = new BigDecimal("0.00");
        BigDecimal hdl_db = new BigDecimal("0.00");
        BigDecimal cop_db = new BigDecimal("0.00");
        BigDecimal jfb_db = new BigDecimal("0.00");
        BigDecimal jtl_db = new BigDecimal("0.00");

        if (lastgrl.compareTo(BigDecimal.ZERO)!=0){
            grl_db = grl.subtract(lastgrl).multiply(new BigDecimal("100")).divide(lastgrl,2,RoundingMode.HALF_UP);
        }
        if (lasthdl.compareTo(BigDecimal.ZERO)!=0){
            hdl_db = hdl.subtract(lasthdl).multiply(new BigDecimal("100")).divide(lasthdl,2,RoundingMode.HALF_UP);
        }
        if (lastcop.compareTo(BigDecimal.ZERO)!=0){
            cop_db = cop.subtract(lastcop).multiply(new BigDecimal("100")).divide(lastcop,2,RoundingMode.HALF_UP);
        }
        if (lastjfb.compareTo(BigDecimal.ZERO)!=0){
            jfb_db = jfb.subtract(lastjfb).multiply(new BigDecimal("100")).divide(lastjfb,2,RoundingMode.HALF_UP);
        }
        if (lastjtl.compareTo(BigDecimal.ZERO)!=0){
            jtl_db = jtl.subtract(lastjtl).multiply(new BigDecimal("100")).divide(lastjtl,2,RoundingMode.HALF_UP);
        }
        
        Map<String,String> res = new HashMap<>();
        res.put("startHeatingSeason",start_heating_season);
        res.put("endHeatingSeason", end_heating_season);
        res.put("dpmydl",dpmydl.isEmpty() ? "" : dpmydl + "_" + dpmydl_db.toString() + "%");
        res.put("grl",grl.toString()+"_"+grl_db.toString()+"%");
        res.put("hdl",hdl.toString()+"_"+hdl_db.toString()+"%");
        res.put("dpmfy",dpmfy.isEmpty() ? "" : dpmfy + "_" + dpmfy_db.toString() + "%");
        res.put("cop",cop.toString()+"_"+cop_db.toString()+"%");
        res.put("jfb",jfb.toString()+"_"+jfb_db.toString()+"%");
        //res.put("jtl",jtl.toString()+"_"+jtl_db.toString()+"%");
        res.put("mode", mode);
        if (SUMMARY_TEST_MODE) {
            res.put("testMode", "true");
            res.put("testPreviousHistoryStart", lastseason_starttime);
            res.put("testPreviousHistoryEnd", lastseason_endtime);
            res.put("testCurrentHelperStart", day_start_time);
            res.put("testCurrentHelperEnd", day_end_time);
            res.put("testPreviousValues", "cop=" + lastcop + ",grl=" + lastgrl + ",hdl=" + lasthdl);
            res.put("testCurrentValues", "cop=" + cop + ",grl=" + grl + ",hdl=" + hdl + ",projectAcreage=" + projectAcreage + ",currentCostSum=" + currentCostSum + ",lastCostSum=" + lastCostSum + ",dpmydl=" + dpmydl + ",dpmfy=" + dpmfy);
        }
        return res;
