/* 龙门产业风洞 · 统一模型内核
 * 生态县版：基期217.62亿，2030目标约350亿
 * 五条路：南昆山民宿升级 / 生态农业 / 康养旅游 / 融深融穗 / 低碳新能源
 */
window.HT = (function(){
  const BASE = 217.62;          // 2025 GDP（亿元）
  const TARGET = 330;           // 2030 参考目标（年均约7%）
  const NOISE_SD = 18;           // 加性全局噪声（亿元）
  const PATHS = [
    {name:"南昆山民宿升级", mu:38, sd:12},
    {name:"生态农业品牌",   mu:22, sd:8},
    {name:"康养温泉旅游",   mu:25, sd:10},
    {name:"融深融穗通道",   mu:15, sd:7},
    {name:"低碳新能源",     mu:12, sd:6}
  ];
  function rng(seed){let s=seed;return function(){s=(s*9301+49297)%233280;return s/233280;};}
  function normal(r){return (r()+r()+r()+r())-2;}
  function run(seed,N,overrides){
    N=N||10000;
    const r=rng(seed||42);
    const paths=PATHS.map((p,i)=>{
      if(overrides && overrides[i]!=null) return Object.assign({},p,{mu:overrides[i]});
      return p;
    });
    const results=[];
    for(let k=0;k<N;k++){
      let y=BASE;
      paths.forEach(p=>{ y+=p.mu+normal(r)*p.sd; });
      y+=normal(r)*NOISE_SD;
      results.push(y);
    }
    results.sort((a,b)=>a-b);
    const p10=results[Math.floor(N*0.10)];
    const p50=results[Math.floor(N*0.50)];
    const p90=results[Math.floor(N*0.90)];
    const hit=results.filter(x=>x>=TARGET).length/N*100;
    // 相关系数（路径mu变化对结果）
    const base=runOnce(BASE,paths,rng(seed||42));
    const coefs=paths.map((p,i)=>{
      const up=runOnce(BASE,paths.map((q,j)=>j===i?{mu:q.mu*1.2}:q),rng(seed||42));
      return (up-p50)/(p50||1);
    });
    return {p10,p50,p90,hit,results,coefs,paths,BASE,TARGET};
  }
  function runOnce(base,paths,r){
    let y=base;
    paths.forEach(p=>{y+=p.mu;});
    return y;
  }
  return {run,BASE,TARGET,PATHS};
})();
