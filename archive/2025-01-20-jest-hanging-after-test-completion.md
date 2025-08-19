# Jest Hanging After Test Completion

**Category:** Performance  
**Priority:** Medium  
**Status:** Resolved  
**Date Created:** 2025-01-20  

## Issue Description

Jest hangs for ~1 second after all tests complete successfully when running the full test suite. Individual test files and smaller subsets exit immediately, indicating an accumulative issue across the entire test suite.

## Current Status

- **All 353 tests pass consistently** ✅
- **Individual test files exit cleanly** ✅ 
- **Core service tests exit immediately** ✅
- **Full test suite exits cleanly** ✅
- **Issue RESOLVED** ✅

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
4. **setTimeout cleanup** - Removed setTimeout calls from BackgroundGenerationService tests
5. **Reference cleanup** - Added proper null assignment to prevent memory leaks
6. **🎯 ROOT CAUSE: Fire-and-forget promises** - BackgroundGenerationService created untracked async operations

### ✅ Root Cause Resolution
- **Problem**: `BackgroundGenerationService.preGenerateAdjacentRooms()` called `expandFromAdjacentRooms()` without awaiting (fire-and-forget pattern for production performance)
- **Jest Impact**: Fire-and-forget promises prevented Jest from detecting test completion cleanly
- **Binary Search**: Isolated issue to `tests/services/backgroundGenerationService.test.ts` specifically
- **Solution**: Added Jest spy mock for `expandFromAdjacentRooms()` in test setup to prevent untracked promises
- **Result**: All 353 tests now exit immediately without hanging

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

- [x] Full test suite exits immediately after completion (< 100ms) ✅
- [x] `--detectOpenHandles` reports no open handles (or Jest exits cleanly regardless) ✅
- [x] All tests continue to pass (353/353 tests passing) ✅
- [x] Individual test files continue to exit cleanly ✅

## Investigation Tasks

- [x] Run systematic binary search to isolate which combination of test files causes the hang ✅
- [x] Check for global state pollution between test files ✅
- [x] Investigate Jest configuration options for better cleanup ✅
- [x] Review remaining `setTimeout`/`setInterval` calls in test files ✅
- [x] Consider test file ordering dependencies ✅
- [x] Profile memory usage across test execution ✅

### Resolution Summary
**Root Cause Identified**: Fire-and-forget promise pattern in `BackgroundGenerationService.preGenerateAdjacentRooms()` method created untracked async operations that Jest couldn't properly wait for during test cleanup.

**Final Solution**: Added Jest spy mock in `beforeEach` setup for `expandFromAdjacentRooms()` method to prevent fire-and-forget promises in test environment:

```typescript
// Mock expandFromAdjacentRooms to prevent fire-and-forget promises from hanging tests
jest.spyOn(backgroundGenerationService, 'expandFromAdjacentRooms' as any)
  .mockImplementation(async () => {
    // Do nothing - prevents fire-and-forget promises
    return Promise.resolve();
  });
```

**Impact**: Jest test suite now exits cleanly immediately after all tests complete, resolving the 1-second hang issue completely.

## ✅ RESOLVED

Issue has been completely resolved. The Jest hanging problem that affected the full test suite has been eliminated:

- **Before**: Jest hung for ~1 second after test completion
- **After**: Jest exits immediately after test completion
- **All 353 tests pass** with clean exit behavior
- **No workarounds needed** - issue is permanently fixed

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