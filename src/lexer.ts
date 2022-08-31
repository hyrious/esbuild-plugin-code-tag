// Ref. https://github.com/acornjs/acorn (MIT license)

// This is an over-simplified lexer for this package.
// It only reads:
// - skip comments, strings
// - words (identifiers and keywords, excluding '\uXXXX' case)
// - string literals (`xxx\`${xxx`xxx`}\`xxx`)
// - any other tokens are considered useless

const ID_RE = /^[$_a-z][\d$_a-z]*/i;

function isIdentifierStart(code: number) {
  if (code < 65) return code === 36;
  if (code < 91) return true;
  if (code < 97) return code === 95;
  if (code < 123) return true;
  return false;
}

export interface WalkerTransferable {
  tag: string;
  literal: string;
}

export interface Walker {
  (transfer: WalkerTransferable): WalkerTransferable | undefined | null;
}

interface Replacement {
  start: number;
  end: number;
  replace: string;
}

export function walkTags(input: string, walk: Walker) {
  const replacements: Replacement[] = [];
  walkTags_(input, walk, 0, 0, replacements);
  let offset = 0;
  replacements
    .sort((a, b) => a.start - b.start)
    .forEach(({ start, end, replace }) => {
      input = input.slice(0, start + offset) + replace + input.slice(end + offset);
      offset += replace.length - (end - start);
    });
  return input;
}

function walkTags_(
  input: string,
  walk: Walker,
  from: number,
  end: number,
  replacements: Replacement[]
): number {
  const len = input.length;
  for (let pos = from, i = 0, j = 0; pos < len; ) {
    let code = input.charCodeAt(pos);

    // end recursion
    if (code === end) {
      return pos;
    }

    // skip comments
    if (code === 0x2f /* '/' */) {
      const next = input.charCodeAt(pos + 1);
      if (next === 0x2a /* '*' */) {
        pos = input.indexOf("*/", pos + 2) + 2;
      } else if (next === 0x2f /* '/' */) {
        pos = input.indexOf("\n", pos + 2) + 1;
      } else {
        pos++;
      }
      continue;
    }

    // skip strings
    if (code === 0x27 /* ' */ || code === 0x22 /* " */) {
      pos++;
      while (pos < len) {
        code = input.charCodeAt(pos);
        if (code === 0x27 /* ' */ || code === 0x22 /* " */) {
          pos++;
          break;
        }
        if (code === 0x5c /* \ */) {
          pos++;
        }
        pos++;
      }
      continue;
    }

    // save last word
    if (isIdentifierStart(code)) {
      const id = input.slice(pos).match(ID_RE) as RegExpExecArray;
      [i, j] = [pos, pos + id[0].length];
      pos = j;
      continue;
    }

    // template literals
    if (code === 0x60 /* ` */) {
      const k = pos;
      pos++;
      while (pos < len) {
        code = input.charCodeAt(pos);
        if (code === 0x24 /* $ */) {
          if (input.charCodeAt(pos + 1) === 0x7b /* { */) {
            pos = walkTags_(input, walk, pos + 2, 0x7d /* } */, replacements);
          }
        }
        if (code === 0x60 /* ` */) {
          pos++;
          break;
        }
        if (code === 0x5c /* \ */) {
          pos++;
        }
        pos++;
      }
      if (j === k) {
        if (from > 0) {
          throw Object.assign(new Error("Not support nested code tags!"), { pos: from });
        }
        const tag = input.slice(i, j);
        const literal = input.slice(k, pos);
        const transfer = walk({ tag, literal });
        if (transfer) {
          const replace = transfer.tag + transfer.literal;
          replacements.push({ start: i, end: pos, replace });
        }
      }
      continue;
    }

    // skip other tokens
    pos++;
  }

  return len;
}
