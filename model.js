/* 龙门产业决策风洞 · 统一模型内核
   口径：2025年GDP 217.62亿；2030参考目标330亿。
   公开数据锚点 + 作者假设参数，非官方预测。
   注意：五路径μ合计≈112，故基线p50≈330是参数设定的结果，
   不构成对路径可行性的证明——仅回答"在这组假设下结果如何分布"。 */
(function(global){
  const BASE=217.62, TARGET=330, NOISE_SD=18;

  // 五条路：mu=满实现状态下5年累计增量期望(亿)，sigma=波动
  const PATHS=[
    {k:"bed",   n:"一张床·南昆山留宿", mu:32, sigma:11},
    {k:"film",  n:"功能膜新材料",   mu:30, sigma:12},
    {k:"spring",n:"温泉康养",      mu:22, sigma:9},
    {k:"agri",  n:"生态农业品牌",   mu:16, sigma:7},
    {k:"road",  n:"融深融穗通道",   mu:12, sigma:6}
  ];

  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  function gauss(rng){let u=0,v=0;while(u===0)u=rng();while(v===0)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}

  /* 情景参数（滑块真实驱动）：
     filmProgress  功能膜达产进度 0-100（影响film路径实现比例）
     disruptDays   每年雨季盘山通道中断天数（影响bed/spring旅游路径实现）
     delayYears    功能膜投产延迟年数 0-2（影响film路径5年内能兑现多少） */
  function applyScenario(p,sc){
    let mu=p.mu;
    if(p.k==="film"){
      const prog=0.35+0.65*(sc.filmProgress/100);     // 达产进度
      const timing=Math.max(0,1-sc.delayYears*0.28);  // 延迟折减
      mu=p.mu*prog*timing;
    }
    if(p.k==="bed")   mu=p.mu*(1-Math.min(0.6,sc.disruptDays*0.02));
    if(p.k==="spring")mu=p.mu*(1-Math.min(0.5,sc.disruptDays*0.012));
    return mu;
  }

  function run(seed=42,N=10000,sc){
    sc=sc||{filmProgress:100,disruptDays:0,delayYears:0};
    const rng=mulberry32(seed), samples=[];
    const mus=PATHS.map(p=>applyScenario(p,sc));
    for(let i=0;i<N;i++){
      let y=BASE;
      PATHS.forEach((p,j)=>{y+=mus[j]+p.sigma*gauss(rng);});
      y+=NOISE_SD*gauss(rng);
      samples.push(y);
    }
    samples.sort((a,b)=>a-b);
    const q=p=>samples[Math.min(N-1,Math.floor(p*N))];
    const p10=q(0.10),p50=q(0.50),p90=q(0.90);
    let hit=0;samples.forEach(x=>{if(x>=TARGET)hit++;});
    return {samples,p10,p50,p90,hit:hit/N*100,target:TARGET,base:BASE,paths:PATHS,mus,sc};
  }

  const FACTS={
    gdp:217.62, growth:7.4, pop:35.31, forest:76,
    ind:{p1:44.4,p1pct:20.4,p2:63.2,p2pct:29.0,p3:110,p3pct:50.5},
    indGrowth:{p1:4.6,p2:14.9,p3:6.8},
    tourism:{rev:43,visits:900,price:477,priceChg:-1.75,visitsChg:8.54},
    yonghan:{visitsChg:9.21,revChg:1.25,priceChg:-7.29},
    nksGrowth:3.17, indAbove:5.1,
    target2026:{regInd:150,regIndNow:119.5,need:25.5},
    film:{projects:68,invest:140,lines:620}
  };

  global.HT={run,FACTS,BASE,TARGET,PATHS};
})(window);
