import React, { useEffect, useRef, useState } from 'react';
import { FLOW } from '../core/ventilation.js';

const CELL = 40; // шаг сетки, px
const GUTTER = 22; // поля под оси, px
const LETTERS = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');

const FLOW_COLOR = {
  [FLOW.SUPPLY]: { stroke: 'var(--supply)', fill: 'var(--supply-fill)' },
  [FLOW.EXHAUST]: { stroke: 'var(--exhaust)', fill: 'var(--exhaust-fill)' },
  [FLOW.TRANSFER]: { stroke: 'var(--transfer)', fill: 'var(--transfer-fill)' },
};

function centroid(points) {
  const n = points.length;
  if (!n) return { x: 0, y: 0 };
  const s = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  return { x: s.x / n, y: s.y / n };
}

function toPath(points, close = true) {
  if (!points.length) return '';
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  return close ? d + ' Z' : d;
}

/**
 * Чертёжный холст: координатная сетка с осями, подложка-план и полигоны комнат.
 */
export default function PlanCanvas({
  bgImage,
  rooms,
  selectedId,
  mode,
  draftPoints,
  onCanvasClick,
  onSelectRoom,
}) {
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ w: Math.max(320, r.width), h: Math.max(240, r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;

  // Линии сетки внутри полей под оси.
  const cols = [];
  for (let x = GUTTER; x <= w; x += CELL) cols.push(x);
  const rowsY = [];
  for (let y = GUTTER; y <= h; y += CELL) rowsY.push(y);

  function handleClick(e) {
    if (mode !== 'draw') return;
    const rect = e.currentTarget.getBoundingClientRect();
    onCanvasClick({
      x: Math.round(e.clientX - rect.left),
      y: Math.round(e.clientY - rect.top),
    });
  }

  const draftCentroidClose =
    draftPoints.length >= 3 ? draftPoints[0] : null;

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      <svg
        width={w}
        height={h}
        onClick={handleClick}
        style={{ display: 'block', cursor: mode === 'draw' ? 'crosshair' : 'default' }}
      >
        {/* Подложка-план */}
        {bgImage && (
          <image
            href={bgImage}
            x={GUTTER}
            y={GUTTER}
            width={w - GUTTER}
            height={h - GUTTER}
            preserveAspectRatio="xMidYMid meet"
            opacity="0.85"
          />
        )}

        {/* Координатная сетка */}
        <g pointerEvents="none">
          {cols.map((x, i) => (
            <line
              key={'v' + i}
              x1={x}
              y1={GUTTER}
              x2={x}
              y2={h}
              stroke="var(--grid)"
              strokeWidth={i % 5 === 0 ? 1 : 0.6}
            />
          ))}
          {rowsY.map((y, i) => (
            <line
              key={'h' + i}
              x1={GUTTER}
              y1={y}
              x2={w}
              y2={y}
              stroke="var(--grid)"
              strokeWidth={i % 5 === 0 ? 1 : 0.6}
            />
          ))}
          {/* Оси-рамка */}
          <line x1={GUTTER} y1={GUTTER} x2={w} y2={GUTTER} stroke="var(--grid-axis)" />
          <line x1={GUTTER} y1={GUTTER} x2={GUTTER} y2={h} stroke="var(--grid-axis)" />
        </g>

        {/* Подписи осей: буквы А/Б/В сверху, цифры 1/2/3 слева */}
        <g pointerEvents="none" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-soft)">
          {cols.slice(1).map((x, i) => (
            <text key={'lx' + i} x={x - CELL / 2} y={14} textAnchor="middle">
              {LETTERS[i % LETTERS.length]}
            </text>
          ))}
          {rowsY.slice(1).map((y, i) => (
            <text key={'ly' + i} x={12} y={y - CELL / 2 + 4} textAnchor="middle">
              {i + 1}
            </text>
          ))}
        </g>

        {/* Полигоны комнат */}
        <g>
          {rooms.map((room) => {
            if (!room.points || room.points.length < 2) return null;
            const c = FLOW_COLOR[room.flowDirection] || FLOW_COLOR[FLOW.TRANSFER];
            const isSel = room.id === selectedId;
            const ctr = centroid(room.points);
            return (
              <g
                key={room.id}
                onClick={(e) => {
                  if (mode === 'draw') return;
                  e.stopPropagation();
                  onSelectRoom(room.id);
                }}
                style={{ cursor: mode === 'draw' ? 'crosshair' : 'pointer' }}
              >
                <path
                  d={toPath(room.points)}
                  fill={c.fill}
                  stroke={c.stroke}
                  strokeWidth={isSel ? 2.5 : 1.5}
                />
                <text
                  x={ctr.x}
                  y={ctr.y - 2}
                  textAnchor="middle"
                  fontFamily="var(--font, 'Golos Text')"
                  fontSize="12"
                  fontWeight="600"
                  fill="var(--ink)"
                >
                  {room.name}
                </text>
                <text
                  x={ctr.x}
                  y={ctr.y + 14}
                  textAnchor="middle"
                  fontFamily="var(--mono)"
                  fontSize="11"
                  fill={c.stroke}
                >
                  {room.airflow} м³/ч
                </text>
              </g>
            );
          })}
        </g>

        {/* Черновой полигон в процессе обводки */}
        {draftPoints.length > 0 && (
          <g pointerEvents="none">
            <path
              d={toPath(draftPoints, false)}
              fill="none"
              stroke="var(--ink)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            {draftPoints.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={i === 0 ? 5 : 3}
                fill={i === 0 ? 'var(--supply)' : '#fff'}
                stroke="var(--ink)"
                strokeWidth="1.5"
              />
            ))}
            {draftCentroidClose && (
              <circle
                cx={draftCentroidClose.x}
                cy={draftCentroidClose.y}
                r={9}
                fill="none"
                stroke="var(--supply)"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
