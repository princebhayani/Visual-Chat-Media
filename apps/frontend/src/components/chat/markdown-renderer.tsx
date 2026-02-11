'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const { copy, hasCopied } = useClipboard();

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border/50">
      <div className="flex items-center justify-between bg-muted/80 px-4 py-1.5 text-xs text-muted-foreground">
        <span>{language || 'code'}</span>
        <button
          onClick={() => copy(value)}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {hasCopied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          <span>{hasCopied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: 'hsl(var(--muted) / 0.3)',
          fontSize: '13px',
          padding: '1rem',
        }}
        wrapLongLines
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-sm dark:prose-invert max-w-none break-words"
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const value = String(children).replace(/\n$/, '');

          if (match) {
            return <CodeBlock language={match[1]} value={value} />;
          }

          return (
            <code
              className={cn(
                'rounded-md bg-muted/80 px-1.5 py-0.5 text-[13px] font-mono',
                className,
              )}
              {...props}
            >
              {children}
            </code>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {children}
              <ExternalLink className="h-3 w-3" />
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-3 rounded-lg border">
              <table className="w-full text-sm">{children}</table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border-b bg-muted/50 px-3 py-2 text-left font-medium">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="border-b px-3 py-2">{children}</td>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-2 border-primary/50 pl-4 italic text-muted-foreground my-3">
              {children}
            </blockquote>
          );
        },
        ul({ children }) {
          return <ul className="list-disc pl-6 space-y-1 my-2">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal pl-6 space-y-1 my-2">{children}</ol>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-bold mt-3 mb-1">{children}</h3>;
        },
        p({ children }) {
          return <p className="my-2 leading-relaxed">{children}</p>;
        },
        hr() {
          return <hr className="my-4 border-border" />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
