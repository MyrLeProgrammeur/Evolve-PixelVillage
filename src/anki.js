/* [anki-fork] Lien Anki, partie intégrée au jeu (B4, B5) :
 *  - état persistant global.anki, enregistré avec la sauvegarde d'Evolve (clearStates ne le touche pas) ;
 *  - horloge à cartes : le nombre de ticks de simulation (fastLoop/midLoop/longLoop) est réglé ici,
 *    comme le fait déjà le « temps accéléré » d'Evolve (loopTimers) : tout ce qui se passe dans les
 *    boucles (production, calendrier, population, événements, file de construction) suit l'horloge ;
 *  - ankiMult(res) : point unique des multiplicateurs Anki par ressource (somme additive plafonnée) ;
 *  - interrupteur facultatif de la cueillette manuelle (seule production hors des boucles).
 * Par défaut (mode 'original', aucun bonus), le jeu se comporte exactement comme l'original. */
import { global, breakdown, save } from './vars.js';

const CLOCK_DEFAULTS = {
    mode: 'original',   // 'original' = temps réel d'Evolve ; 'cards' = le temps vient des révisions
    passive: 0,         // part du temps réel conservée en mode cartes (0 = production passive coupée, 1 = normale)
    ticksPerCard: 20,   // ticks de simulation par crédit plein (20 ticks = 1 jour d'Evolve = 5 s de jeu)
    drain: 8,           // au plus `drain` ticks de la réserve joués par tick réel (vitesse de rattrapage x8)
    bank: 0,            // ticks gagnés et pas encore joués
    frac: 0,            // fraction de tick passif accumulée
    noManual: false     // true : la cueillette manuelle est coupée en mode cartes
};

export function ankiState(){
    if (!global.anki || typeof global.anki !== 'object'){ global.anki = {}; }
    const a = global.anki;
    if (!a.v){ a.v = 1; }
    if (typeof a.epoch !== 'number'){ a.epoch = 0; }          // 0 = jamais relié ; posé par le pont à la 1re connexion
    if (!a.granted){ a.granted = { base: 0, noble: 0 }; }     // filigrane monotone de ce qui a été versé (millièmes)
    if (!a.reserve){ a.reserve = {}; }                         // ressource -> quantité due mais pas encore livrée
    if (!a.delivered){ a.delivered = {}; }                     // ressource -> total livré (statistiques)
    if (!a.ticks){ a.ticks = { granted: 0 }; }                 // ticks d'horloge déjà accordés (millièmes de crédit)
    if (!a.streak){ a.streak = { best: 0, heat: 0, current: 0 }; }
    if (!Array.isArray(a.perks)){ a.perks = []; }              // bonus permanents : on n'en retire jamais
    if (!a.today){ a.today = { day: 0, credits: 0, cids: [] }; }
    if (!a.mult){ a.mult = {}; }                               // feature -> { ressource: bonus (0.1 = +10 %) }
    if (!a.multCap){ a.multCap = { '*': 0.4 }; }               // plafond de la somme, par ressource ('*' = défaut)
    if (!a.clock || typeof a.clock !== 'object'){ a.clock = {}; }
    Object.keys(CLOCK_DEFAULTS).forEach(function(k){
        if (a.clock[k] === undefined){ a.clock[k] = CLOCK_DEFAULTS[k]; }
    });
    return a;
}

/* Horloge à cartes : appelée par execGameLoops avec le nombre de ticks réels écoulés,
   renvoie le nombre de ticks de simulation à jouer. */
export function ankiClockGate(periods, max){
    const c = ankiState().clock;
    if (c.mode !== 'cards'){ return periods; }
    const limit = max > 0 ? max : Infinity;
    let passive = Math.max(0, Math.min(1, Number(c.passive) || 0));
    c.frac = (Number(c.frac) || 0) + periods * passive;
    let n = Math.min(Math.floor(c.frac), limit);
    c.frac -= n;
    if (c.frac > limit){ c.frac = limit; }                  // pas d'accumulation sans fin si l'onglet dort
    if (c.bank > 0 && n < limit){
        // La réserve n'est jamais perdue : on ne prélève que ce qui sera joué.
        let d = Math.min(c.bank, Math.max(1, c.drain | 0) * periods, limit - n);
        c.bank -= d;
        n += d;
    }
    return n;
}

/* Multiplicateur Anki d'une ressource : 1 + min(plafond, somme des bonus des features). */
export function ankiMult(res){
    const a = global.anki;
    if (!a || !a.mult){ return 1; }
    let sum = 0;
    Object.keys(a.mult).forEach(function(f){
        const m = a.mult[f];
        if (m && typeof m[res] === 'number'){ sum += m[res]; }
        if (m && typeof m['*'] === 'number'){ sum += m['*']; }
    });
    if (sum === 0){ return 1; }
    const capTable = a.multCap || {};
    const cap = typeof capTable[res] === 'number' ? capTable[res] : (typeof capTable['*'] === 'number' ? capTable['*'] : 0.4);
    sum = Math.max(-cap, Math.min(cap, sum));
    if (breakdown.p[res]){ breakdown.p[res]['Anki'] = +(sum * 100).toFixed(1) + '%'; }
    return 1 + sum;
}

/* En mode cartes, la sauvegarde d'Evolve (faite dans longLoop) s'arrête avec l'horloge :
   on sauvegarde donc aussi au temps réel, au plus toutes les 5 s. Rien ne change en mode original. */
let lastSave = Date.now();
export function ankiMaybeSave(){
    const a = global.anki;
    if (!a || !a.clock || a.clock.mode !== 'cards'){ return; }
    const now = Date.now();
    if (now - lastSave < 5000 || global.race.hasOwnProperty('geck') || typeof LZString === 'undefined'){ return; }
    lastSave = now;
    save.setItem('evolved', LZString.compressToUTF16(JSON.stringify(global)));
}

/* La cueillette manuelle (clic) est-elle permise ? Elle est la seule production hors des boucles. */
export function ankiAllowGather(){
    const a = global.anki;
    return !(a && a.clock && a.clock.mode === 'cards' && a.clock.noManual);
}

ankiState();

if (typeof window !== 'undefined'){
    window.ankiClock = {
        get(){ return Object.assign({}, ankiState().clock); },
        set(opts){
            const c = ankiState().clock;
            Object.keys(opts || {}).forEach(function(k){
                if (k in CLOCK_DEFAULTS && k !== 'bank' && k !== 'frac'){ c[k] = opts[k]; }
            });
            return Object.assign({}, c);
        },
        addTicks(n){
            const c = ankiState().clock;
            if (n > 0){ c.bank += Math.floor(n); }
            return c.bank;
        }
    };
    window.ankiMult = function(res){ return ankiMult(res); };
    window.ankiMult.set = function(feature, res, bonus){
        const a = ankiState();
        if (!a.mult[feature]){ a.mult[feature] = {}; }
        if (bonus === 0 || bonus === null || bonus === undefined){ delete a.mult[feature][res]; }
        else { a.mult[feature][res] = Number(bonus); }
    };
    window.ankiMult.cap = function(res, cap){ ankiState().multCap[res || '*'] = Number(cap); };
    window.ankiState = ankiState;
}
