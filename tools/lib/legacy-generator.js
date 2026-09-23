/**
 * outils/lib/legacy-generator.js
 *
 * RECOPIE CONFORME de l'algorithme de génération du prototype initial
 * (export DesignArena, commit f113093). Ne pas modifier : c'est la référence
 * d'identité des 365 coffrets. Modifier une seule ligne déplacerait
 * silencieusement tous les identifiants C-001 … C-365.
 *
 * Utilisé uniquement par outils/build-data.mjs --init pour figer les coffrets
 * une première fois. Ensuite, data/ devient la source de vérité et ce fichier
 * n'est plus qu'une archive exécutable (garantie de reproductibilité).
 */
export function generateLegacyItems(mulberry32, seed = 20250413) {
  const rnd = mulberry32(seed);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const MONTHS_FULL = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const MONTHS_SHORT = ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'];

  const SEASONS = [
    {id:'Hiver',     months:[11,0,1], color:'#5B7CFF'},
    {id:'Printemps', months:[2,3,4],  color:'#5FD08A'},
    {id:'Été',       months:[5,6,7],  color:'#FFC24B'},
    {id:'Automne',   months:[8,9,10], color:'#E4572E'}
  ];
  const seasonOf = m => SEASONS.find(s=>s.months.includes(m)) || SEASONS[0];

  /* ============================================================
     2. DONNÉES DE LA MÉTROPOLE
     ============================================================ */
  const CITIES = [
    {name:'Lille', w:24, venues:['Gare Saint-Sauveur','Palais Rameau','Hospice Comtesse','Vieux-Lille, rue de la Monnaie','Euralille, tour Lilleurope','Citadelle, bois de Boulogne','Gare Lille-Flandres','Jardin des Plantes','Wazemmes, marché de nuit','Maison de l’Habitat']},
    {name:'Roubaix', w:12, venues:['La Condition Publique','Le Colisée','Piscine Art déco','Cave des Trois Suisses','Parc de Barbieux','La Manufacture, ancienne filature']},
    {name:'Tourcoing', w:10, venues:['Le Fresnoy','Hôtel de ville de Tourcoing','Église Saint-Christophe','La Chaufferie, ex-filature','Béguinage de Tourcoing','Parc du Lion d’Or']},
    {name:'Villeneuve-d’Ascq', w:9, venues:['Château de Flers','LaM, parc de sculptures','Grand-Place de l’Ascq','Triolo, cité-jardin','Lac du Héron']},
    {name:'Marcq-en-Barœul', w:8, venues:['Hippodrome des Flandres','Parc du Lion','Quai des Flandres','Clos du Prieuré']},
    {name:'Lambersart', w:5, venues:['Villa Saint-Charles','Bords de Deûle','Château de la Hallotière']},
    {name:'Mons-en-Barœul', w:4, venues:['Fort de Mons','Parc du Fort','Cité du Nouveau Monde']},
    {name:'Wasquehal', w:4, venues:['Le Triporteur','Bois de la Houssière','Rives de la Marque']},
    {name:'Croix', w:4, venues:['Villa Cavrois','Parc de la Villa Cavrois','Église Saint-Martin']},
    {name:'Hem', w:3, venues:['Le Grand-Bar','Moulin de Hem','Ferme du Château']},
    {name:'Loos', w:3, venues:['Fort de Loos','Bords de la Deûle','Parc de Loos']},
    {name:'Faches-Thumesnil', w:3, venues:['Château de Faches','Parc des Hautes Rives']},
    {name:'Saint-André-lez-Lille', w:3, venues:['Bords de Deûle','Écluse de Saint-André','Cité des Peupliers']}
  ];
  const TOTALW = CITIES.reduce((a,c)=>a+c.w,0);
  function pickCity(){ let r = rnd()*TOTALW; for(const c of CITIES){ r -= c.w; if(r<=0) return c; } return CITIES[0]; }

  const STYLES = [
    {id:'brique',  name:'Brique & Fumée',       hue:16,  sat:62, line:'Murs de brique rouge, fumée douce, lumière rasante de fin d’après-midi.'},
    {id:'canal',   name:'Canal',                hue:192, sat:55, line:'Reflets d’eau, passerelles d’acier, brume du matin sur la Deûle.'},
    {id:'neon',    name:'Néon Urbain',          hue:308, sat:70, line:'Néons, béton brut, pluie fine sur l’asphalte et dancefloor jusqu’au dernier tram.'},
    {id:'vegetal', name:'Végétal Brut',         hue:132, sat:45, line:'Serres, houblon, fougères et lin brut froissé.'},
    {id:'beton',   name:'Béton Contemporain',   hue:222, sat:14, line:'Lignes nettes, béton ciré, blanc absolu et ombres graphiques.'},
    {id:'or',      name:'Or & Velours',         hue:44,  sat:70, line:'Velours profond, laiton poli, bougies et or patiné.'}
  ];

  const STYLE_TAGS = {
    brique:  ['Industriel','Brique','Loft','Fumée','Atelier'],
    canal:   ['Bord d’eau','Brume','Acier','Péniche','Reflets'],
    neon:    ['Néon','Nuit','Béton','Dancefloor','Pluie'],
    vegetal: ['Serre','Houblon','Lin','Fougère','Jardin'],
    beton:   ['Minimal','Graphique','Blanc','Architecture','Lignes'],
    or:      ['Velours','Laiton','Bougies','Baroque','Or patiné']
  };

  const A = ['Brique','Canal','Beffroi','Grand-Place','Houblon','Vieux-Lille','Escaut','Deûle','Flandre','Pavé','Verre','Acier','Tramway','Ch’ti','Nord','Marne','Béguinage','Estaminet','Citadelle','Gare'];
  const B = ['Or','Néon','Velours','Fumée','Blé','Pluie','Sucre','Papier','Lumière','Cuivre','Chaux','Lin','Vermeil','Brume','Sel','Ardoise','Cendre','Ocre','Givre','Zinc'];

  /* combinaisons uniques mélangées */
  let combos = [];
  for(const a of A) for(const b of B) combos.push(a+' & '+b);
  for(let i=combos.length-1;i>0;i--){ const j = Math.floor(rnd()*(i+1)); [combos[i],combos[j]] = [combos[j],combos[i]]; }

  const TEXTS = [
    it => `On entre par ${it.venue}, à ${it.city}. ${it.styleLine} Le coffret déroule douze pages d’inspiration, la carte des lumières heure par heure et l’annuaire des artisans qui tiennent la journée debout.`,
    it => `${it.venue} — ${it.city}. ${it.styleLine} Un objet éditorial pensé comme un plan-séquence : moodboard, repérages photo, timing de cérémonie et adresses 100 % métropole.`,
    it => `Dix heures de mariage en immersion à ${it.city}, depuis ${it.venue}. ${it.styleLine} À l’intérieur, les matières, les paliers de budget et les lieux alternatifs que personne ne vous montrera.`,
    it => `Le décor : ${it.venue}, ${it.city}. ${it.styleLine} Nous avons suivi les équipes du premier café au dernier verre, et tout consigné dans ce coffret numéroté.`
  ];

  const ITEMS = [];
  for(let i=1;i<=365;i++){
    const date = new Date(2025,0,i);
    const month = date.getMonth();
    const city = pickCity();
    const venue = pick(city.venues);
    const st = pick(STYLES);
    const hue = st.hue + (rnd()*26-13);
    const sat = Math.max(8, st.sat + (rnd()*16-8));
    const light = 7 + rnd()*6;
    const tagsPool = [...STYLE_TAGS[st.id]];
    const tags = [];
    while(tags.length<3 && tagsPool.length){
      tags.push(tagsPool.splice(Math.floor(rnd()*tagsPool.length),1)[0]);
    }
    const it = {
      id:i,
      code:'C-'+String(i).padStart(3,'0'),
      title:combos[i-1] || ('Coffret '+String(i).padStart(3,'0')),
      city:city.name, venue, styleId:st.id, styleName:st.name, styleLine:st.line,
      date, month, season:seasonOf(month).id,
      hue:Math.round(hue), sat:Math.round(sat), light:Math.round(light),
      tags,
      presta: 8 + Math.floor(rnd()*17),
      budget: 'à partir de ' + ((8 + Math.floor(rnd()*23))*1000).toLocaleString('fr-FR') + ' €',
      guests: (4 + Math.floor(rnd()*16))*10,
      pages: 12 + Math.floor(rnd()*20)
    };
    it.text = TEXTS[Math.floor(rnd()*TEXTS.length)](it);
    ITEMS.push(it);
  }
  return { ITEMS, CITIES, STYLES, STYLE_TAGS, SEASONS, MONTHS_FULL, MONTHS_SHORT, A, B };
}
