// Mobile interaction: one tap previews, second explicit action navigates.
// Desktop retains conventional hover and direct card navigation.
(() => {
  const board=document.querySelector('.masonry');
  if(!board)return;
  const small=matchMedia('(hover:none), (pointer:coarse)');
  const sheet=document.createElement('div');
  sheet.className='touch-sheet';sheet.id='touch-sheet';
  sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-hidden','true');
  sheet.innerHTML='<div class="touch-backdrop" data-close></div><section class="touch-panel" aria-labelledby="touch-title" tabindex="-1"><button class="touch-close" data-close aria-label="Close preview">×</button><p class="overline">PROJECT / OVERVIEW</p><h2 id="touch-title"></h2><p id="touch-description"></p><div class="touch-actions"><a id="touch-open" href="#">VIEW PROJECT ↗</a><button data-close>KEEP BROWSING</button></div></section>';
  document.body.append(sheet);
  let previous=null;
  const close=()=>{
    sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true');
    document.body.classList.remove('sheet-open');
    previous?.focus({preventScroll:true});previous=null;
  };
  sheet.addEventListener('click',e=>{if(e.target.closest('[data-close]'))close();});
  document.addEventListener('keydown',e=>{
    if(!sheet.classList.contains('open'))return;
    if(e.key==='Escape'){e.preventDefault();close();}
    if(e.key==='Tab'){
      const focusable=[...sheet.querySelectorAll('button,a[href]')];
      const first=focusable[0],last=focusable[focusable.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  board.addEventListener('click',e=>{
    if(!small.matches)return;
    const card=e.target.closest('a.project');
    if(!card)return;
    e.preventDefault();previous=card;
    const title=card.querySelector('.project-caption')?.textContent?.trim() || 'Project';
    const client=card.querySelector('.project-overlay small')?.textContent?.trim() || '';
    const description=card.querySelector('.project-overlay span')?.textContent?.trim() || '';
    sheet.querySelector('#touch-title').textContent=title;
    sheet.querySelector('#touch-description').textContent=[client,description].filter(Boolean).join(' — ');
    sheet.querySelector('#touch-open').href=card.href;
    sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');
    document.body.classList.add('sheet-open');
    sheet.querySelector('.touch-close').focus({preventScroll:true});
  });
})();