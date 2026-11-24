const params=new URLSearchParams(location.search);
const renderer=params.get('renderer');
// Local development and explicit review links use a separate anonymous session.
export const readOnly=import.meta.env.DEV || params.get('readonly')==='1';
export const usePhaser=renderer!=='legacy';
const light=params.get('light');
export const previewLight=readOnly&&usePhaser&&(light==='day'||light==='night')?light:null;
