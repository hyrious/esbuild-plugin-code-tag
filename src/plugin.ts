import type { PartialMessage, Plugin } from "esbuild";
import { readFile } from "node:fs/promises";
import { default as dedentString } from "dedent";
import { walkTags } from "./lexer";

export interface CodeTagOptions {
  /**
   * Will be passed to `onLoad`. By default it does not include .{mjs,js} files.
   * @default /\.(m?ts|[jt]sx)$/
   */
  filter?: RegExp;

  /**
   * Function names to be stripped, as if they are noop.
   * @see {@link https://github.com/fregante/code-tag}
   * @default ["html", "css", "gql", "graphql", "md", "markdown", "sql"]
   */
  tags?: string[];

  /**
   * Function names to be de-indented.
   * @see {@link https://github.com/tamino-martinius/node-ts-dedent}
   * @default []
   */
  dedent?: string[];
}

const defaultTags = ["html", "css", "gql", "graphql", "md", "markdown", "sql"];

/**
 * Strip [code tags](https://github.com/fregante/code-tag) from the source code.
 * **Caveats**: It does not actually _parse_ your ts/jsx code, instead it uses
 * a simple lexer to find the code tags. It does not support nested code tags.
 * ```js
 * html`
 *   <p>hello</p>
 * `
 * ```
 * becomes:
 * ```js
 * `\n  <p>hello</p>\n`
 * ```
 * If you enabled `dedent: ["html"]`, it further becomes:
 * ```js
 * `<p>hello</p>`
 * ```
 */
export function codeTag({
  filter = /\.(m?ts|[jt]sx)$/,
  tags = defaultTags,
  dedent = defaultTags,
}: CodeTagOptions = {}): Plugin {
  const tagsSet = new Set(tags);
  const dedentSet = new Set(dedent);

  return {
    name: "code-tag",
    setup({ onLoad }) {
      onLoad({ filter, namespace: "file" }, async (args) => {
        let text = await readFile(args.path, "utf8");

        try {
          text = walkTags(text, ({ tag, literal }) => {
            if (dedentSet.has(tag)) {
              literal = "`" + dedentString(literal.slice(1, -1)) + "`";
            }
            if (tagsSet.has(tag)) {
              tag = "";
            }
            return { tag, literal };
          });
        } catch (error) {
          const message = convertMessage(args.path, text, error);
          return { errors: [message] };
        }

        return { contents: text, loader: "default" };
      });
    },
  };
}

function convertMessage(file: string, input: string, { pos, message }: { pos: number; message: string }) {
  const lines = input.split("\n");
  let line = 0;
  while (line < lines.length && pos > lines[line].length) {
    pos -= lines[line].length + 1;
    line++;
  }
  return {
    text: message,
    location: {
      file: file,
      line: line + 1,
      column: pos,
      lineText: lines[line],
    },
  };
}
