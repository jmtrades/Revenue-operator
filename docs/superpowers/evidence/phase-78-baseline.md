# Phase 78 baseline evidence (2026-04-22)

## tsc --noEmit

```
exit=0
(no output — clean build)
```

## eslint src e2e --max-warnings=0

```
exit=1 (0 errors, 66 warnings — all @typescript-eslint/no-unused-vars)
```

      162:40  warning  'account' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
    
    /sessions/funny-nice-einstein/mnt/Revenue-operator-1/src/lib/sales/rep-coaching-synthesizer.ts
      260:9  warning  'pb' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
    
    /sessions/funny-nice-einstein/mnt/Revenue-operator-1/src/lib/sales/win-probability.ts
      378:3  warning  'positives' is defined but never used. Allowed unused args must match /^_/u  @typescript-eslint/no-unused-vars
    
    /sessions/funny-nice-einstein/mnt/Revenue-operator-1/src/lib/scheduling/cadence-engine.ts
      114:10  warning  'formatUtcDate' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
    
    /sessions/funny-nice-einstein/mnt/Revenue-operator-1/src/lib/sequences/auto-sequence-generator.ts
      131:7   warning  'DEFAULT_TEMPLATES' is assigned a value but never used. Allowed unused vars must match /^_/u   @typescript-eslint/no-unused-vars
      143:48  warning  'channelPreferences' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
      277:11  warning  'channelPreferences' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
      277:31  warning  'leadProfile' is assigned a value but never used. Allowed unused vars must match /^_/u         @typescript-eslint/no-unused-vars
    
    /sessions/funny-nice-einstein/mnt/Revenue-operator-1/src/lib/sequences/trial-nurture-playbook.ts
      41:9  warning  'baseDate' is assigned a value but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
    
    /sessions/funny-nice-einstein/mnt/Revenue-operator-1/src/lib/voice/brain-integration.ts
      182:59  warning  'context' is defined but never used. Allowed unused args must match /^_/u                        @typescript-eslint/no-unused-vars
      388:67  warning  'i' is defined but never used. Allowed unused args must match /^_/u                              @typescript-eslint/no-unused-vars
      388:89  warning  'r' is defined but never used. Allowed unused args must match /^_/u                              @typescript-eslint/no-unused-vars
      399:34  warning  'b' is defined but never used. Allowed unused args must match /^_/u                              @typescript-eslint/no-unused-vars
      420:10  warning  'extractObjectionFromUtterance' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
      421:34  warning  't' is defined but never used. Allowed unused args must match /^_/u                              @typescript-eslint/no-unused-vars
      422:42  warning  't' is defined but never used. Allowed unused args must match /^_/u                              @typescript-eslint/no-unused-vars
      423:28  warning  't' is defined but never used. Allowed unused args must match /^_/u                              @typescript-eslint/no-unused-vars
      424:27  warning  't' is defined but never used. Allowed unused args must match /^_/u                              @typescript-eslint/no-unused-vars
      425:32  warning  't' is defined but never used. Allowed unused args must match /^_/u                              @typescript-eslint/no-unused-vars
    
    /sessions/funny-nice-einstein/mnt/Revenue-operator-1/src/lib/voice/call-intelligence-engine.ts
      21:3  warning  'formatObjectionCoachingHint' is defined but never used. Allowed unused vars must match /^_/u  @typescript-eslint/no-unused-vars
      21:3  warning  'formatObjectionCoachingHint' is defined but never used                                        unused-imports/no-unused-imports
    
    ✖ 66 problems (0 errors, 66 warnings)
      0 errors and 6 warnings potentially fixable with the `--fix` option.
    
    ESLint found too many warnings (maximum: 0).

## vitest run

```
Test Files: 364 passed (364)
Tests: 2732 passed (2732)
Duration: 38.95s
exit=0
```
