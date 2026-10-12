/* 龙门产业决策风洞 · 统一模型内核 v2
   路径层(驱动因子) + 时间层(逐年爬坡/过夜率渐进) + 关联层(互补/竞争/共同风险)
   基期2025：一产44.4 / 二产63.2 / 三产110.0，GDP 217.6；2030参考目标330。
   驱动因子经标定：2025年可还原旅游43.3亿/客单价478元（游客905.2万人次）。
   中断为"脉冲一次性冲击+恢复"，只作用于冲击当年、次年回趋势，不逐年重复。
   公开数据锚点 + 作者假设参数，非官方预测。 */
(function(global){
  const BASE=217.6, TARGET=330;
  const SHOCK_YEAR=1;
  // 中断D天 → 冲击当年净客流损失比例（与风洞恢复曲线同口径：中断期+恢复期，旺季加权、封顶）
  function shockTour(D){
    if(!D)return 0;
    const recDays=21;
    const loss=0.55*D+0.20*recDays;          // 人·天等价损失
    return Math.min(0.15,loss/365*2.4);      // 旺季权重约2.4，封顶15%
  }
  function shockAgri(D){return !D?0:Math.min(0.08,shockTour(D)*0.5);}
  const BP={p1:44.4,p2:63.2,p3:110.0};

  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function gauss(rng){let u=0,v=0;while(u===0)u=rng();while(v===0)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

  // 2030情景参数（滑块/假设驱动）
  const DEFAULT_SC={filmProgress:100,delayYears:0,disruptDays:0,stayRate:30,tourFocus:0.5,springOn:1,agriBrandOn:1,roadOn:1};
  const STAY2025=12;                 // 2025基期过夜率（假设，待验证）
  const FILM={invest:140,vaRate:0.28,ramp:[0.05,0.25,0.5,0.75,1.0]};
  const TOUR={visits2025:905.2,trend:0.06,daySpend:407,nightSpend:1000};
  const NONTOUR2025=66.7;            // 三产里旅游之外（110-43.3）

  function run(seed,N,sc){
    sc=Object.assign({},DEFAULT_SC,sc||{});
    const samples=[];
    for(let n=0;n<N;n++){
      const rng=mulberry32((seed+n*2654435761)>>>0);
      const filmRes=1-0.35*sc.tourFocus;   // 资源竞争
      const tourRes=0.65+0.35*sc.tourFocus;

      let visits=TOUR.visits2025,p1=BP.p1;
      const vTrend=sc.roadOn?TOUR.trend:TOUR.trend*0.3;       // 通道：客流趋势
      const effNight=TOUR.nightSpend*(sc.springOn?1:0.72);    // 温泉：过夜消费溢价
      for(let y=1;y<=5;y++){
        // —— 时间层：过夜率从12%渐进到目标 ——
        const stayR=(STAY2025+(sc.stayRate-STAY2025)*y/5)/100*(0.7+0.6*sc.tourFocus);
        // —— 三产 ——
        visits*=(1+vTrend+0.03*tourRes-(y===SHOCK_YEAR?shockTour(sc.disruptDays):0))*(1+0.035*gauss(rng));
        const nightV=visits*stayR,dayV=visits-nightV;
        const tourRev=(nightV*effNight+dayV*TOUR.daySpend)/10000;
        const nonTour=NONTOUR2025*Math.pow(1.06,y);
        const p3=tourRev+nonTour;
        // —— 二产：功能膜爬坡 + 存量 ——
        const ri=y-1-sc.delayYears;
        const ramp=ri>=0?FILM.ramp[Math.min(4,ri)]:0;
        const filmVA=FILM.invest*0.9*FILM.vaRate*ramp*(sc.filmProgress/100)*filmRes;
        const p2=BP.p2*Math.pow(1.05,y)+filmVA;
        // —— 一产：品牌溢价（互补于通道/旅游），量稳质升 ——
        const agriG=(sc.agriBrandOn?0.035*tourRes:0.008)*(sc.roadOn?1:0.5);
        p1=BP.p1*Math.pow(1+agriG,y)*(y===SHOCK_YEAR?(1-shockAgri(sc.disruptDays)):1)*(1+0.012*gauss(rng));
        if(y===5){samples.push(p1+p2*(1+0.035*gauss(rng))+p3*(1+0.035*gauss(rng))+12*gauss(rng));}
      }
    }
    samples.sort((a,b)=>a-b);
    const q=p=>samples[Math.min(N-1,Math.floor(p*N))];
    const p10=q(.1),p50=q(.5),p90=q(.9);
    let hit=0;samples.forEach(x=>{if(x>=TARGET)hit++;});
    return {samples,p10,p50,p90,hit:hit/N*100,target:TARGET,base:BASE,sc,decomp:decomp(sc)};
  }

  function decomp(sc){
    sc=Object.assign({},DEFAULT_SC,sc||{});
    const filmRes=1-0.35*sc.tourFocus,tourRes=0.65+0.35*sc.tourFocus;
    const stayR=sc.stayRate/100*(0.7+0.6*sc.tourFocus);
    const vTrend=sc.roadOn?TOUR.trend:TOUR.trend*0.3;
    const effNight=TOUR.nightSpend*(sc.springOn?1:0.72);
    let visits=TOUR.visits2025*(1+vTrend+0.03*tourRes-shockTour(sc.disruptDays));
    visits*=Math.pow(1+vTrend+0.03*tourRes,4);   // 冲击仅在第1年，后4年回趋势
    const nightV=visits*stayR,dayV=visits-nightV;
    const tourRev2030=(nightV*effNight+dayV*TOUR.daySpend)/10000;
    const ri=5-1-sc.delayYears,ramp=ri>=0?FILM.ramp[Math.min(4,ri)]:0;
    const filmVA=FILM.invest*.9*FILM.vaRate*ramp*(sc.filmProgress/100)*filmRes;
    const agriG=(sc.agriBrandOn?0.035*tourRes:0.008)*(sc.roadOn?1:0.5);
    return {p1:BP.p1*Math.pow(1+agriG,5)*(1-shockAgri(sc.disruptDays)),
            p2base:BP.p2*Math.pow(1.05,5),filmVA,
            nonTour:NONTOUR2025*Math.pow(1.06,5),tourRev2030,
            visits2030:visits,nightV,stayR:stayR*100};
  }

  const FACTS={gdp:217.6,growth:7.4,pop:35.31,forest:76,
    ind:{p1:44.4,p1pct:20.4,p2:63.2,p2pct:29.0,p3:110,p3pct:50.5},
    indGrowth:{p1:4.6,p2:14.9,p3:6.8},
    tourism:{rev:43.3,visits:905.2,price:478,priceChg:-1.75,visitsChg:8.54},
    yonghan:{visitsChg:9.21,revChg:1.25,priceChg:-7.29},
    nksGrowth:3.17,indAbove:5.1,
    target2026:{regInd:150,regIndNow:119.5,need:25.5},
    film:{projects:68,invest:140,lines:620,emerging:6.7,emergingG:80.6}};

  global.HT={run,FACTS,BASE,TARGET,DEFAULT_SC,shockTour};
})(window);
