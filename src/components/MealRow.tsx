import { useRef, useState } from 'react';
import { MoreHorizontal, Repeat2, Trash2, Utensils } from 'lucide-react';
import type { LoggedItem } from '../types';

export function MealRow({ item, onEdit, onRepeat, onDelete }: { item: LoggedItem; onEdit: () => void; onRepeat: () => void; onDelete: () => void }) {
  const [offset, setOffset] = useState(0);
  const [menu, setMenu] = useState(false);
  const gesture = useRef<{ x: number; y: number; start: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  return (
    <div className="meal-swipe">
      <div className="meal-swipe__actions" aria-hidden={offset === 0}>
        <button type="button" title="Log again" aria-label={`Log ${item.name} again`} tabIndex={offset > 0 ? 0 : -1} className="meal-repeat" onClick={() => { onRepeat(); setOffset(0); }}><Repeat2 size={20} /></button>
        <button type="button" title="Delete meal" aria-label={`Delete ${item.name}`} tabIndex={offset < 0 ? 0 : -1} className="meal-delete" onClick={onDelete}><Trash2 size={20} /></button>
      </div>
      <div className="meal-row" style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={event => { gesture.current = { x: event.clientX, y: event.clientY, start: offset, moved: false }; suppressClick.current = false; }}
        onPointerMove={event => {
          const start = gesture.current;
          if (!start) return;
          const dx = event.clientX - start.x;
          if (!start.moved && Math.abs(event.clientY - start.y) > Math.abs(dx)) { gesture.current = null; return; }
          if (Math.abs(dx) > 10) {
            start.moved = true;
            suppressClick.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            setOffset(Math.max(-70, Math.min(70, start.start + dx)));
          }
        }}
        onPointerUp={() => { if (gesture.current?.moved) setOffset(current => Math.abs(current) > 30 ? Math.sign(current) * 70 : 0); gesture.current = null; }}
        onPointerCancel={() => { gesture.current = null; setOffset(0); }}>
        <button type="button" className="meal-row__open" onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } if (offset) setOffset(0); else onEdit(); }}>
          {item.imageUrl ? <img src={item.imageUrl} alt="" className="meal-row__photo" /> : <span className="meal-row__photo meal-row__placeholder"><Utensils size={24} /></span>}
          <span className="meal-row__copy"><strong>{item.name}</strong><span className="meal-row__time">{new Date(item.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span><span className="meal-row__macros"><i className="protein-dot" />{Math.round(item.protein)}g P <i className="carbs-dot" />{Math.round(item.carbs)}g C <i className="fat-dot" />{Math.round(item.fat)}g F</span></span>
          <span className="meal-row__calories"><strong>{item.calories.toLocaleString('en-US')}</strong><small>kcal</small></span>
        </button>
        <button type="button" className="meal-row__more" aria-label={`Actions for ${item.name}`} aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={18} /></button>
      </div>
      {menu && <div className="meal-row__menu"><button type="button" onClick={() => { onRepeat(); setMenu(false); }}><Repeat2 size={16} />Log again</button><button type="button" onClick={onDelete}><Trash2 size={16} />Delete</button></div>}
    </div>
  );
}
