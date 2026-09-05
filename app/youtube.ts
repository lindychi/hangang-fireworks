export function parseYouTube(input:string):{embed:string;url:string} {
  const u=new URL(input.trim());
  if(!['https:','http:'].includes(u.protocol)||!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be'].includes(u.hostname))throw new Error('유튜브 동영상 또는 플레이리스트 주소를 넣어 주세요.');
  const list=u.searchParams.get('list');
  const id=u.hostname==='youtu.be'?u.pathname.slice(1):u.searchParams.get('v')||u.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]+)/)?.[1];
  if(list&&!/^[\w-]{2,120}$/.test(list))throw new Error('플레이리스트 주소를 확인해 주세요.');
  if(id&&!/^[\w-]{11}$/.test(id))throw new Error('동영상 주소를 확인해 주세요.');
  if(!list&&!id)throw new Error('채널 주소 대신 동영상 또는 플레이리스트 주소를 넣어 주세요.');
  const params=new URLSearchParams({rel:'0',playsinline:'1'});
  if(list){params.set('list',list);if(!id)params.set('listType','playlist');}
  return {embed:`https://www.youtube.com/embed/${id||'videoseries'}?${params}`,url:id?`https://www.youtube.com/watch?v=${id}${list?'&list='+list:''}`:`https://www.youtube.com/playlist?list=${list}`};
}
