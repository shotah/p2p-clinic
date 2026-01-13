/**
 * Global Search Component
 *
 * Search across contacts and calendar events from the nav bar.
 */

import { useCalendarEvents, useContacts } from '@/hooks';
import type { CalendarEvent, Contact } from '@/types';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './layout.css';

interface SearchResult {
  id: string;
  type: 'contact' | 'event';
  title: string;
  subtitle: string;
  data: Contact | CalendarEvent;
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { contacts } = useContacts();
  const { events } = useCalendarEvents();

  // Search results
  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    // Search contacts
    for (const contact of contacts) {
      const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase();
      if (
        fullName.includes(q) ||
        contact.email?.toLowerCase().includes(q) ||
        contact.phone?.includes(q) ||
        contact.company?.toLowerCase().includes(q)
      ) {
        matches.push({
          id: contact.id,
          type: 'contact',
          title: `${contact.firstName} ${contact.lastName}`,
          subtitle: contact.email || contact.phone || contact.company || '',
          data: contact,
        });
      }
    }

    // Search events
    for (const event of events) {
      if (
        event.title.toLowerCase().includes(q) ||
        event.description?.toLowerCase().includes(q)
      ) {
        const date = new Date(event.startDate);
        matches.push({
          id: event.id,
          type: 'event',
          title: event.title,
          subtitle: date.toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          data: event,
        });
      }
    }

    // Limit results
    return matches.slice(0, 10);
  }, [query, contacts, events]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K to open search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }

      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    if (result.type === 'contact') {
      navigate('/contacts', { state: { selectedId: result.id } });
    } else {
      navigate('/calendar', { state: { selectedId: result.id } });
    }
    setIsOpen(false);
    setQuery('');
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  return (
    <div className="global-search" ref={containerRef}>
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
        />
        <kbd className="search-shortcut">⌘K</kbd>
      </div>

      {isOpen && query.trim() && (
        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-no-results">No results for "{query}"</div>
          ) : (
            results.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                className="search-result"
                onClick={() => handleSelect(result)}
              >
                <span className="result-icon">
                  {result.type === 'contact' ? '👤' : '📅'}
                </span>
                <div className="result-content">
                  <div className="result-title">{result.title}</div>
                  {result.subtitle && (
                    <div className="result-subtitle">{result.subtitle}</div>
                  )}
                </div>
                <span className="result-type">
                  {result.type === 'contact' ? 'Contact' : 'Event'}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
