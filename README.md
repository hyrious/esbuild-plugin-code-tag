## @hyrious/esbuild-plugin-code-tag

This plugin strips [code tags](https://github.com/fregante/code-tag) from your source code.

### Install

```
npm add -D code-tag @hyrious/esbuild-plugin-code-tag
```

### Usage

```js
const { build } = require("esbuild");
const { codeTag } = require("@hyrious/esbuild-plugin-code-tag");

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  plugins: [codeTag()],
}).catch(() => process.exit(1));
```

### Options

```js
codeTag({
  filter: /\.(m?ts|[jt]sx)$/,
  tags: ["html", "css", "gql", "graphql", "md", "markdown", "sql"],
  dedent: [],
});
```

**filter** (default: `/\.(m?ts|[jt]sx)$/`)

A RegExp passed to [`onLoad()`](https://esbuild.github.io/plugins/#on-load) to
match source codes, it is recommended to set a custom filter to skip files
for better performance. By default it does not process .{js,mjs} files.

**tags** (default: `["html", "css", "gql", "graphql", "md", "markdown", "sql"]`)

An array of tags to be stripped. For example if you set `tags` to `["html", "css"]`,
the following transform will happen:

```js
console.log(html`
  <h2>Title</h2>
  <p>hello, world!</p>
`);
```

becomes

```js
console.log(`
  <h2>Title</h2>
  <p>hello, world!</p>
`);
```

**dedent** (default: `[]`)

Template literals after these tags will be [de-indented](https://github.com/tamino-martinius/node-ts-dedent).
For example if you set `dedent` to `["html", "css"]`, the following transform will happen:

```js
console.log(html`
  <h2>Title</h2>
  <p>hello, world!</p>
`);
```

becomes

```js
console.log(`<h2>Title</h2>
<p>hello, world!</p>`);
```

By default `dedent` is empty, so that the default behavior will be the same as
not having this plugin.

### Caveats

- It does not support nested code tags, i.e.

  ```js
  const fragment = html`
    <style>
      ${css`
        body {
          color: red;
        }
      `}
    </style>
  `;
  ```

  If you need to write code like above, you can move inner strings to another scope:

  ```js
  const style = css`
    body {
      color: red;
    }
  `;
  const fragment = html`<style>${style}<style>`;
  ```
