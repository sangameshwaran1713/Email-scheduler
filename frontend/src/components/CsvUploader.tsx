import React, { useState } from 'react';

interface CsvUploaderProps {
  onEmailsParsed: (validEmails: string[], invalidCount: number) => void;
}

export function CsvUploader({ onEmailsParsed }: CsvUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [validCount, setValidCount] = useState<number | null>(null);
  const [invalidCount, setInvalidCount] = useState<number | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Extract emails using line splitting and comma/space delimiters
      const rawTokens = text
        .split(/[\r\n,;\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t !== 'email' && t !== 'emails');

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const valid: string[] = [];
      let invalid = 0;

      rawTokens.forEach((token) => {
        if (emailRegex.test(token)) {
          valid.push(token);
        } else {
          invalid++;
        }
      });

      const uniqueValid = Array.from(new Set(valid));
      setValidCount(uniqueValid.length);
      setInvalidCount(invalid);

      onEmailsParsed(uniqueValid, invalid);
    };

    reader.readAsText(file);
  };

  return (
    <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/50 rounded-xl p-4 transition bg-slate-900/40 text-center">
      <input
        type="file"
        accept=".csv,.txt"
        onChange={handleFileUpload}
        className="hidden"
        id="csv-file-input"
      />
      <label htmlFor="csv-file-input" className="cursor-pointer block">
        <div className="text-xs text-indigo-400 font-semibold mb-1">
          {fileName ? `Uploaded: ${fileName}` : 'Upload CSV or TXT file'}
        </div>
        <p className="text-[11px] text-slate-400">
          Auto-parses, validates format, and removes duplicates.
        </p>
      </label>

      {validCount !== null && (
        <div className="mt-3 flex items-center justify-center gap-3 text-xs">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
            {validCount} Valid Emails
          </span>
          {invalidCount !== null && invalidCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
              {invalidCount} Invalid Skipped
            </span>
          )}
        </div>
      )}
    </div>
  );
}
