import { readFile, writeFile } from 'node:fs/promises';
import { DEFAULT_CONFIG, mergeSavedConfig } from './config.js';

export async function loadConfig(path) {
  try { return mergeSavedConfig(JSON.parse(await readFile(path, 'utf8'))); }
  catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return structuredClone(DEFAULT_CONFIG);
    throw error;
  }
}
export async function saveConfig(path, config) { await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8'); }
export async function loadJson(path,fallback){
  try{return JSON.parse(await readFile(path,'utf8'));}
  catch(error){
    if(error.code==='ENOENT'||error instanceof SyntaxError)return structuredClone(fallback);
    throw error;
  }
}
export async function saveJson(path,value){await writeFile(path,`${JSON.stringify(value,null,2)}\n`,'utf8');}
