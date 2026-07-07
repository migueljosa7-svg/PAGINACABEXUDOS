import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt,
  FaList,
  FaStream,
  FaFilter,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaMapMarkerAlt,
  FaClock,
  FaUsers,
  FaTag,
  FaStar,
} from 'react-icons/fa';
import {
  calendarEvents,
  categoryLabels,
  getUniqueBarrios,
  getUniqueComparsas,
  availableYears,
  type CalendarEvent,
  type EventCategory,
} from '../data/calendarData';
import '../styles/agenda.css';

// ─── Types ───────────────────────────────────────────────────
type ViewMode = 'calendario' | 'lista' | 'cronologia';

interface Filters {
  year: number;
  barrio: string;
  comparsa: string;
  category: string;
  search: string;
}

// ─── Month names ─────────────────────────────────────────────
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── Helpers ─────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  // Monday-based (0=Mon…6=Sun)
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function formatTime(t?: string) {
  if (!t) return '';
  return t;
}
function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── EventChip ───────────────────────────────────────────────
const EventChip: React.FC<{ event: CalendarEvent; onClick: () => void }> = ({ event, onClick }) => (
  <button
    className="cal-chip"
    style={{ borderLeftColor: event.color, background: event.color + '22' }}
    onClick={e => { e.stopPropagation(); onClick(); }}
    title={event.title}
  >
    <span className="cal-chip-dot" style={{ background: event.color }} />
    <span className="cal-chip-label">{event.shortTitle}</span>
  </button>
);

// ─── EventCard (list/timeline) ────────────────────────────────
const EventCard: React.FC<{ event: CalendarEvent; onClick: () => void; idx: number }> = ({
  event, onClick, idx
}) => (
  <motion.div
    className="agenda-card"
    style={{ borderLeftColor: event.color }}
    onClick={onClick}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: idx * 0.04 }}
    whileHover={{ x: 4 }}
    layout
  >
    <div className="agenda-card-emoji">{event.emoji}</div>
    <div className="agenda-card-body">
      <div className="agenda-card-top">
        <span className="agenda-card-badge" style={{ background: event.color }}>
          {categoryLabels[event.category as EventCategory]}
        </span>
        {event.featured && (
          <span className="agenda-card-featured"><FaStar /> Destacado</span>
        )}
      </div>
      <h3 className="agenda-card-title">{event.title}</h3>
      <div className="agenda-card-meta">
        <span><FaClock /> {formatDate(event.date)}{event.time ? ` · ${event.time}` : ''}</span>
        <span><FaMapMarkerAlt /> {event.location}</span>
        {event.comparsa && <span><FaUsers /> {event.comparsa}</span>}
        {event.barrio && <span><FaTag /> {event.barrio}</span>}
      </div>
    </div>
  </motion.div>
);

