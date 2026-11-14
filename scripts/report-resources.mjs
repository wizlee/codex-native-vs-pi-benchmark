export const knownSum=values=>values.some(value=>value===null||value===undefined)?null:values.reduce((sum,value)=>sum+value,0);
export const resourceNumber=value=>value===null||value===undefined?'unknown':Math.round(value).toLocaleString('en-US');
export const resourceDollars=value=>value===null||value===undefined?'unknown':'$'+value.toFixed(3);
export function resourceOpening(native,pi){
  if([native.tokens_all,pi.tokens_all,native.elapsed_s_per_accepted,pi.elapsed_s_per_accepted,native.estimated_api_usd_all,pi.estimated_api_usd_all].some(value=>value===null||value===undefined))
    return 'Full resource comparison is unknown because one or more trials has incomplete usage or no accepted outcome. Report observed usage as a lower bound; do not treat missing resources as zero.';
  const change=(a,b,lower,higher)=>`${Math.abs(100*(1-a/b)).toFixed(1)}% ${a<=b?lower:higher}`;
  return `Observed result for these current configurations: native used ${change(native.tokens_all,pi.tokens_all,'fewer','more')} processed tokens, ${change(native.elapsed_s_per_accepted,pi.elapsed_s_per_accepted,'less','more')} agent work time per accepted artifact, and ${change(native.estimated_api_usd_all,pi.estimated_api_usd_all,'lower','higher')} standard API-equivalent cost, including allowed repairs. This is a small pilot, not a universal backend verdict.`;
}
