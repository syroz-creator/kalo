import React, { useEffect, useRef, useState } from 'react';

interface NumberPickerProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  vertical?: boolean;
}

export function NumberPicker({ label, min, max, step = 1, value, onChange, vertical = false }: NumberPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ coordinate: number; offset: number } | null>(null);
  const [size, setSize] = useState(0);
  const cell = vertical ? 40 : 12;
  const count = Math.round((max - min) / step) + 1;
  const index = Math.max(0, Math.min(count - 1, Math.round((value - min) / step)));

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setSize(vertical ? element.clientHeight : element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, [vertical]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !size) return;
    const offset = vertical ? element.scrollTop : element.scrollLeft;
    if (Math.abs(offset - index * cell) > cell / 2) {
      element.scrollTo(vertical ? { top: index * cell } : { left: index * cell });
    }
  }, [index, cell, vertical, size]);

  const selectIndex = (next: number) => onChange(Number((min + Math.max(0, Math.min(count - 1, next)) * step).toFixed(2)));

  return (
    <div className={`number-picker ${vertical ? 'number-picker--vertical' : 'number-picker--ruler'}`}>
      <div
        ref={ref}
        className="number-picker__scroll"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number((min + index * step).toFixed(2))}
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
        onScroll={event => {
          const offset = vertical ? event.currentTarget.scrollTop : event.currentTarget.scrollLeft;
          const next = Math.round(offset / cell);
          if (next !== index) selectIndex(next);
        }}
        onKeyDown={event => {
          const changes: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 };
          if (event.key in changes) { event.preventDefault(); selectIndex(index + changes[event.key]); }
          else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); selectIndex(event.key === 'Home' ? 0 : count - 1); }
        }}
        onPointerDown={event => {
          if (event.pointerType !== 'mouse') return;
          drag.current = { coordinate: vertical ? event.clientY : event.clientX, offset: vertical ? event.currentTarget.scrollTop : event.currentTarget.scrollLeft };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={event => {
          if (!drag.current) return;
          const difference = (vertical ? event.clientY : event.clientX) - drag.current.coordinate;
          if (vertical) event.currentTarget.scrollTop = drag.current.offset - difference;
          else event.currentTarget.scrollLeft = drag.current.offset - difference;
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onLostPointerCapture={() => { drag.current = null; }}
      >
        <div className="number-picker__track" style={vertical ? { paddingBlock: Math.max(0, (size - cell) / 2) } : { paddingInline: Math.max(0, (size - cell) / 2) }} aria-hidden="true">
          {Array.from({ length: count }, (_, item) => (
            <span key={item} className={`number-picker__item ${item === index ? 'is-current' : ''} ${item % 5 === 0 ? 'is-major' : ''}`}>
              {vertical ? min + item * step : <span />}
            </span>
          ))}
        </div>
      </div>
      <span className="number-picker__marker" aria-hidden="true" />
    </div>
  );
}