// ─── Detail Modal ─────────────────────────────────────────────
const EventModal: React.FC<{ event: CalendarEvent; onClose: () => void }> = ({ event, onClose }) => (
  <motion.div
    className="agenda-modal-overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      className="agenda-modal"
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 28 }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="agenda-modal-header" style={{ background: event.color }}>
        <button className="agenda-modal-close" onClick={onClose}><FaTimes /></button>
        <span className="agenda-modal-emoji">{event.emoji}</span>
        <span className="agenda-modal-badge">{categoryLabels[event.category as EventCategory]}</span>
        <h2 className="agenda-modal-title">{event.title}</h2>
      </div>

      {/* Body */}
      <div className="agenda-modal-body">
        {/* Quick info grid */}
        <div className="agenda-modal-grid">
          <div className="agenda-modal-info">
            <FaClock className="agenda-modal-icon" />
            <div>
              <small>Fecha y hora</small>
              <strong>{formatDate(event.date)}</strong>
              {event.time && <span>{event.time}{event.endTime ? ` — ${event.endTime}` : ''}</span>}
            </div>
          </div>
          <div className="agenda-modal-info">
            <FaMapMarkerAlt className="agenda-modal-icon" />
            <div>
              <small>Lugar</small>
              <strong>{event.location}</strong>
            </div>
          </div>
          {event.comparsa && (
            <div className="agenda-modal-info">
              <FaUsers className="agenda-modal-icon" />
              <div>
                <small>Comparsa</small>
                <strong>{event.comparsa}</strong>
              </div>
            </div>
          )}
          {event.barrio && (
            <div className="agenda-modal-info">
              <FaTag className="agenda-modal-icon" />
              <div>
                <small>Barrio</small>
                <strong>{event.barrio}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="agenda-modal-desc">{event.description}</p>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Calendar View ────────────────────────────────────────────
interface CalendarViewProps {
  events: CalendarEvent[];
  year: number;
  onEventClick: (e: CalendarEvent) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ events, year, onEventClick }) => {
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth() + 1);

  const daysInMonth = getDaysInMonth(year, currentMonth);
  const firstDay = getFirstDayOfMonth(year, currentMonth);

  const eventsByDay: Record<number, CalendarEvent[]> = {};
  events.forEach(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() + 1 === currentMonth) {
      const day = d.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(ev);
    }
  });

  const today = new Date();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="cal-wrapper">
      {/* Month nav */}
      <div className="cal-nav">
        <button
          className="cal-nav-btn"
          onClick={() => setCurrentMonth(m => m === 1 ? 12 : m - 1)}
          disabled={currentMonth === 1}
        >
          <FaChevronLeft />
        </button>
        <motion.h2
          key={currentMonth}
          className="cal-month-title"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {MONTHS[currentMonth - 1]} {year}
        </motion.h2>
        <button
          className="cal-nav-btn"
          onClick={() => setCurrentMonth(m => m === 12 ? 1 : m + 1)}
          disabled={currentMonth === 12}
        >
          <FaChevronRight />
        </button>
      </div>

      {/* Day headers */}
      <div className="cal-grid-header">
        {DAYS_SHORT.map(d => (
          <div key={d} className="cal-day-header">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="cal-grid">
        {cells.map((day, i) => {
          const evs = day ? (eventsByDay[day] || []) : [];
          const isToday = day !== null &&
            today.getFullYear() === year &&
            today.getMonth() + 1 === currentMonth &&
            today.getDate() === day;
          return (
            <div
              key={i}
              className={`cal-cell ${day ? 'cal-cell--active' : 'cal-cell--empty'} ${isToday ? 'cal-cell--today' : ''}`}
            >
              {day && (
                <>
                  <span className={`cal-day-num ${isToday ? 'cal-day-num--today' : ''}`}>{day}</span>
                  <div className="cal-chips">
                    {evs.slice(0, 3).map(ev => (
                      <EventChip key={ev.id} event={ev} onClick={() => onEventClick(ev)} />
                    ))}
                    {evs.length > 3 && (
                      <span className="cal-chips-more">+{evs.length - 3} más</span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── List View ────────────────────────────────────────────────
interface ListViewProps {
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}

const ListView: React.FC<ListViewProps> = ({ events, onEventClick }) => {
  // Group by month
  const byMonth: Record<string, CalendarEvent[]> = {};
  [...events].sort((a, b) => a.date.localeCompare(b.date)).forEach(ev => {
    const d = new Date(ev.date + 'T00:00:00');
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(ev);
  });

  if (events.length === 0) {
    return (
      <div className="agenda-empty">
        <span>📅</span>
        <p>No hay eventos para los filtros seleccionados</p>
      </div>
    );
  }

  return (
    <div className="agenda-list">
      {Object.entries(byMonth).map(([key, evs]) => {
        const d = new Date(evs[0].date + 'T00:00:00');
        const monthLabel = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="agenda-month-header">{monthLabel}</div>
            {evs.map((ev, idx) => (
              <EventCard key={ev.id} event={ev} onClick={() => onEventClick(ev)} idx={idx} />
            ))}
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── Timeline View ────────────────────────────────────────────
const TimelineView: React.FC<ListViewProps> = ({ events, onEventClick }) => {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return (
      <div className="agenda-empty">
        <span>📅</span>
        <p>No hay eventos para los filtros seleccionados</p>
      </div>
    );
  }

  return (
    <div className="agenda-timeline">
      {sorted.map((ev, idx) => {
        const d = new Date(ev.date + 'T00:00:00');
        return (
          <motion.div
            key={ev.id}
            className="timeline-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.035 }}
          >
            {/* Date column */}
            <div className="timeline-date">
              <span className="timeline-day">{d.getDate()}</span>
              <span className="timeline-month">{MONTHS[d.getMonth()].slice(0, 3)}</span>
              {ev.time && <span className="timeline-time">{formatTime(ev.time)}</span>}
            </div>

            {/* Line */}
            <div className="timeline-line">
              <div className="timeline-dot" style={{ background: ev.color }} />
              {idx < sorted.length - 1 && <div className="timeline-bar" />}
            </div>

            {/* Content */}
            <motion.div
              className="timeline-content"
              onClick={() => onEventClick(ev)}
              whileHover={{ scale: 1.01 }}
              style={{ borderLeftColor: ev.color }}
            >
              <div className="timeline-badge" style={{ background: ev.color }}>
                {ev.emoji} {categoryLabels[ev.category as EventCategory]}
              </div>
              <h4 className="timeline-title">{ev.title}</h4>
              <p className="timeline-location"><FaMapMarkerAlt /> {ev.location}</p>
              {ev.featured && (
                <span className="timeline-featured"><FaStar /> Destacado</span>
              )}
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────
export const Agenda: React.FC = () => {
  const [view, setView] = useState<ViewMode>('lista');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    year: 2025,
    barrio: '',
    comparsa: '',
    category: '',
    search: '',
  });

  const barrios = useMemo(() => getUniqueBarrios(), []);
  const comparsas = useMemo(() => getUniqueComparsas(), []);

  const filtered = useMemo(() => {
    return calendarEvents.filter(ev => {
      if (filters.year && ev.year !== filters.year) return false;
      if (filters.barrio && ev.barrio !== filters.barrio) return false;
      if (filters.comparsa && ev.comparsa !== filters.comparsa) return false;
      if (filters.category && ev.category !== filters.category) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !ev.title.toLowerCase().includes(q) &&
          !ev.description.toLowerCase().includes(q) &&
          !ev.location.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [filters]);

  const activeFilterCount = [filters.barrio, filters.comparsa, filters.category, filters.search]
    .filter(Boolean).length;

  const updateFilter = (key: keyof Filters, val: string | number) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };
  const clearFilters = () => setFilters(prev => ({
    ...prev, barrio: '', comparsa: '', category: '', search: ''
  }));

  return (
    <div className="agenda-page">

      {/* ── Header ────────────────────────────── */}
      <motion.div
        className="agenda-hero"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="agenda-hero-inner">
          <div className="agenda-hero-badge">
            <FaCalendarAlt /> Agenda
          </div>
          <h1 className="agenda-hero-title">Calendario de la Comparsa</h1>
          <p className="agenda-hero-sub">
            Todos los eventos de los Gigantes y Cabezudos de Zaragoza
          </p>

          {/* Year selector */}
          <div className="agenda-year-tabs">
            {availableYears.map(y => (
              <motion.button
                key={y}
                className={`agenda-year-btn ${filters.year === y ? 'agenda-year-btn--active' : ''}`}
                onClick={() => updateFilter('year', y)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {y}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Toolbar ───────────────────────────── */}
      <div className="agenda-toolbar">
        {/* View switcher */}
        <div className="agenda-views">
          {([
            ['lista', <FaList />, 'Lista'],
            ['calendario', <FaCalendarAlt />, 'Mes'],
            ['cronologia', <FaStream />, 'Línea'],
          ] as const).map(([v, icon, label]) => (
            <motion.button
              key={v}
              className={`agenda-view-btn ${view === v ? 'agenda-view-btn--active' : ''}`}
              onClick={() => setView(v as ViewMode)}
              whileTap={{ scale: 0.93 }}
            >
              {icon}
              <span>{label}</span>
            </motion.button>
          ))}
        </div>

        <div className="agenda-toolbar-right">
          {/* Search */}
          <div className="agenda-search-wrap">
            <FaSearch className="agenda-search-icon" />
            <input
              className="agenda-search"
              placeholder="Buscar evento…"
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
            />
            {filters.search && (
              <button className="agenda-search-clear" onClick={() => updateFilter('search', '')}>
                <FaTimes />
              </button>
            )}
          </div>

          {/* Filters toggle */}
          <motion.button
            className={`agenda-filter-btn ${filtersOpen ? 'agenda-filter-btn--open' : ''}`}
            onClick={() => setFiltersOpen(f => !f)}
            whileTap={{ scale: 0.93 }}
          >
            <FaFilter />
            {activeFilterCount > 0 && (
              <span className="agenda-filter-count">{activeFilterCount}</span>
            )}
          </motion.button>
        </div>
      </div>

      {/* ── Filter panel ──────────────────────── */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            className="agenda-filters"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="agenda-filters-inner">
              <select
                className="agenda-select"
                value={filters.barrio}
                onChange={e => updateFilter('barrio', e.target.value)}
              >
                <option value="">Todos los barrios</option>
                {barrios.map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <select
                className="agenda-select"
                value={filters.comparsa}
                onChange={e => updateFilter('comparsa', e.target.value)}
              >
                <option value="">Todas las comparsas</option>
                {comparsas.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                className="agenda-select"
                value={filters.category}
                onChange={e => updateFilter('category', e.target.value)}
              >
                <option value="">Todos los eventos</option>
                {Object.entries(categoryLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>

              {activeFilterCount > 0 && (
                <button className="agenda-clear-btn" onClick={clearFilters}>
                  <FaTimes /> Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Results count ─────────────────────── */}
      <div className="agenda-count">
        <span>{filtered.length} eventos</span>
        {activeFilterCount > 0 && (
          <span className="agenda-count-filtered"> · {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''} activo{activeFilterCount !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── View content ──────────────────────── */}
      <div className="agenda-content">
        <AnimatePresence mode="wait">
          {view === 'calendario' && (
            <motion.div
              key="cal"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <CalendarView
                events={filtered}
                year={filters.year}
                onEventClick={setSelectedEvent}
              />
            </motion.div>
          )}

          {view === 'lista' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <ListView events={filtered} onEventClick={setSelectedEvent} />
            </motion.div>
          )}

          {view === 'cronologia' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <TimelineView events={filtered} onEventClick={setSelectedEvent} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Modal ─────────────────────────────── */}
      <AnimatePresence>
        {selectedEvent && (
          <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};
