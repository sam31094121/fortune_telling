import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { BeastCardFace, BeastCardTile, BeastThumb } from '@/components/battlefield/BeastCardTile';
import { GuideBookProvider } from '@/components/battlefield/GuideBookContext';
import { buildGuideBook } from '@/lib/beast-game/guide-book';
import { interactiveCatalog } from '@/lib/beast-game/interactive';
const cards=interactiveCatalog(); const book=buildGuideBook();
test('all 60 selectable cards, full faces and thumbnails preserve identical identity, information and responsive artwork',()=>{
 expect(cards).toHaveLength(60);
 for(const card of cards){
  const click=jest.fn();
  const {container,unmount}=render(<GuideBookProvider value={book}><BeastCardTile card={card} onOpen={click}/><BeastCardFace card={card}/><BeastThumb id={card.id} thumbnail="/old-should-never-render.png" alt={card.name}/></GuideBookProvider>);
  const faces=Array.from(container.querySelectorAll('[data-frame="v1"]'));
  expect(faces).toHaveLength(3);
  expect(faces[1].textContent).toBe(faces[0].textContent);
  expect(faces[2].textContent).toBe(faces[0].textContent);
  const imageSets=faces.map(f=>Array.from(f.querySelectorAll('img')).map(i=>[i.getAttribute('src'),i.getAttribute('srcset')]));
  expect(imageSets[1]).toEqual(imageSets[0]);expect(imageSets[2]).toEqual(imageSets[0]);
  expect(container.innerHTML).not.toContain('/old-should-never-render.png');
  expect(imageSets[0][0][1]).toContain('720w');
  fireEvent.click(container.querySelector('button')!);expect(click.mock.calls.length).toBe(1);
  expect(container.querySelectorAll('button')).toHaveLength(1);
  unmount();
 }
});
test('unknown identity never falls back to a retired card image',()=>{
 const {container}=render(<BeastCardFace card={{id:'missing',name:'missing',thumbnail:'/old.png'}}/>);
 expect(container.textContent).toBe('暫時無法取得');expect(container.querySelector('img')).toBeNull();
});
