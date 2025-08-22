---
description: Run Jest tests with zero tolerance for failures or hanging processes
---

test-everything: Execute Jest tests with strict failure handling. NEVER dismiss failures as "unrelated" - all failures must be fixed.

## EXECUTE JEST TESTS (force clean exit)
```bash
npm test -- --detectOpenHandles --forceExit --testTimeout=10000 --maxWorkers=1
```

## IF JEST HANGS OR FAILS TO EXIT
Try these in order:
```bash
# Option 1: More aggressive Jest settings
npm test -- --detectOpenHandles --forceExit --testTimeout=5000 --runInBand --no-cache

# Option 2: Clear Jest cache first
npx jest --clearCache
npm test -- --detectOpenHandles --forceExit --runInBand

# Option 3: Kill any hanging processes and retry
pkill -f jest
npm test -- --detectOpenHandles --forceExit --runInBand --verbose
```

## ADDITIONAL TEST TYPES (if they exist)
```bash
npm run test:integration
npm run test:e2e
npm run lint
npm run type-check
npx playwright test
```

## STRICT REQUIREMENTS
✅ Jest MUST exit cleanly with code 0
✅ ALL test failures must be investigated and fixed
✅ NO dismissing failures as "unrelated" or "flaky"
✅ If tests fail, debug and fix them - don't skip
✅ Jest processes must not hang or remain running

## FORBIDDEN ACTIONS
- Do not skip or ignore ANY test failures
- Do not say failures are "unrelated" or "not important"
- Do not leave Jest processes hanging
- Do not modify test configuration without fixing root cause

## SUCCESS CRITERIA
- All tests pass
- Jest exits cleanly 
- No hanging processes
- No "Jest did not exit one second after test run" warnings

If ANY test fails or Jest hangs, that is a failure. Fix it, don't skip it.