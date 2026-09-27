import React, { useState } from 'react';

interface ComboSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
}

/**
 * A proper dropdown (native <select>) that also allows adding a new value.
 * Choosing "Add new…" swaps to a text input; the typed value becomes the selection.
 */
export const ComboSelect: React.FC<ComboSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '— select —',
  allowCustom = true,
  className = 'w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500',
}) => {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');

  const unique = Array.from(new Set(options.filter(Boolean)));
  const known = unique.includes(value);

  const commit = () => {
    const v = custom.trim();
    if (v) onChange(v);
    setAdding(false);
  };

  if (adding) {
    return (
      <input
        autoFocus
        value={custom}
        onChange={e => setCustom(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            setAdding(false);
          }
        }}
        placeholder="Type a new value…"
        className={className}
      />
    );
  }

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === '__custom__') {
          setCustom('');
          setAdding(true);
        } else {
          onChange(e.target.value);
        }
      }}
      className={className}
    >
      <option value="">{placeholder}</option>
      {unique.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
      {value && !known && <option value={value}>{value}</option>}
      {allowCustom && <option value="__custom__">＋ Add new…</option>}
    </select>
  );
};
