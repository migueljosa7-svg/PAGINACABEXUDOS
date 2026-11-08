import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FaCommentDots, FaPaperPlane, FaTimes, FaCrown } from 'react-icons/fa';
import { askAssistant, DEFAULT_SUGGESTIONS } from '../services/assistant/engine';
import type { AssistantAnswer } from '../services/assistant/engine';
import '../styles/assistant.css';

interface ChatMessage {
  id: number;
  from: 'user' | 'bot';
  text: string;
  links?: AssistantAnswer['links'];
  suggestions?: string[];
  ai?: boolean;
}

const GREETING: ChatMessage = {
  id: 0,
  from: 'bot',
  text: '¡Hola! Soy el asistente de la comparsa. Pregúntame lo que quieras: dónde está el desfile, qué hay hoy, quién es cada gigante o cabezudo…',
  suggestions: DEFAULT_SUGGESTIONS,
};

/**
 * Asistente virtual flotante.
 *  - Botón grande, siempre visible, por encima de la barra inferior del móvil.
 *  - Respuestas rápidas en botones (no hace falta teclear: abuelos y niños).
 *  - Enlaces directos a la sección de la respuesta.
 */
export const AssistantWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    inputRef.current?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(async (raw: string) => {
    const question = raw.trim();
    if (!question || thinking) return;
    setInput('');
    setMessages((m) => [...m, { id: idRef.current++, from: 'user', text: question }]);
    setThinking(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const answer = await askAssistant(question, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setMessages((m) => [
        ...m,
        { id: idRef.current++, from: 'bot', text: answer.text, links: answer.links, suggestions: answer.suggestions, ai: answer.source === 'ai' },
      ]);
    } finally {
      if (!ctrl.signal.aborted) setThinking(false);
    }
  }, [thinking]);

  const lastBotId = [...messages].reverse().find((m) => m.from === 'bot')?.id;

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            className="assistant-fab"
            onClick={() => setOpen(true)}
            aria-label="Abrir el asistente virtual"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          >
            <FaCommentDots aria-hidden="true" />
            <span>¿Dudas?</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            className="assistant-panel"
            role="dialog"
            aria-label="Asistente virtual"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <header className="assistant-head">
              <span className="assistant-avatar" aria-hidden="true"><FaCrown /></span>
              <div>
                <strong>Asistente de la comparsa</strong>
                <small>Te ayudo con la web y las fiestas</small>
              </div>
              <button type="button" className="assistant-close" onClick={() => setOpen(false)} aria-label="Cerrar el asistente">
                <FaTimes aria-hidden="true" />
              </button>
            </header>

            <div className="assistant-list" ref={listRef} role="log" aria-live="polite">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  className={`assistant-msg is-${m.from}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <p>{m.text}</p>
                  {m.ai && <small className="assistant-ai-tag">Respuesta con IA</small>}
                  {m.links && m.links.length > 0 && (
                    <div className="assistant-links">
                      {m.links.map((l) => (
                        <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>{l.label} →</Link>
                      ))}
                    </div>
                  )}
                  {m.from === 'bot' && m.id === lastBotId && m.suggestions && !thinking && (
                    <div className="assistant-chips">
                      {m.suggestions.map((s) => (
                        <button key={s} type="button" onClick={() => void ask(s)}>{s}</button>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
              {thinking && (
                <div className="assistant-msg is-bot is-typing" aria-label="El asistente está escribiendo">
                  <span /><span /><span />
                </div>
              )}
            </div>

            <form
              className="assistant-form"
              onSubmit={(e) => { e.preventDefault(); void ask(input); }}
            >
              <label htmlFor="assistant-input" className="sr-only">Escribe tu pregunta</label>
              <input
                id="assistant-input"
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta…"
                maxLength={300}
                autoComplete="off"
                enterKeyHint="send"
              />
              <button type="submit" disabled={!input.trim() || thinking} aria-label="Enviar pregunta">
                <FaPaperPlane aria-hidden="true" />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
};

export default AssistantWidget;
