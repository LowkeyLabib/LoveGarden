const renderer = new URLSearchParams(location.search).get('renderer');
export const readOnly = import.meta.env.DEV || renderer === 'phaser' || renderer === 'legacy';
export const usePhaser = readOnly && renderer !== 'legacy';
const light=new URLSearchParams(location.search).get('light');
export const previewLight=usePhaser&&(light==='day'||light==='night')?light:null;
