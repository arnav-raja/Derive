// Copies the Pyodide runtime into public/ and downloads the pure-Python wheels
// that lessons need, so in-browser Python is served from Derive's own address.
// Runs after every `npm install` (locally, in CI and on Vercel).
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "node_modules/pyodide/package.json"), "utf8"));
const version = pkg.version;
const target = join(root, "public/pyodide", `v${version}`);
mkdirSync(target, { recursive: true });

const coreFiles = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];
for (const file of coreFiles) {
  copyFileSync(join(root, "node_modules/pyodide", file), join(target, file));
}

// Pure-Python wheels from PyPI, pinned by SHA-256. Binary packages such as
// NumPy are added here when the first lesson that needs them is written.
const wheels = [
  {
    file: "mpmath-1.4.1-py3-none-any.whl",
    url: "https://files.pythonhosted.org/packages/13/f2/abeec3db71d221ccd3cd89d206be1fabf5a3ee7178862f5fba23a59607e0/mpmath-1.4.1-py3-none-any.whl",
    sha256: "dc4f0ea2304480d4a9a48a94c1020571558ade522b44a6912efac63a586e140f",
  },
  {
    file: "sympy-1.14.0-py3-none-any.whl",
    url: "https://files.pythonhosted.org/packages/a2/09/77d55d46fd61b4a135c444fc97158ef34a095e5681d0a6c10b75bf356191/sympy-1.14.0-py3-none-any.whl",
    sha256: "e091cc3e99d2141a0ba2847328f5479b05d94a6635cb96148ccb3f34671bd8f5",
  },
];

const wheelDir = join(root, "public/pyodide/wheels");
mkdirSync(wheelDir, { recursive: true });

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

for (const wheel of wheels) {
  const dest = join(wheelDir, wheel.file);
  if (existsSync(dest) && sha256(readFileSync(dest)) === wheel.sha256) continue;
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(wheel.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const digest = sha256(buf);
      if (digest !== wheel.sha256) throw new Error(`checksum mismatch: ${digest}`);
      writeFileSync(dest, buf);
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
    }
  }
  if (lastError) {
    console.error(`vendor-pyodide: could not fetch ${wheel.file}: ${lastError.message}`);
    process.exit(1);
  }
}

writeFileSync(
  join(root, "public/pyodide/manifest.json"),
  JSON.stringify(
    {
      version,
      indexURL: `/pyodide/v${version}/`,
      wheels: Object.fromEntries(
        wheels.map((w) => [w.file.split("-")[0], `/pyodide/wheels/${w.file}`]),
      ),
    },
    null,
    2,
  ),
);
console.log(`vendor-pyodide: Pyodide ${version} and ${wheels.length} wheels ready in public/pyodide`);
