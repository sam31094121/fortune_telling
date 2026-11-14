/** Exact integer/rational attack arithmetic. Numbers are only a compatibility projection.
 * Growth and formula values remain decimal strings; finite HP/shield is clipped at application.
 */
export function combatNumber(value:string):number {const n=BigInt(value);return n>BigInt(Number.MAX_SAFE_INTEGER)?Number.MAX_SAFE_INTEGER:n<0n?0:Number(n);}
export function exactAdd(value:string,delta:number|string):string {const n=BigInt(value)+BigInt(delta);return (n<0n?0n:n).toString();}
function ratio(value:number):[bigint,bigint] {
  if(!Number.isFinite(value))throw new Error('戰鬥倍率無效。');
  const [mantissa,exp='0']=value.toString().toLowerCase().split('e'),parts=mantissa.split('.');
  let n=BigInt(parts.join('')),d=10n**BigInt(parts[1]?.length??0),e=Number(exp);
  if(e>=0)n*=10n**BigInt(e);else d*=10n**BigInt(-e);return [n,d];
}
export function exactFormula(attack:string,multipliers:readonly number[],subtract=0,minimum=0):string {
  let n=BigInt(attack),d=1n;
  for(const factor of multipliers){const [a,b]=ratio(factor);n*=a;d*=b;}
  const [a,b]=ratio(subtract);n=n*b-a*d;d*=b;
  // Math.round semantics (ties toward +Infinity), without floating overflow.
  const x=2n*n+d,den=2n*d;let rounded=x/den;if(x<0n&&x%den!==0n)rounded--;
  if(rounded<BigInt(minimum))rounded=BigInt(minimum);return rounded.toString();
}
export function exactDamage(attack:string,factors:readonly number[],subtract=0,minimum=0,capacity=Number.MAX_SAFE_INTEGER) {
  const exact=exactFormula(attack,factors,subtract,minimum);
  const bounded=BigInt(exact)>BigInt(Math.max(0,Math.ceil(capacity)))?Math.max(0,Math.ceil(capacity)):Number(exact);
  return {exact,damage:bounded};
}
export function effectiveAttackText(beast:{attack:number;attackExact?:string;modifiers?:{stat:string;value:number}[]}):string {
  const delta=(beast.modifiers??[]).filter(m=>m.stat==='attack').reduce((n,m)=>n+m.value,0);
  return exactAdd(beast.attackExact??String(beast.attack),delta);
}
