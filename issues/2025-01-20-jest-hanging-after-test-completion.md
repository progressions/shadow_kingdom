# Jest Hanging After Test Completion

**Category:** Performance  
**Priority:** Medium  
**Status:** Open  
**Date Created:** 2025-01-20  

## Issue Description

Jest hangs for ~1 second after all tests complete successfully when running the full test suite. Individual test files and smaller subsets exit immediately, indicating an accumulative issue across the entire test suite.

## Current Status

- **All 353 tests pass consistently** ✅
- **Individual test files exit cleanly** ✅ 
- **Core service tests exit immediately** ✅
- **Full test suite hangs after completion** ⚠️

## Error Message

```
Test Suites: 21 passed, 21 total
Tests:       353 passed, 353 total
Snapshots:   0 total
Time:        6.473 s, estimated 7 s
Ran all test suites.
Jest did not exit one second after the test run has completed.

'This usually means that there are asynchronous operations that weren't stopped in your tests. Consider running Jest with `--detectOpenHandles` to troubleshoot this issue.
```

## Investigation Completed

### ✅ Fixed Issues
1. **Database connection leaks** - Fixed multiple Database instance creation in `gameController.test.ts`
2. **Readline interface leaks** - Added proper cleanup with `removeAllListeners()` and `close()`
3. **File system operations** - Moved `afterEach` file scanning to `afterAll` to reduce handle churn
4. **setTimeout cleanup** - Removed unnecessary delays from `afterEach` hooks in service tests
5. **Reference cleanup** - Added proper null assignment to prevent memory leaks

### ⚠️ Remaining Symptoms
- `--detectOpenHandles` flag doesn't report specific open handles
- Issue only occurs when running all 21 test files together
- No functional impact on test results or development workflow
- Appears to be subtle accumulative issue or Jest internal state management

## Technical Details

### Files Modified During Investigation
- `tests/gameController.test.ts` - Fixed multiple database connection creation and readline cleanup
- `tests/services/backgroundGenerationService.test.ts` - Removed setTimeout delays from afterEach
- `tests/services/roomGenerationService.test.ts` - Removed setTimeout delays from afterEach  
- `tests/setup.ts` - Moved file cleanup operations from afterEach to afterAll

### Test Files That Exit Cleanly (Verified)
- All individual service tests (`tests/services/`)
- `tests/gameController.test.ts`
- `tests/simple.test.ts`
- `tests/database.test.ts` 
- `tests/grokClient.test.ts`
- `tests/nlp.test.ts`
- `tests/gameManagement.test.ts`
- `tests/gamePersistence.test.ts`

## Acceptance Criteria

- [ ] Full test suite exits immediately after completion (< 100ms)
- [ ] `--detectOpenHandles` reports no open handles
- [ ] All tests continue to pass
- [ ] Individual test files continue to exit cleanly

## Investigation Tasks

- [ ] Run systematic binary search to isolate which combination of test files causes the hang
- [ ] Check for global state pollution between test files
- [ ] Investigate Jest configuration options for better cleanup
- [ ] Review remaining `setTimeout`/`setInterval` calls in test files
- [ ] Consider test file ordering dependencies
- [ ] Profile memory usage across test execution

## Workaround

Currently not needed as the issue doesn't block development:
- All tests pass correctly
- Individual files exit cleanly for focused testing
- CI/CD pipelines can use timeouts if needed

## Related Files

```
tests/setup.ts
tests/gameController.test.ts
tests/services/backgroundGenerationService.test.ts
tests/services/roomGenerationService.test.ts
jest.config.js
```

## Notes

This issue became apparent during Phase 3.2 (BackgroundGenerationService extraction) but likely existed before the recent service refactoring work. The investigation has significantly improved test cleanup patterns across the codebase.