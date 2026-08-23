import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { geocodingService } from '../services/geocodingService';

export const RoadAutocomplete = ({ language = 'ar', value, onChange, onSelect }) => {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ultra-fast instant search (80ms debounce with local 0ms GIS cache)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim().length >= 1 && isOpen) {
        setIsLoading(true);
        const searchResults = await geocodingService.searchRoads(query);
        setResults(searchResults);
        setIsLoading(false);
      } else {
        setResults([]);
      }
    }, 80);
    return () => clearTimeout(timeoutId);
  }, [query, isOpen]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    onChange({ target: { name: language === 'ar' ? 'roadNameAr' : 'roadNameEn', value: val } });
  };

  const handleSelect = (result) => {
    setQuery(result.name);
    setIsOpen(false);
    onChange({ target: { name: language === 'ar' ? 'roadNameAr' : 'roadNameEn', value: result.name } });
    if (onSelect) onSelect(result);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isLoading ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin" /> : <Search className="h-4 w-4 text-slate-400" />}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={language === 'ar' ? 'ابحث عن اسم الطريق في المدينة المنورة...' : 'Search for road name in Madinah...'}
          className="mt-2 block w-full rounded-lg bg-white border border-slate-300 focus:border-brand-primary text-brand-text-dark p-2.5 pl-10 text-xs transition"
          autoComplete="off"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-start gap-2"
            >
              <MapPin className="h-3.5 w-3.5 text-brand-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-bold text-slate-800">{result.name}</div>
                <div className="text-[10px] text-slate-500 line-clamp-1">{result.displayName}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
