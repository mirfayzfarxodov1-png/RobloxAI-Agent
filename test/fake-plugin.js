export async function pairPlugin(baseUrl, code, placeName='Test Place') {
  const response=await fetch(baseUrl+'/api/plugin/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,placeName,placeId:123})});
  const data=await response.json();
  return {response,data};
}
export async function pollPlugin(baseUrl, token, wait=0) {
  const response=await fetch(baseUrl+'/api/plugin/poll?wait='+wait,{headers:{Authorization:'Bearer '+token,'X-Place-Name':'Test Place'}});
  return {response,data:await response.json()};
}
export async function sendPluginResult(baseUrl,token,result) {
  const response=await fetch(baseUrl+'/api/plugin/result',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(result)});
  return {response,data:await response.json()};
}
