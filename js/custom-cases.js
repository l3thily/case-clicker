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
  const extra = [];
  const add = (id,n,desc,series,color,level,opens,budget,weights,type='w',match=null,from=null) =>
    extra.push({id,n,desc,series,color,level,opens,budget,weights,type,match,from,rtp:opens<30?.8:opens<100?.78:opens<250?.76:opens<500?.74:.72});
  // Rarity ladders: four guaranteed qualities and six distinct risk profiles.
  add('blueprint','Синий отдел','Только армейское качество','rarity','#4b69ff',1,2,.55,{2:100});
  add('purple-room','Фиолетовая комната','Только запрещённое качество','rarity','#8847ff',4,15,2,{3:100});
  add('pink-signal','Розовый сигнал','Только засекреченное качество','rarity','#d32ce6',9,65,8,{4:100});
  add('red-access','Красный допуск','Только тайное качество','rarity','#eb4b4b',15,160,25,{5:100});
  add('blue-shift','Сдвиг в фиолетовый','85% армейское · 15% запрещённое','rarity','#657aff',2,6,.8,{2:85,3:15});
  add('violet-hour','Фиолетовый час','85% запрещённое · 15% засекреченное','rarity','#b064ff',5,24,3,{3:85,4:15});
  add('pink-horizon','Розовый горизонт','90% засекреченное · 10% тайное','rarity','#fa68c4',11,85,12,{4:90,5:10});
  add('full-spectrum','Полный спектр','Вся шкала: от синего до золотого','rarity','#71c5ff',13,130,8,{2:65,3:25,4:8,5:1.8,6:.2},'mixed');
  add('red-wire','Красный провод','99% армейское · 1% тайное','rarity','#ff5f66',7,42,2,{2:99,5:1});
  add('gold-frequency','Золотая частота','98% армейское · 2% редкий особый','rarity','#f7c85d',18,230,8,{2:98,6:2},'mixed');
  add('coin-toss','Подброс монеты','50% армейское · 50% засекреченное','rarity','#c78bff',8,58,3,{2:50,4:50});
  // Each weapon series filters the actual weapon prefix, never a generic fallback.
  const weapons = [
    ['ak-club','Клуб Калашникова','AK-47',/^AK-47 \| /,'#f2a558',5,20,6],
    ['awp-observatory','Обсерватория AWP','AWP',/^AWP \| /,'#9d9fff',9,55,12],
    ['silencer','Тихая работа','M4A1-S',/^M4A1-S \| /,'#70d4c1',7,38,8],
    ['m4-barracks','Казарма M4A4','M4A4',/^M4A4 \| /,'#7baeff',6,32,6],
    ['deagle-duel','Один выстрел','Desert Eagle',/^Desert Eagle \| /,'#d9b87c',4,18,4],
    ['usp-ghost','Призрак USP','USP-S',/^USP-S \| /,'#c5d2e6',4,16,3],
    ['glock-party','Вечеринка Glock','Glock-18',/^Glock-18 \| /,'#fa85b4',3,12,2],
    ['p250-pocket','Карманный аргумент','P250',/^P250 \| /,'#9cdb9a',2,8,1],
    ['mp9-rush','Раш на MP9','MP9',/^MP9 \| /,'#ffd068',3,14,1.5],
    ['mac10-mixtape','Микстейп MAC-10','MAC-10',/^MAC-10 \| /,'#f193dd',3,11,1.5],
    ['scout-rooftop','Крыша со Scout','SSG 08',/^SSG 08 \| /,'#71bfcf',5,26,3],
    ['close-contact','Ближний контакт','Nova, XM1014, MAG-7 и Sawed-Off',/^(Nova|XM1014|MAG-7|Sawed-Off) \| /,'#c9a184',2,9,1],
    ['eco-round','Эконом-раунд','FAMAS и Galil AR',/^(FAMAS|Galil AR) \| /,'#b8c97a',3,13,1.2],
    ['pistol-round','Пистолетный раунд','Tec-9, Five-SeveN, CZ75-Auto, P2000 и Dual Berettas',/^(Tec-9|Five-SeveN|CZ75-Auto|P2000|Dual Berettas) \| /,'#9fb4d8',2,10,1],
  ];
  weapons.forEach(([id,n,weapon,match,color,level,opens,budget])=>add(id,n,'Только '+weapon,'weapon',color,level,opens,budget,{2:55,3:32,4:11,5:2},'w',match));
  // Colour / story themes are checked against skin names in the source catalogue.
  const themes = [
    ['scarlet','Багровый ритуал','Crimson, Blood и красные линии',/Crimson|Blood|Redline|Red |Hot Rod|Slaughter|Kill Confirmed/i,'#ef5d6c',8,48,8],
    ['cobalt','Кобальтовый берег','Синие, водные и кобальтовые мотивы',/Blue|Azure|Cobalt|Ocean|Water|Aquamarine/i,'#5a9dff',6,35,4],
    ['jungle','Зов джунглей','Лесные, зелёные и изумрудные мотивы',/Emerald|Green|Jungle|Forest|Boreal|Moss|Vine/i,'#69c892',4,22,2],
    ['noir','Нуар','Тёмные покрытия и карбон',/Black|Dark|Night|Carbon|Graphite|Slate/i,'#9ba9c3',7,44,5],
    ['porcelain','Фарфоровый арсенал','Светлые покрытия и футуризм',/White|Asiimov|Printstream|Ivory|Mecha|Arctic/i,'#dceaf5',12,105,18],
    ['midas','Прикосновение Мидаса','Золото, латунь, янтарь и медь',/Gold|Golden|Amber|Brass|Copper|Royal|Lore|Fuel Injector/i,'#e9bf55',14,145,20],
    ['ultraviolet','Ультрафиолет','Фиолетовые и хроматические мотивы',/Violet|Purple|Ultraviolet|Neo-Noir|Decimator|Chromatic/i,'#ba7dff',10,76,10],
    ['bestiary','Бестиарий','Драконы, Hyper Beast и мифические сюжеты',/Dragon|Desolate Space|Hyper Beast|The Empress/i,'#ff9c62',17,210,25],
    ['afterparty','После полуночи','Неон, диско и импульс',/Neon|Disco|Chromatic|Decimator|Pulse/i,'#e47ceb',9,60,8],
    ['sandstorm','Песчаная буря','Пустынные и выгоревшие покрытия',/Desert|Sand|Safari|Dust|Arid|Scorched|Oasis/i,'#dbbb82',2,7,.7],
    ['abyss','Давление глубины','Море, кораллы и подводные сюжеты',/Ocean|Water|Aquamarine|Coral|Abyss|Poseidon|Undertow/i,'#56d6d4',13,115,15],
    ['mainframe','Взлом мейнфрейма','Роботы, схемы и цифровые покрытия',/Asiimov|Mecha|Cyber|Circuit|Mainframe|System|Digital|Player Two/i,'#88d9b2',11,90,12],
    ['menagerie','Зверинец','Волки, тигры, змеи, акулы и другие звери',/Wolf|Tiger|Lion|Fox|Bear|Snake|Serpent|Viper|Cobra|Shark|Hawk|Eagle|Panther|Monkey|Kitsune|Jaguar|Raptor|Bunny|Frog/i,'#e0a46a',9,62,7],
    ['wildfire','Лесной пожар','Огонь, пламя, лава и фениксы',/Fire|Flame|Inferno|Blaze|Ember|Lava|Magma|Phoenix|Pyre|Torch|Heat/i,'#ff7a45',12,100,12],
  ];
  themes.forEach(([id,n,desc,match,color,level,opens,budget])=>add(id,n,desc,'theme',color,level,opens,budget,{2:55,3:30,4:12,5:3},'w',match));
  add('paper-trail','Бумажный след','Только наклейки высшего класса','sticker','#d8d0bc',1,4,.2,{2:100},'s');
  add('glitter-rain','Дождь из блёсток','Только наклейки Glitter','sticker','#f9b4df',5,28,1,{3:100},'s',/\(Glitter\)/i);
  add('holo-prism','Голографическая призма','Только голографические наклейки','sticker','#7ce5ec',8,52,3,{3:65,4:35},'s',/\(Holo\)/i);
  add('foil-forge','Мастерская фольги','Только наклейки Foil','sticker','#b7bbdb',10,72,5,{4:100},'s',/\(Foil\)/i);
  add('gold-leaf','Золотая печать','Только золотые наклейки','sticker','#f2ca68',19,255,20,{5:100},'s',/\(Gold\)/i);
  add('fan-sector','Фанатский сектор','Клубы и их игроки: NAVI, FaZe, G2 и другие','sticker','#ed956b',6,36,2,{2:65,3:25,4:8,5:2},'s',/Natus|NAVI|FaZe|G2 |Vitality|Spirit|Liquid|Cloud9|Astralis|Ninjas|Virtus/i);
  add('autograph-desk','За столом легенд','Наклейки из капсул с автографами','sticker','#a7a2ed',12,95,3,{2:65,3:25,4:8,5:2},'s',null,'autograph');
  add('time-capsule','Капсула времени','Только наклейки 2014–2015 годов','sticker','#d5b48a',21,310,15,{2:75,3:18,4:6,5:1},'s',/2014|2015/);
  add('sticker-cats','Кошачья контрабанда','Коты, лапки и пушистые мотивы','sticker','#ffacbf',7,40,1,{2:75,3:20,4:5},'s',/Cat|Kitty|Purr|Paw|Neko|Kawaii/i);
  add('craft-table','Стол крафтера','Бумага, голограммы, фольга и золото','sticker','#8ed3ac',14,125,4,{2:45,3:30,4:20,5:5},'s');
  const glove=/Gloves|Hand Wraps/i;
  add('knife-vault','Оружейник: клинки','В каждом открытии нож','elite','#f6cb70',24,420,15,{6:100},'k',it=>!glove.test(it.n));
  add('glove-box','Вторая кожа','В каждом открытии перчатки или обмотки','elite','#e7b999',23,390,12,{6:100},'k',it=>glove.test(it.n));
  add('butterfly-effect','Эффект бабочки','Только Butterfly Knife','elite','#c4a0ff',30,700,40,{6:100},'k',/Butterfly Knife/);
  add('karambit-orbit','Орбита керамбита','Только Karambit','elite','#ff9879',28,600,35,{6:100},'k',/Karambit/);
  add('doppler-lab','Лаборатория Доплера','Только ножи Doppler и Gamma Doppler','elite','#a182ef',32,820,30,{6:100},'k',/Doppler/);
  add('bayonet-line','Штыковая линия','Только Bayonet и M9 Bayonet','elite','#ffb37a',26,520,30,{6:100},'k',/Bayonet/);
  add('event-horizon','Горизонт событий','50% армейское · 50% нож или перчатки','elite','#ffd27a',35,1000,25,{2:50,6:50},'mixed');
  const legacy = specs.map(([id,n,desc,color,level,opens,rtp,type,budget,weights])=>({id,n,desc,color,level,opens,rtp,type,budget,weights,series:'classic'}));
  const fromPools = new Map();
  for(const b of data.boxes || []) {
    if(!fromPools.has(b.k))fromPools.set(b.k,new Set());
    Object.values(b.g).flat().forEach(i=>fromPools.get(b.k).add(i));
  }
  const bounds = [[0,.07],[.07,.15],[.15,.38],[.38,.45],[.45,1]];
  return [...legacy,...extra].map(({id,n,desc,color,level,opens,rtp,type,budget,weights,series,match,from}) => {
    const g={},variants={};
    for(const [tier,weight] of Object.entries(weights)) {
      const target=budget*(tier==6?30:tier==5?5:tier==4?2: tier==3?1:.4);
      const candidates=data.items.flatMap((it,i)=>{
        if(it.r!==+tier || !(type==='mixed' ? ['w','k'].includes(it.t) : it.t===type))return [];
        if(match && !(typeof match==='function' ? match(it) : match.test(it.n)))return [];
        if(from && !fromPools.get(from)?.has(i))return [];
        const possible=it.v?[0]:[2,1,3,0,4].filter(w=>it.p[w]>0 && Math.min(it.f[1],bounds[w][1])-Math.max(it.f[0],bounds[w][0])>.00001);
        const w=possible.find(w=>it.p[w]>0); if(w==null)return [];
        return [{i,w,p:it.p[w],distance:Math.abs(Math.log(it.p[w]/target))}];
      }).sort((a,b)=>a.distance-b.distance || data.items[a.i].n.localeCompare(data.items[b.i].n,'en'));
      const pool=candidates.slice(0,8); if(!pool.length)continue;
      g[tier]=pool.map(v=>v.i); pool.forEach(v=>{variants[v.i]=v.w;});
    }
    if(!Object.keys(g).length)return null; // A removed theme is hidden, never filled with unrelated drops.
    const odds=Object.fromEntries(Object.keys(g).map(t=>[t,weights[t]]));
    const total=Object.values(odds).reduce((a,b)=>a+b,0);
    const ev=Object.entries(g).reduce((sum,[t,ids])=>sum+odds[t]/total*ids.reduce((s,i)=>s+data.items[i].p[variants[i]],0)/ids.length,0);
    return {n,k:'custom',id,desc,color,series,level,opens,rtp,variants,weights:odds,g,p:Math.max(.1,Math.ceil(ev/rtp*100)/100),date:'2026-10-15',img:'./assets/custom/'+id+'.svg'};
  }).filter(Boolean);
};
