'use client';
import { useState, useRef, useEffect } from 'react';

const NAF_CODES = [
  { code: '62.01Z', label: 'Programmation informatique' },
  { code: '62.02A', label: 'Conseil en systèmes informatiques' },
  { code: '62.03Z', label: 'Gestion d\'installations informatiques' },
  { code: '63.11Z', label: 'Traitement de données, hébergement' },
  { code: '46.51Z', label: 'Commerce de gros d\'ordinateurs' },
  { code: '47.41Z', label: 'Commerce de détail d\'ordinateurs' },
  { code: '70.22Z', label: 'Conseil pour les affaires et management' },
  { code: '73.11Z', label: 'Agences de publicité' },
  { code: '74.10Z', label: 'Activités spécialisées de design' },
  { code: '41.20A', label: 'Construction de maisons individuelles' },
  { code: '43.21A', label: 'Travaux d\'installation électrique' },
  { code: '56.10A', label: 'Restauration traditionnelle' },
  { code: '47.11B', label: 'Commerce d\'alimentation générale' },
  { code: '86.21Z', label: 'Pratique médicale générale' },
  { code: '85.31Z', label: 'Enseignement secondaire général' },
  { code: '68.20A', label: 'Location immobilière' },
  { code: '49.41A', label: 'Transports routiers de fret' },
  { code: '45.11Z', label: 'Commerce de voitures et véhicules légers' },
  { code: '96.02A', label: 'Coiffure' },
  { code: '43.11Z', label: 'Travaux de démolition' },
];

interface NafSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function NafSelect({ value, onChange }: NafSelectProps) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length === 0
    ? NAF_CODES
    : NAF_CODES.filter(n =>
        n.code.toLowerCase().includes(query.toLowerCase()) ||
        n.label.toLowerCase().includes(query.toLowerCase())
      );

  // Quand query change : auto-ouvrir après 2+ caractères
  useEffect(() => {
    setSelectedIndex(0);
    setOpen(query.length >= 2 && filtered.length > 0);
  }, [query, filtered.length]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Gestion clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        const selected = filtered[selectedIndex];
        setQuery(selected.code);
        onChange(selected.code);
        setOpen(false);
      }
    }
  };

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        placeholder="Ex: 62 pour Informatique, 56 pour Restauration, 47 pour Commerce..."
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
          {filtered.map((n, index) => (
            <li
              key={n.code}
              className={`px-3 py-2 text-sm cursor-pointer flex justify-between ${index === selectedIndex ? 'bg-primary-light' : 'hover:bg-primary-light'}`}
              onMouseDown={() => { setQuery(`${n.code}`); onChange(n.code); setOpen(false); }}
            >
              <span className="font-mono text-primary">{n.code}</span>
              <span className="text-gray-600 ml-2">{n.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}