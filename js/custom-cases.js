'use strict';
// Author cases use fixed, disclosed wear variants. Repriced against the weekly dataset.
window.buildCustomCases = function (data) {
  const specs = [
    ['warmup', 'Разминка', 'Первый дроп', '#65dfb3', 0, 0, .8, 'w', .35, {2:82,3:16,4:2}],
    ['street', 'Уличный арсенал', 'Рабочие скины на каждый день', '#69a7ff', 3, 10, .78, 'w', 2, {2:65,3:28,4:6,5:1}],
    ['paper', 'Стикербомб', 'Бумага, блеск и первые голограммы', '#e4b5ff', 0, 3, .8, 's', .35, {2:80,3:17,4:3}],
    ['neon', 'Неоновая ночь', 'Яркие скины с характером', '#ba77ff', 6, 30, .76, 'w', 8, {2:55,3:32,4:11,5:2}],
    ['holo', 'Голографика', 'Капсула для своего крафта', '#55e4ec', 8, 50, .76, 's', 4, {2:60,3:28,4:10,5:2}],
    ['redline', 'Красная линия', 'Засекреченное и тайное', '#ff6478', 12, 100, .74, 'w', 25, {3:65,4:30,5:5}],
    ['hunt', 'Охота за ножом', 'Редкий особый: 1% за открытие', '#ffc55c', 16, 180, .72, 'mixed', 12, {2:70,3:23,4:5,5:1,6:1}],
    ['vault', 'Золотой резерв', 'Большой риск, большая цель', '#e4ae39', 22, 350, .72, 'mixed', 70, {3:60,4:28,5:10,6:2}],
  ];
  const bounds = [[0,.07],[.07,.15],[.15,.38],[.38,.45],[.45,1]];
  return specs.map(([id,n,desc,color,level,opens,rtp,type,budget,weights]) => {
    const g={},variants={};
    for(const [tier,weight] of Object.entries(weights)) {
      const target=budget*(tier==6?30:tier==5?5:tier==4?2: tier==3?1:.4);
      const candidates=data.items.flatMap((it,i)=>{
        if(it.r!==+tier || !(type==='mixed' ? ['w','k'].includes(it.t) : it.t===type))return [];
        const possible=it.v?[0]:[2,1,3,0,4].filter(w=>it.p[w]>0 && Math.min(it.f[1],bounds[w][1])-Math.max(it.f[0],bounds[w][0])>.00001);
        const w=possible.find(w=>it.p[w]>0); if(w==null)return [];
        return [{i,w,p:it.p[w],distance:Math.abs(Math.log(it.p[w]/target))}];
      }).sort((a,b)=>a.distance-b.distance || data.items[a.i].n.localeCompare(data.items[b.i].n,'en'));
      const pool=candidates.slice(0,8); if(!pool.length)continue;
      g[tier]=pool.map(v=>v.i); pool.forEach(v=>{variants[v.i]=v.w;});
    }
    const odds=Object.fromEntries(Object.keys(g).map(t=>[t,weights[t]]));
    const total=Object.values(odds).reduce((a,b)=>a+b,0);
    const ev=Object.entries(g).reduce((sum,[t,ids])=>sum+odds[t]/total*ids.reduce((s,i)=>s+data.items[i].p[variants[i]],0)/ids.length,0);
    return {n,k:'custom',id,desc,color,level,opens,rtp,variants,weights:odds,g,p:Math.max(.1,Math.ceil(ev/rtp*100)/100),date:'2026-10-15',img:'./assets/custom/'+id+'.svg'};
  });
};
