import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Repeat2, Trash2, Utensils } from 'lucide-react';
import type { LoggedItem } from '../types';
import { mealSwipeAction } from '../utils/mealSwipe';

export function MealRow({ item, onEdit, onRepeat, onDelete }: { item: LoggedItem; onEdit: () => void; onRepeat: () => void; onDelete: () => boolean }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [committed, setCommitted] = useState<'delete' | 'repeat' | null>(null);
  const [menu, setMenu] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; lastX: number; lastTime: number; velocity: number; width: number; horizontal: boolean } | null>(null);
  const suppressClick = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const commit = (action: 'delete' | 'repeat', width: number) => {
    if (timer.current) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (action === 'delete' && wrapper.current) {
      wrapper.current.style.setProperty('--row-height', `${wrapper.current.offsetHeight}px`);
      // Resolve the natural height before transitioning the row to zero.
      void wrapper.current.offsetHeight;
    }
    setCommitted(action); setMenu(false); setOffset((action === 'delete' ? -1 : 1) * width);
    timer.current = setTimeout(() => {
      if (action === 'delete') { if (!onDelete()) { wrapper.current?.style.removeProperty('--row-height'); setOffset(0); setCommitted(null); timer.current = undefined; } }
      else { onRepeat(); setOffset(0); setCommitted(null); timer.current = undefined; }
    }, reducedMotion ? 0 : 260);
  };
  return (
    <div ref={wrapper} className={`meal-swipe${menu ? ' is-menu-open' : ''}${committed ? ' is-committed' : ''}${committed === 'delete' ? ' is-deleting' : ''}`}>
      <div className={`meal-swipe__feedback ${offset < 0 ? 'is-delete' : 'is-repeat'}`} aria-hidden="true">{offset < 0 ? <><Trash2 size={23} /><span>{committed ? 'Deleted' : 'Delete'}</span></> : <><Repeat2 size={23} /><span>Log again</span></>}</div>
      <div className="meal-row" style={{ transform: `translateX(${offset}px)` }}
        data-dragging={dragging || undefined}
        onPointerDown={event => {
          if (committed || (event.target as HTMLElement).closest('.meal-row__more') || (event.pointerType === 'mouse' && event.button !== 0)) return;
          gesture.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: event.timeStamp, velocity: 0, width: event.currentTarget.clientWidth, horizontal: false };
          suppressClick.current = false;
        }}
        onPointerMove={event => {
          const start = gesture.current;
          if (!start) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (!start.horizontal) {
            if (Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { gesture.current = null; return; }
            if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
            start.horizontal = true; suppressClick.current = true; setDragging(true); setMenu(false);
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          const elapsed = event.timeStamp - start.lastTime;
          if (elapsed > 0) start.velocity = (event.clientX - start.lastX) / elapsed;
          start.lastX = event.clientX; start.lastTime = event.timeStamp;
          setOffset(Math.max(-start.width, Math.min(start.width, dx)));
        }}
        onPointerUp={event => {
          const start = gesture.current; gesture.current = null; setDragging(false);
          if (!start?.horizontal) return;
          const dx = event.clientX - start.x;
          const velocity = event.timeStamp - start.lastTime > 100 ? 0 : start.velocity;
          const action = mealSwipeAction(dx, velocity, start.width);
          if (action) commit(action, start.width); else setOffset(0);
        }}
        onPointerCancel={() => { gesture.current = null; setDragging(false); if (!committed) setOffset(0); }}
        onLostPointerCapture={event => {
          // Touch starts with implicit capture on a child; ignore its handoff to the row.
          if (event.target === event.currentTarget && gesture.current) { gesture.current = null; setDragging(false); setOffset(0); }
        }}>
        <button type="button" className="meal-row__open" disabled={!!committed} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onEdit(); }}>
          {item.imageUrl ? <img src={item.imageUrl} alt="" draggable={false} className="meal-row__photo" /> : <span className="meal-row__photo meal-row__placeholder"><Utensils size={24} /></span>}
          <span className="meal-row__copy"><strong>{item.name}</strong><span className="meal-row__time">{new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span><span className="meal-row__macros"><i className="protein-dot" />{Math.round(item.protein)}g P <i className="carbs-dot" />{Math.round(item.carbs)}g C <i className="fat-dot" />{Math.round(item.fat)}g F</span></span>
          <span className="meal-row__calories"><strong>{item.calories.toLocaleString('en-US')}</strong><small>kcal</small></span>
        </button>
        <button type="button" className="meal-row__more" disabled={!!committed} aria-label={`Actions for ${item.name}`} aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={18} /></button>
      </div>
      {menu && <div className="meal-row__menu"><button type="button" onClick={() => { onRepeat(); setMenu(false); }}><Repeat2 size={16} />Log again</button><button type="button" onClick={onDelete}><Trash2 size={16} />Delete</button></div>}
    </div>
  );
}
