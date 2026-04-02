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

  const directLayerMatch = filePath.match(
    /\/src\/modules\/([^/]+)\/(domain|application|infrastructure|presentation)\//,
  );

  if (directLayerMatch) {
    return `${directLayerMatch[1]}/root`;
  }

  const match = filePath.match(/\/src\/modules\/([^/]+)\/([^/]+)/);
  return match ? `${match[1]}/${match[2]}` : null;
}

function getModuleScope(filePath: string): string | null {
  const match = filePath.match(/\/src\/modules\/([^/]+)\/([^/]+)\//);
  return match ? `${match[1]}/${match[2]}` : null;
}

function getContext(filePath: string): string | null {
  const match = filePath.match(/\/src\/modules\/([^/]+)\//);
  return match ? match[1] : null;
}

function isAccessOrSupportModule(filePath: string): boolean {
  const baseName = path.basename(filePath);
  return baseName.endsWith('-access.module.ts') || baseName === 'auth-support.module.ts';
}

function collectTypeScriptFiles(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

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

function resolveRelativeImports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = extractImports(content);

  return imports
    .filter((importPath) => importPath.startsWith('.'))
    .map((importPath) => resolveTypeScriptImport(filePath, importPath))
    .filter((resolvedImport): resolvedImport is string => Boolean(resolvedImport))
    .filter((resolvedImport) => resolvedImport.endsWith('.ts'));
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

  it('does not allow global shared code to depend on common or feature modules', () => {
    const sharedFiles = collectTypeScriptFiles(path.join(process.cwd(), 'src/shared'));

    const offenders = sharedFiles.flatMap((filePath) =>
      resolveRelativeImports(filePath)
        .filter(
          (resolvedImport) =>
            resolvedImport.includes('/src/common/') || resolvedImport.includes('/src/modules/'),
        )
        .map((resolvedImport) => `${filePath} -> ${resolvedImport}`),
    );

    expect(offenders).toEqual([]);
  });

  it('does not allow common implementation files to depend on bounded-context internals', () => {
    const commonFiles = collectTypeScriptFiles(path.join(process.cwd(), 'src/common')).filter(
      (filePath) => !filePath.endsWith('.module.ts'),
    );

    const offenders = commonFiles.flatMap((filePath) =>
      resolveRelativeImports(filePath)
        .filter((resolvedImport) => resolvedImport.includes('/src/modules/'))
        .map((resolvedImport) => `${filePath} -> ${resolvedImport}`),
    );

    expect(offenders).toEqual([]);
  });

  it('does not allow feature presentation guards to depend directly on authorization adapters', () => {
    const guardFiles = collectTypeScriptFiles(path.join(process.cwd(), 'src/modules')).filter(
      (filePath) => filePath.includes('/presentation/guards/') && filePath.endsWith('.guard.ts'),
    );

    const offenders = guardFiles.flatMap((filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = extractImports(content);
      const dependsOnAuthorizationPort = imports.some(
        (importPath) =>
          importPath.includes('shared/application/ports/authorization.token') ||
          importPath.includes('shared/domain/ports/authorization.port'),
      );

      return dependsOnAuthorizationPort ? [filePath] : [];
    });

    expect(offenders).toEqual([]);
  });

  it('does not allow sibling feature internals to leak across the same bounded context', () => {
    const moduleFiles = collectTypeScriptFiles(path.join(process.cwd(), 'src/modules'));

    const offenders = moduleFiles.flatMap((filePath) => {
      const sourceScope = getScope(filePath);
      const sourceContext = getContext(filePath);
      const sourceLayer = getLayer(filePath);

      if (!sourceScope || !sourceContext || sourceLayer === 'unknown') {
        return [];
      }

      return resolveRelativeImports(filePath).flatMap((resolvedImport) => {
        const targetScope = getScope(resolvedImport);
        const targetContext = getContext(resolvedImport);
        const targetLayer = getLayer(resolvedImport);

        if (
          !targetScope ||
          !targetContext ||
          targetLayer === 'unknown' ||
          sourceContext !== targetContext ||
          sourceScope === targetScope
        ) {
          return [];
        }

        const isSameContextShared = targetScope === `${sourceContext}/shared`;
        const isPortContract =
          resolvedImport.includes('/application/ports/') ||
          resolvedImport.includes('/domain/ports/');
        const isCrossFeatureOrmEntityRelation =
          sourceLayer === 'infrastructure' &&
          targetLayer === 'infrastructure' &&
          resolvedImport.includes('/infrastructure/persistence/typeorm/entities/');
        const isSharedGuard =
          sourceLayer === 'presentation' &&
          targetLayer === 'presentation' &&
          resolvedImport.includes('/presentation/guards/');

        if (
          isSameContextShared ||
          isPortContract ||
          isCrossFeatureOrmEntityRelation ||
          isSharedGuard
        ) {
          return [];
        }

        return [`${filePath} -> ${resolvedImport}`];
      });
    });

    expect(offenders).toEqual([]);
  });

  it('does not allow feature composition modules to import non-access modules from other features', () => {
    const moduleFiles = [
      ...collectTypeScriptFiles(path.join(process.cwd(), 'src/modules')).filter((filePath) =>
        filePath.endsWith('.module.ts'),
      ),
      ...collectTypeScriptFiles(path.join(process.cwd(), 'src/common')).filter((filePath) =>
        filePath.endsWith('.module.ts'),
      ),
    ];

    const offenders = moduleFiles.flatMap((filePath) => {
      const sourceScope = getModuleScope(filePath);

      return resolveRelativeImports(filePath)
        .filter((resolvedImport) => resolvedImport.endsWith('.module.ts'))
        .flatMap((resolvedImport) => {
          const targetScope = getModuleScope(resolvedImport);

          if (!targetScope) {
            return [];
          }

          if (filePath.includes('/src/common/')) {
            return isAccessOrSupportModule(resolvedImport)
              ? []
              : [`${filePath} -> ${resolvedImport}`];
          }

          if (!sourceScope || sourceScope === targetScope) {
            return [];
          }

          return isAccessOrSupportModule(resolvedImport)
            ? []
            : [`${filePath} -> ${resolvedImport}`];
        });
    });

    expect(offenders).toEqual([]);
  });
});
