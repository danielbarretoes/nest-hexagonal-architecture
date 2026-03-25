import fs from 'node:fs';
import path from 'node:path';

type Layer = 'domain' | 'application' | 'infrastructure' | 'presentation' | 'unknown';

function getLayer(filePath: string): Layer {
  if (filePath.includes('/domain/')) return 'domain';
  if (filePath.includes('/application/')) return 'application';
  if (filePath.includes('/infrastructure/')) return 'infrastructure';
  if (filePath.includes('/presentation/')) return 'presentation';
  return 'unknown';
}

function getScope(filePath: string): string | null {
  if (filePath.includes('/src/shared/')) {
    return 'shared-global';
  }

  const match = filePath.match(/\/src\/modules\/([^/]+)\/([^/]+)/);
  return match ? `${match[1]}/${match[2]}` : null;
}

function collectTypeScriptFiles(rootDir: string): string[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTypeScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith('.ts') && !fullPath.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImports(fileContent: string): string[] {
  return [...fileContent.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
}

function resolveTypeScriptImport(fromFile: string, importPath: string): string | null {
  const candidateBase = path.resolve(path.dirname(fromFile), importPath);
  const candidates = [candidateBase, `${candidateBase}.ts`, path.join(candidateBase, 'index.ts')];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

describe('hexagonal architecture', () => {
  it('does not allow layer files to depend on *.module.ts files', () => {
    const moduleFiles = collectTypeScriptFiles(path.join(process.cwd(), 'src/modules'));

    const offenders = moduleFiles.flatMap((filePath) => {
      const sourceLayer = getLayer(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = extractImports(content);

      if (sourceLayer === 'unknown') {
        return [];
      }

      return imports
        .filter((importPath) => importPath.startsWith('.'))
        .map((importPath) => resolveTypeScriptImport(filePath, importPath))
        .filter((resolvedImport): resolvedImport is string => Boolean(resolvedImport))
        .filter((resolvedImport) => resolvedImport.endsWith('.module.ts'))
        .map((resolvedImport) => `${filePath} -> ${resolvedImport}`);
    });

    expect(offenders).toEqual([]);
  });

  it('does not allow inner layers to depend on outer layers inside the same feature', () => {
    const layerHierarchy: Record<Exclude<Layer, 'unknown'>, number> = {
      domain: 1,
      application: 2,
      infrastructure: 3,
      presentation: 4,
    };

    const moduleFiles = collectTypeScriptFiles(path.join(process.cwd(), 'src/modules'));

    const offenders = moduleFiles.flatMap((filePath) => {
      const sourceLayer = getLayer(filePath);
      const sourceScope = getScope(filePath);

      if (sourceLayer === 'unknown' || !sourceScope) {
        return [];
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const imports = extractImports(content);

      return imports
        .filter((importPath) => importPath.startsWith('.'))
        .map((importPath) => resolveTypeScriptImport(filePath, importPath))
        .filter((resolvedImport): resolvedImport is string => Boolean(resolvedImport))
        .filter((resolvedImport) => resolvedImport.endsWith('.ts'))
        .flatMap((resolvedImport) => {
          const targetLayer = getLayer(resolvedImport);
          const targetScope = getScope(resolvedImport);

          if (
            targetLayer === 'unknown' ||
            targetScope !== sourceScope ||
            layerHierarchy[sourceLayer] >= layerHierarchy[targetLayer]
          ) {
            return [];
          }

          return [`${filePath} -> ${resolvedImport}`];
        });
    });

    expect(offenders).toEqual([]);
  });
});
