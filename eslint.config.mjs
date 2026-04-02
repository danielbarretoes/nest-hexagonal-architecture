// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import path from 'path';

/**
 * Determines the hexagonal architecture layer from a file path.
 */
function getLayer(filePath) {
  if (filePath.includes('/domain/')) return 'domain';
  if (filePath.includes('/application/')) return 'application';
  if (filePath.includes('/infrastructure/')) return 'infrastructure';
  if (filePath.includes('/presentation/')) return 'presentation';
  return 'unknown';
}

/**
 * Extracts the architecture scope from a file path.
 * Example: /src/modules/iam/users/domain/entities -> 'iam/users'
 * Also recognizes /src/shared as the shared kernel.
 */
function getScope(filePath) {
  if (filePath.startsWith('src/shared') || filePath.includes('/src/shared')) {
    return 'shared-global';
  }

  const directLayerMatch = filePath.match(
    /(?:^|\/)src\/modules\/([^/]+)\/(domain|application|infrastructure|presentation)\//,
  );

  if (directLayerMatch) {
    return `${directLayerMatch[1]}/root`;
  }

  const match = filePath.match(/\/modules\/([^/]+)\/([^/]+)/);
  return match ? `${match[1]}/${match[2]}` : null;
}

function getContext(filePath) {
  const match = filePath.match(/\/modules\/([^/]+)\//);
  return match ? match[1] : null;
}

/**
 * Checks if a file represents a port interface.
 * Ports are interfaces ending with 'Port' that define boundaries between modules.
 */
function isPortInterface(importPath) {
  return importPath.includes('Port');
}

/**
 * Checks if the target is a guard file (shared security infrastructure).
 */
function isGuard(filePath) {
  return filePath.includes('/guards/') || filePath.includes('Guard');
}

/**
 * Checks if the target is a common/shared utility file.
 */
function isCommon(filePath) {
  return filePath.includes('/common/') || filePath.startsWith('common/');
}

/**
 * Creates an ESLint rule to enforce hexagonal architecture dependencies.
 *
 * Hexagonal Architecture Layers (outer to inner):
 * - Presentation (4): Controllers, Guards, Gateways
 * - Infrastructure (3): Adapters implementing ports (DB, External APIs)
 * - Application (2): Use Cases, Application Services, DTOs
 * - Domain (1): Entities, Value Objects, Domain Services, Port Interfaces
 *
 * Dependency Rules:
 * - Outer layers CAN depend on inner layers (presentation → infrastructure → application → domain)
 * - Inner layers CANNOT depend on outer layers (domain cannot depend on application/infrastructure/presentation)
 * - Cross-module dependencies are allowed for: port interfaces, guards, and shared kernel
 */
function createHexagonalRule() {
  return {
    meta: {
      name: 'hexagonal-architecture',
      schema: [],
    },
    create(context) {
      const filename = context.filename || '';
      const sourceLayer = getLayer(filename);
      const sourceScope = getScope(filename);
      const sourceContext = getContext(filename);

      // Skip files not in the modules directory
      if (!filename.includes('/modules/')) {
        return {};
      }

      return {
        ImportDeclaration(node) {
          const importPath = node.source.value;

          // Skip non-relative imports (node_modules, etc.)
          if (!importPath.startsWith('.')) {
            return;
          }

          const currentDir = path.dirname(filename);
          const importPathAbs = path.resolve(currentDir, importPath);
          const importRelative = path.relative(process.cwd(), importPathAbs);
          const targetLayer = getLayer(importRelative);
          const targetScope = getScope(importRelative);
          const targetContext = getContext(importRelative);

          if (
            sourceLayer !== 'unknown' &&
            (importRelative.endsWith('.module') ||
              importRelative.endsWith('.module.ts'))
          ) {
            context.report({
              node,
              message:
                "[Hexagonal] Layer files must not depend on Nest module composition files. Move tokens/contracts outside '*.module.ts'.",
            });
            return;
          }

          // Skip if we can't determine layers
          if (sourceLayer === 'unknown' || targetLayer === 'unknown') {
            return;
          }

          // Layer hierarchy (higher number = more outer)
          const layerHierarchy = {
            presentation: 4,
            infrastructure: 3,
            application: 2,
            domain: 1,
          };

          const sourceLevel = layerHierarchy[sourceLayer];
          const targetLevel = layerHierarchy[targetLayer];

          // SAME MODULE: Check layer dependency direction
          if (sourceScope === targetScope) {
            // Outer → Inner is ALLOWED (presentation can use application, application can use domain, etc.)
            // Inner → Outer is FORBIDDEN (domain cannot use application, etc.)
            if (sourceLevel < targetLevel) {
              context.report({
                node,
                message: `[Hexagonal] '${sourceLayer}' cannot depend on '${targetLayer}' (same module). Outer → Inner only.`,
              });
            }
            return;
          }

          // CROSS-MODULE: Allowed patterns
          if (sourceScope !== targetScope) {
            // Shared kernel is always allowed
            if (targetScope === 'shared-global') {
              return;
            }

            // Shared kernel inside the same bounded context is allowed
            if (
              sourceContext &&
              targetContext &&
              sourceContext === targetContext &&
              targetScope === `${targetContext}/shared`
            ) {
              return;
            }

            // Common utilities are always allowed
            if (isCommon(importRelative)) {
              return;
            }

            // Port interfaces are allowed cross-module boundaries
            if (isPortInterface(importRelative)) {
              return;
            }

            // Application ports/tokens can be used across features inside the same bounded context
            if (
              sourceContext &&
              targetContext &&
              sourceContext === targetContext &&
              importRelative.includes('/application/ports/')
            ) {
              return;
            }

            // Guards can be shared across modules (security concern)
            if (isGuard(importRelative)) {
              return;
            }

            // ORM relation entities may reference each other inside the same bounded context
            if (
              sourceContext &&
              targetContext &&
              sourceContext === targetContext &&
              sourceLayer === 'infrastructure' &&
              targetLayer === 'infrastructure' &&
              importRelative.includes('/infrastructure/persistence/typeorm/entities/')
            ) {
              return;
            }

            // Application layer can depend on domain ports from other modules
            if (sourceLayer === 'application' && targetLayer === 'domain') {
              return;
            }

            // Presentation can use guards from other modules
            if (
              sourceLayer === 'presentation' &&
              targetLayer === 'presentation'
            ) {
              if (isGuard(importRelative)) {
                return;
              }
            }

            // All other cross-module dependencies are forbidden
            context.report({
              node,
              message: `[Hexagonal] Cross-module dependency: '${sourceScope}/${sourceLayer}' → '${targetScope}/${targetLayer}'. Use ports ('*Port'), shared kernel, or domain layer.`,
            });
          }
        },
      };
    },
  };
}

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['src/modules/**/domain/**/*.ts', 'src/shared/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@nestjs/*',
            'typeorm',
            'class-validator',
            'class-transformer',
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/**/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['typeorm'],
        },
      ],
    },
  },
  {
    plugins: {
      hexagonal: {
        rules: {
          'layer-dependency': createHexagonalRule(),
        },
      },
    },
    rules: {
      'hexagonal/layer-dependency': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
);
