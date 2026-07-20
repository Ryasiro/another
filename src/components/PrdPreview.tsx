'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Download, FileText } from 'lucide-react';

interface PrdPreviewProps {
  prdMarkdown: string;
  projectName: string;
}

export default function PrdPreview({ prdMarkdown, projectName }: PrdPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prdMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([prdMarkdown], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `${projectName.toLowerCase().replace(/\s+/g, '-')}-PRD.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
          <FileText className="h-5 w-5 text-slate-500" />
          Project Requirements Document (PRD)
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download MD
          </button>
        </div>
      </div>

      <div className="p-8 overflow-y-auto max-h-[70vh] prose prose-slate max-w-none">
        <div className="space-y-6">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-2xl font-extrabold text-slate-900 border-b pb-2 mb-4">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold text-slate-800 border-b pb-1 mt-6 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-semibold text-slate-800 mt-4 mb-2">{children}</h3>,
              p: ({ children }) => <p className="text-slate-600 text-sm leading-relaxed mb-4">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 mb-4">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-600 mb-4">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ children }) => (
                <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-slate-800 border border-slate-200">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto my-4 shadow-inner border border-slate-800">
                  {children}
                </pre>
              ),
            }}
          >
            {prdMarkdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
