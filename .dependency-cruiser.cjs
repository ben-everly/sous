const TEST = '(^test/|[.]test[.]tsx?$|(^|/)__mocks__/)'
const PROVIDERS = '^app/\\(app\\)/providers\\.tsx$'

module.exports = {
  allowedSeverity: 'error',
  allowed: [
    { from: { path: TEST }, to: {} },
    { from: { path: '^app/' }, to: { path: '^(app|components|lib|types)/' } },
    { from: { path: '^proxy\\.ts$' }, to: { path: '^lib/' } },
    { from: { path: '^components/' }, to: { path: '^(components|lib|types)/' } },
    { from: { path: '^lib/' }, to: { path: '^(lib|types)/' } },
    { from: { path: '^types/' }, to: { path: '^(types/|lib/[^/]+/types\\.ts$)' } },
    {
      from: {},
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'core'] },
    },
  ],
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'break the cycle; extract the shared piece into its own module',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'no-orphans',
      comment: 'unused module; delete it or add a pathNot exception if it is an entry point',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [
          '(^|/)[.][^/]+[.](?:js|cjs|mjs|ts|cts|mts|json)$',
          '[.]d[.]ts$',
          '(^|/)tsconfig[.]json$',
          '(^|/)(?:babel|webpack)[.]config[.](?:js|cjs|mjs|ts|cts|mts|json)$',
          '^app/.*(?<![^/])(page|layout|loading|error|global-error|not-found|template|default|route|opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\\.tsx?$',
          '^test/stubs/',
        ],
      },
      to: {},
    },
    {
      name: 'no-deprecated-core',
      comment: 'deprecated node core module; use its replacement',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['core'],
        path: [
          '^async_hooks$',
          '^punycode$',
          '^domain$',
          '^constants$',
          '^sys$',
          '^_linklist$',
          '^_stream_wrap$',
        ],
      },
    },
    {
      name: 'not-to-deprecated',
      comment: 'deprecated npm package; upgrade or replace it',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['deprecated'],
      },
    },
    {
      name: 'no-non-package-json',
      severity: 'error',
      comment: 'package not in package.json; add it to dependencies',
      from: {},
      to: {
        dependencyTypes: ['npm-no-pkg', 'npm-unknown'],
      },
    },
    {
      name: 'not-to-unresolvable',
      comment: 'import does not resolve; fix the path or install the package',
      severity: 'error',
      from: {},
      to: {
        couldNotResolve: true,
      },
    },
    {
      name: 'no-duplicate-dep-types',
      comment: 'package listed in both dependencies and devDependencies; keep one',
      severity: 'warn',
      from: {},
      to: {
        moreThanOneDependencyType: true,
        dependencyTypesNot: ['type-only'],
      },
    },
    {
      name: 'not-to-test',
      comment: 'production code must not import test helpers',
      severity: 'error',
      from: {
        pathNot: TEST,
      },
      to: {
        path: '^test/',
      },
    },
    {
      name: 'not-to-spec',
      comment: 'do not import from a test file; move shared code to a helper or mock',
      severity: 'error',
      from: {},
      to: {
        path: '[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$',
      },
    },
    {
      name: 'not-to-dev-dep',
      severity: 'error',
      comment: 'ships to prod; move the package to dependencies',
      from: {
        path: '^(app|components|lib|types)/|^proxy\\.ts$',
        pathNot: [TEST, PROVIDERS],
      },
      to: {
        dependencyTypes: ['npm-dev'],
        dependencyTypesNot: ['type-only'],
        pathNot: ['node_modules/@types/'],
      },
    },
    {
      name: 'not-to-dev-dep-providers',
      severity: 'error',
      comment: 'ships to prod; only the devtools may stay a dev dependency',
      from: { path: PROVIDERS },
      to: {
        dependencyTypes: ['npm-dev'],
        dependencyTypesNot: ['type-only'],
        pathNot: ['node_modules/@types/', 'node_modules/@tanstack/react-query-devtools/'],
      },
    },
    {
      name: 'devtools-dynamic-only',
      severity: 'error',
      comment: 'a static import ships the devtools; load them via dynamic import',
      from: { path: PROVIDERS },
      to: {
        path: 'node_modules/@tanstack/react-query-devtools/',
        dependencyTypesNot: ['type-only', 'dynamic-import'],
      },
    },
    {
      name: 'optional-deps-used',
      severity: 'info',
      comment: 'optional dependency used; make sure the import tolerates it missing',
      from: {},
      to: {
        dependencyTypes: ['npm-optional'],
      },
    },
    {
      name: 'peer-deps-used',
      comment: 'peer dependency used; add it to dependencies unless intentional',
      severity: 'warn',
      from: {},
      to: {
        dependencyTypes: ['npm-peer'],
      },
    },
  ],
  options: {
    doNotFollow: {
      path: ['node_modules'],
    },
    detectProcessBuiltinModuleCalls: true,
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.d.ts', '.js'],
      mainFields: ['main', 'types', 'typings'],
    },
    skipAnalysisNotInRules: true,
  },
}
