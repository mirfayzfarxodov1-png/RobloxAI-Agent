/** Quruvchi SUPER engine entry point. All capabilities are local and API-provider independent. */
export { buildV3Architecture, buildV3BuildSpec, buildV3ModelSpec, buildV3QAMatrix, runV3Action, runV3Audit } from './engine.js';
export { runV2Toolkit, V2_TECHNOLOGIES } from '../v2/engine.js';

export const SUPER_VERSION = '3.0.0';
export const SUPER_WORKFLOWS = Object.freeze([
  { id:'research', label:'Research', description:'Manba va cheklovlarni dalil bilan aniqlash; qidiruv mavjud bo‘lmasa buni ochiq ko‘rsatish.' },
  { id:'architecture', label:'Architecture', description:'Gameplay, server/client chegaralari, modul papkalari va qabul mezonlarini belgilash.' },
  { id:'implementation', label:'Implementation', description:'Studio ulanganida kichik, tekshiriladigan batchlar bilan haqiqiy obyekt va scriptlarni joylash.' },
  { id:'qa', label:'Quality assurance', description:'Statik audit va Output logini ko‘rib, Play-test qilinmagan ishni PASS deb belgilamaslik.' }
]);
