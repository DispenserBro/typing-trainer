import type { ReactNode } from 'react';

type SafeMarkdownProps = {
  baseUri?: string;
  className?: string;
  markdown?: string;
};

type MarkdownBlock =
  | { type: 'heading'; depth: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; text: string };

const INLINE_TOKEN_REGEX = /(!\[([^\]]*)\]\(([^)\s]+(?:\s+\"[^\"]*\")?)\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|`([^`]+)`)/g;
const EMPHASIS_TOKEN_REGEX = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;

function isSafeExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isSafeImageUrl(value: string) {
  return /^(https?:\/\/|file:\/\/\/)/i.test(value);
}

function normalizeImageRef(value: string) {
  return value.trim().replace(/^<|>$/g, '').replace(/\s+"[^"]*"$/, '');
}

function splitPathSegments(value: string) {
  return value.replace(/\\/g, '/').split('/').filter(Boolean);
}

function normalizePathSegments(parts: string[]) {
  const normalized: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized;
}

function toFileUrl(filePath: string) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const encodedPath = normalizedPath
    .split('/')
    .map((segment, index) => (index === 0 && /^[A-Za-z]:$/.test(segment) ? segment : encodeURIComponent(segment)))
    .join('/');
  return `file:///${encodedPath}`;
}

function resolveLocalImageUrl(source: string, baseUri: string) {
  const imageRef = source.replace(/\\/g, '/');

  if (/^[A-Za-z]:[\\/]/.test(source) || source.startsWith('/')) {
    return toFileUrl(source);
  }

  const normalizedBase = baseUri.startsWith('file:///')
    ? decodeURIComponent(baseUri.slice('file:///'.length))
    : baseUri;
  const basePath = normalizedBase.replace(/\\/g, '/');
  const baseSegments = splitPathSegments(basePath);
  if (baseSegments.length === 0) return null;
  baseSegments.pop();

  const resolvedSegments = normalizePathSegments([...baseSegments, ...splitPathSegments(imageRef)]);
  if (resolvedSegments.length === 0) return null;

  const resolvedPath = /^[A-Za-z]:$/.test(resolvedSegments[0])
    ? resolvedSegments.join('/')
    : `/${resolvedSegments.join('/')}`;

  return toFileUrl(resolvedPath);
}

function resolveImageUrl(source: string, baseUri?: string) {
  const imageRef = normalizeImageRef(source);
  if (!imageRef) return null;
  if (isSafeImageUrl(imageRef)) return imageRef;

  if (baseUri && isSafeExternalUrl(baseUri)) {
    try {
      const resolved = new URL(imageRef, baseUri).toString();
      return isSafeExternalUrl(resolved) ? resolved : null;
    } catch {
      return null;
    }
  }

  if (!baseUri) return null;
  return resolveLocalImageUrl(imageRef, baseUri);
}

function renderInlineMarkdown(text: string, baseUri?: string) {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(INLINE_TOKEN_REGEX)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      nodes.push(...renderInlineEmphasis(text.slice(cursor, index), baseUri));
    }

    const [, , imageAlt, imageSrc, linkLabel, linkHref, codeText] = match;
    if (imageSrc) {
      const resolvedImageUrl = resolveImageUrl(imageSrc, baseUri);
      if (resolvedImageUrl) {
        nodes.push(
          <img
            key={`${index}:${token}`}
            src={resolvedImageUrl}
            alt={imageAlt || ''}
            loading="lazy"
          />,
        );
      } else {
        nodes.push(token);
      }
    } else if (linkLabel && linkHref && isSafeExternalUrl(linkHref)) {
      nodes.push(
        <a
          key={`${index}:${token}`}
          href={linkHref}
          target="_blank"
          rel="noreferrer noopener"
        >
          {linkLabel}
        </a>,
      );
    } else if (codeText) {
      nodes.push(<code key={`${index}:${token}`}>{codeText}</code>);
    } else {
      nodes.push(token);
    }

    cursor = index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(...renderInlineEmphasis(text.slice(cursor), baseUri));
  }

  return nodes;
}

function renderInlineEmphasis(text: string, baseUri?: string) {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(EMPHASIS_TOKEN_REGEX)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > cursor) {
      nodes.push(text.slice(cursor, index));
    }

    const [, , boldText, italicText] = match;
    if (boldText) {
      nodes.push(<strong key={`${index}:${token}`}>{renderInlineMarkdown(boldText, baseUri)}</strong>);
    } else if (italicText) {
      nodes.push(<em key={`${index}:${token}`}>{renderInlineMarkdown(italicText, baseUri)}</em>);
    } else {
      nodes.push(token);
    }

    cursor = index + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let quoteLines: string[] = [];
  let codeLines: string[] = [];
  let inCodeFence = false;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: 'list', items: [...listItems] });
    listItems = [];
  };

  const flushQuote = () => {
    if (quoteLines.length === 0) return;
    blocks.push({ type: 'blockquote', text: quoteLines.join(' ') });
    quoteLines = [];
  };

  const flushCode = () => {
    if (codeLines.length === 0) return;
    blocks.push({ type: 'code', text: codeLines.join('\n') });
    codeLines = [];
  };

  const flushAll = () => {
    flushParagraph();
    flushList();
    flushQuote();
    flushCode();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeFence) {
        flushCode();
        inCodeFence = false;
      } else {
        flushParagraph();
        flushList();
        flushQuote();
        inCodeFence = true;
      }
      continue;
    }

    if (inCodeFence) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushAll();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      flushAll();
      blocks.push({
        type: 'heading',
        depth: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      flushQuote();
      listItems.push(listMatch[1].trim());
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1].trim());
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushAll();
  return blocks;
}

export function SafeMarkdown({ baseUri, className, markdown }: SafeMarkdownProps) {
  if (!markdown?.trim()) return null;

  const blocks = parseMarkdown(markdown);
  if (blocks.length === 0) return null;

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          if (block.depth === 1) {
            return <h4 key={index}>{renderInlineMarkdown(block.text, baseUri)}</h4>;
          }
          if (block.depth === 2) {
            return <h5 key={index}>{renderInlineMarkdown(block.text, baseUri)}</h5>;
          }
          return <h6 key={index}>{renderInlineMarkdown(block.text, baseUri)}</h6>;
        }

        if (block.type === 'list') {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(item, baseUri)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'blockquote') {
          return <blockquote key={index}>{renderInlineMarkdown(block.text, baseUri)}</blockquote>;
        }

        if (block.type === 'code') {
          return <pre key={index}><code>{block.text}</code></pre>;
        }

        return <p key={index}>{renderInlineMarkdown(block.text, baseUri)}</p>;
      })}
    </div>
  );
}
