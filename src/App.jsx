import React, { useCallback, useMemo, useRef, useState } from 'react';
import PlanCanvas from './components/PlanCanvas.jsx';
import {
  SYSTEM,
  FLOW,
  ROOM_TYPE_LIST,
  ROOM_TYPES,
  calculateProject,
} from './core/ventilation.js';

let nextId = 1;

const FLOW_CLASS = {
  [FLOW.SUPPLY]: 'supply',
  [FLOW.EXHAUST]: 'exhaust',
  [FLOW.TRANSFER]: 'transfer',
};

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function App() {
  const [bgImage, setBgImage] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [systemType, setSystemType] = useState(SYSTEM.BALANCED);
  const [mode, setMode] = useState('select'); // 'select' | 'draw'
  const [draftPoints, setDraftPoints] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  // --- Живой пересчёт всего проекта ---
  const project = useMemo(
    () => calculateProject(rooms, systemType),
    [rooms, systemType],
  );

  const selected = project.rooms.find((r) => r.id === selectedId) || null;

  // --- Загрузка плана-подложки ---
  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setBgImage(reader.result);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      loadFile(file);
    },
    [loadFile],
  );

  // --- Обводка комнаты ---
  function startDraw() {
    setMode('draw');
    setDraftPoints([]);
    setSelectedId(null);
  }

  function cancelDraw() {
    setMode('select');
    setDraftPoints([]);
  }

  function finishDraft(points) {
    if (points.length < 3) return;
    const id = nextId++;
    const n = rooms.length + 1;
    setRooms((prev) => [
      ...prev,
      {
        id,
        name: `Комната ${n}`,
        type: 'living',
        area: 15,
        height: 3.2,
        people: 1,
        points,
      },
    ]);
    setSelectedId(id);
    setMode('select');
    setDraftPoints([]);
  }

  function onCanvasClick(pt) {
    if (mode !== 'draw') return;
    // Клик рядом с первой точкой замыкает полигон.
    if (draftPoints.length >= 3 && dist(pt, draftPoints[0]) < 12) {
      finishDraft(draftPoints);
      return;
    }
    setDraftPoints((prev) => [...prev, pt]);
  }

  // --- Редактирование комнаты (живой пересчёт) ---
  function updateRoom(id, patch) {
    setRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteRoom(id) {
    setRooms((prev) => prev.filter((r) => r.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Приток</h1>
        <span className="tagline">расчёт вентиляции по плану помещения</span>
      </header>

      {/* --- Холст --- */}
      <div
        className="canvas-wrap"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="toolbar">
          <button
            className="btn"
            onClick={() => fileRef.current?.click()}
          >
            Загрузить план
          </button>
          {mode === 'select' ? (
            <button className="btn active" onClick={startDraw}>
              Обвести комнату
            </button>
          ) : (
            <>
              <button className="btn active" onClick={() => finishDraft(draftPoints)} disabled={draftPoints.length < 3}>
                Завершить ({draftPoints.length})
              </button>
              <button className="btn" onClick={cancelDraw}>
                Отмена
              </button>
            </>
          )}
          {mode === 'draw' && (
            <span className="hint">
              Кликайте по углам комнаты · клик по первой точке замыкает контур
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => loadFile(e.target.files?.[0])}
          />
        </div>

        <PlanCanvas
          bgImage={bgImage}
          rooms={project.rooms}
          selectedId={selectedId}
          mode={mode}
          draftPoints={draftPoints}
          onCanvasClick={onCanvasClick}
          onSelectRoom={setSelectedId}
        />

        {!bgImage && rooms.length === 0 && (
          <div className={'dropzone' + (dragging ? ' dragging' : '')}>
            <span className="big">Перетащите план помещения сюда</span>
            <span>или</span>
            <button className="btn file-btn" onClick={() => fileRef.current?.click()}>
              выберите файл
            </button>
            <span className="hint" style={{ marginTop: 8 }}>
              План — как подложка. Комнаты можно обводить и без него.
            </span>
          </div>
        )}
        {bgImage && dragging && (
          <div className="dropzone dragging">
            <span className="big">Отпустите, чтобы заменить план</span>
          </div>
        )}
      </div>

      {/* --- Боковая панель --- */}
      <aside className="sidebar">
        {/* Тип системы */}
        <div className="section">
          <h2>Тип системы</h2>
          <div className="system-switch">
            <button
              className={systemType === SYSTEM.EXHAUST_ONLY ? 'active' : ''}
              onClick={() => setSystemType(SYSTEM.EXHAUST_ONLY)}
            >
              Только вытяжка
            </button>
            <button
              className={systemType === SYSTEM.BALANCED ? 'active' : ''}
              onClick={() => setSystemType(SYSTEM.BALANCED)}
            >
              Приток + вытяжка
            </button>
          </div>
        </div>

        {/* Сводка */}
        <div className="section">
          <h2>Сводка проекта</h2>
          <div className="summary-grid">
            <span className="label">Приток</span>
            <span className="value supply">{project.supplyTotal} м³/ч</span>
            <span className="label">Вытяжка</span>
            <span className="value exhaust">{project.exhaustTotal} м³/ч</span>
            <div className="divider-row" />
            <span className="label">Расход системы</span>
            <span className="value">{project.systemFlow} м³/ч</span>
            <span className="label">Рекомендуемая установка</span>
            <span className="value big">{project.recommendedUnit} м³/ч</span>
            <div className="divider-row" />
            <span className="label">Магистраль</span>
            <span className="value">
              {project.trunkDuct.diameterMm ? `Ø${project.trunkDuct.diameterMm} мм` : '—'}
            </span>
            <span className="label">Площадь · помещений</span>
            <span className="value">
              {project.totalArea} м² · {project.rooms.length}
            </span>
          </div>
        </div>

        {/* Параметры выбранной комнаты */}
        <div className="section">
          <h2>Параметры комнаты</h2>
          {selected ? (
            <RoomForm
              room={selected}
              onChange={(patch) => updateRoom(selected.id, patch)}
              onDelete={() => deleteRoom(selected.id)}
            />
          ) : (
            <p className="empty-note">
              Выберите комнату на плане или в списке, либо обведите новую.
            </p>
          )}
        </div>

        {/* Список комнат */}
        <div className="section">
          <h2>Помещения ({project.rooms.length})</h2>
          {project.rooms.length === 0 ? (
            <p className="empty-note">Пока ничего не обведено.</p>
          ) : (
            <ul className="room-list" style={{ margin: '0 -18px' }}>
              {project.rooms.map((r) => (
                <li
                  key={r.id}
                  className={'room-item' + (r.id === selectedId ? ' selected' : '')}
                  onClick={() => setSelectedId(r.id)}
                >
                  <span className={'room-swatch ' + FLOW_CLASS[r.flowDirection]} />
                  <span className="rname">{r.name}</span>
                  <span className="rflow">{r.airflow} м³/ч</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

/** Форма параметров комнаты с живым пересчётом. */
function RoomForm({ room, onChange, onDelete }) {
  const def = ROOM_TYPES[room.type];
  const flowClass = FLOW_CLASS[room.flowDirection] || 'transfer';
  const flowLabel =
    room.flowDirection === FLOW.SUPPLY
      ? 'приток'
      : room.flowDirection === FLOW.EXHAUST
        ? 'вытяжка'
        : 'переток';

  return (
    <div>
      <div className={'calc-badge ' + flowClass}>
        <span className="label">{flowLabel}</span>
        <span className="n">{room.airflow} м³/ч</span>
      </div>
      {room.branchDuct?.diameterMm ? (
        <div className="duct-line" style={{ marginBottom: 12 }}>
          Ответвление: Ø{room.branchDuct.diameterMm} мм @ {room.branchDuct.actualVelocity} м/с
        </div>
      ) : null}

      <div className="form-row">
        <label>Название</label>
        <input
          type="text"
          value={room.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className="form-row">
        <label>Тип помещения</label>
        <select value={room.type} onChange={(e) => onChange({ type: e.target.value })}>
          {ROOM_TYPE_LIST.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-cols">
        <div className="form-row">
          <label>Площадь, м²</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={room.area}
            onChange={(e) => onChange({ area: Number(e.target.value) })}
          />
        </div>
        <div className="form-row">
          <label>Высота, м</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={room.height}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="form-row">
        <label>Число людей</label>
        <input
          type="number"
          min="0"
          step="1"
          value={room.people}
          onChange={(e) => onChange({ people: Number(e.target.value) })}
        />
      </div>

      {def && def.flow !== FLOW.SUPPLY ? (
        <p className="empty-note">
          Для этого типа расход {def.id === 'kitchen' || def.id === 'bathroom' || def.id === 'toilet' || def.id === 'laundry' ? 'фиксирован нормой' : 'зависит от площади'}.
        </p>
      ) : null}

      <button className="link-btn" onClick={onDelete}>
        Удалить комнату
      </button>
    </div>
  );
}
