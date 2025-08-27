# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-08-27-yaml-color-theming/spec.md

> Created: 2025-08-27
> Status: Ready for Implementation

## Tasks

### Task 1: Create ColorThemeService with YAML Theme Loading

**Priority:** High
**Estimated Time:** 4-6 hours
**Dependencies:** None

#### Subtasks:

1. **Create ColorThemeService test suite**
   - [ ] Create `tests/services/colorThemeService.test.ts`
   - [ ] Write tests for YAML theme loading from file
   - [ ] Write tests for theme validation (required fields, valid colors)
   - [ ] Write tests for fallback behavior (missing theme file, invalid colors)
   - [ ] Write tests for getColor() method with theme lookup
   - [ ] Write tests for applyColor() method with chalk integration

2. **Implement ColorThemeService**
   - [ ] Create `src/services/colorThemeService.ts`
   - [ ] Implement singleton pattern for service access
   - [ ] Add YAML parsing with js-yaml library
   - [ ] Implement theme loading from `themes/` directory
   - [ ] Add theme validation logic
   - [ ] Implement getColor() method for color lookup
   - [ ] Implement applyColor() method for text styling
   - [ ] Add white color fallback for undefined colors
   - [ ] Add error handling for malformed/missing files

3. **Create themes directory structure**
   - [ ] Create `themes/` directory in project root
   - [ ] Add to .gitignore patterns if needed

4. **Verify implementation**
   - [ ] Run ColorThemeService tests - ensure 100% pass rate
   - [ ] Manual test theme loading with sample YAML file
   - [ ] Verify error handling with malformed YAML

### Task 2: Create Default Theme Configuration

**Priority:** High  
**Estimated Time:** 2-3 hours
**Dependencies:** Task 1 (ColorThemeService)

#### Subtasks:

1. **Design default theme specification**
   - [ ] Analyze current hardcoded chalk colors in codebase
   - [ ] Document all color usage patterns (errors, commands, descriptions, etc.)
   - [ ] Map current colors to semantic theme categories

2. **Create default theme YAML file**
   - [ ] Create `themes/default.yaml` with current game colors
   - [ ] Include semantic color categories:
     - [ ] Error messages (red)
     - [ ] Command prompts (cyan) 
     - [ ] Room descriptions (default/white)
     - [ ] Action feedback (green)
     - [ ] System messages (yellow)
     - [ ] Debug output (gray)
   - [ ] Add theme metadata (name, description, version)

3. **Create theme validation tests**
   - [ ] Write tests for default theme file validity
   - [ ] Test all required theme sections are present
   - [ ] Verify color values are valid terminal colors

4. **Document theme structure**
   - [ ] Add inline YAML comments explaining each color category
   - [ ] Document supported color values in comments

### Task 3: Integrate with Text Formatting Utilities

**Priority:** High
**Estimated Time:** 3-4 hours  
**Dependencies:** Task 1 (ColorThemeService), Task 2 (Default Theme)

#### Subtasks:

1. **Update textFormatting.ts tests**
   - [ ] Modify existing tests in `tests/utils/textFormatting.test.ts`
   - [ ] Add tests for ColorThemeService integration
   - [ ] Test fallback behavior when theme colors are undefined
   - [ ] Add mock ColorThemeService for isolated testing

2. **Refactor textFormatting.ts implementation**
   - [ ] Import ColorThemeService into `src/utils/textFormatting.ts`
   - [ ] Replace hardcoded chalk.red, chalk.cyan, etc. calls
   - [ ] Update formatError() to use theme colors
   - [ ] Update formatCommand() to use theme colors
   - [ ] Update formatDescription() to use theme colors
   - [ ] Maintain existing function signatures for backward compatibility

3. **Create utility helper methods**
   - [ ] Add getThemedChalk() helper function
   - [ ] Add applyThemeColor(text, colorKey) convenience function

4. **Verify text formatting integration**
   - [ ] Run textFormatting tests - ensure 100% pass rate
   - [ ] Manual test that formatted text still displays correctly
   - [ ] Test with different theme files to verify color changes

### Task 4: Update GamePane Component Integration

**Priority:** Medium
**Estimated Time:** 2-3 hours
**Dependencies:** Task 3 (Text Formatting Integration)

#### Subtasks:

1. **Update GamePane component tests**
   - [ ] Modify `tests/components/GamePane.test.tsx`
   - [ ] Add tests for themed message display
   - [ ] Test that ColorThemeService is properly initialized
   - [ ] Mock theme service for component isolation

2. **Integrate ColorThemeService in GamePane**
   - [ ] Update `src/components/GamePane.tsx`
   - [ ] Ensure themed text formatting is applied to messages
   - [ ] Test that existing message formatting continues to work
   - [ ] Handle edge cases where theme service is unavailable

3. **Verify GamePane integration**
   - [ ] Run GamePane component tests - ensure 100% pass rate
   - [ ] Manual test in TUI to verify color theme application
   - [ ] Test message display with different theme configurations

### Task 5: Application Initialization and Configuration

**Priority:** Medium
**Estimated Time:** 2-3 hours
**Dependencies:** Task 1 (ColorThemeService)

#### Subtasks:

1. **Update GameEngine initialization tests**
   - [ ] Add tests to `tests/services/gameEngine.test.ts`
   - [ ] Test ColorThemeService initialization during game startup
   - [ ] Test graceful handling of theme loading failures
   - [ ] Test default theme fallback behavior

2. **Integrate theme loading in GameEngine**
   - [ ] Update `src/services/gameEngine.ts`
   - [ ] Add ColorThemeService initialization to startup sequence
   - [ ] Load default theme during game initialization
   - [ ] Add error handling for theme loading failures
   - [ ] Add theme loading status to debug output

3. **Add theme configuration support**
   - [ ] Add optional THEME_NAME environment variable
   - [ ] Default to 'default' theme if not specified
   - [ ] Support theme switching via configuration

4. **Verify application integration**
   - [ ] Test full application startup with theme loading
   - [ ] Verify theme is applied consistently across all components
   - [ ] Test with missing theme files and verify fallback behavior

### Task 6: Service Integration and Dependency Injection

**Priority:** Medium
**Estimated Time:** 2-3 hours
**Dependencies:** Task 1 (ColorThemeService), Task 5 (Application Integration)

#### Subtasks:

1. **Update service integration tests**
   - [ ] Add ColorThemeService to integration test suites
   - [ ] Test service initialization order and dependencies
   - [ ] Test theme availability in other services

2. **Integrate with existing service architecture**
   - [ ] Add ColorThemeService to service dependency injection pattern
   - [ ] Update GameApplication component to initialize theme service
   - [ ] Ensure theme service is available to all components and services

3. **Update service exports**
   - [ ] Add ColorThemeService to `src/services/index.ts` if it exists
   - [ ] Update component imports to use centralized service access

### Task 7: Comprehensive Testing and Validation

**Priority:** High
**Estimated Time:** 3-4 hours  
**Dependencies:** All previous tasks

#### Subtasks:

1. **Integration testing**
   - [ ] Create end-to-end integration test for theme system
   - [ ] Test full application flow with themed colors
   - [ ] Test theme switching at runtime
   - [ ] Verify backward compatibility with existing functionality

2. **Performance testing**
   - [ ] Test theme loading performance impact on startup
   - [ ] Benchmark color application performance vs hardcoded colors
   - [ ] Ensure no noticeable performance degradation

3. **Error scenario testing**
   - [ ] Test with completely missing themes directory
   - [ ] Test with malformed YAML theme files
   - [ ] Test with theme files missing required color definitions
   - [ ] Verify graceful degradation in all error scenarios

4. **Cross-platform testing**
   - [ ] Test color display on different terminal types
   - [ ] Verify theme compatibility across different operating systems
   - [ ] Test fallback behavior on terminals with limited color support

5. **Documentation verification**
   - [ ] Verify all theme colors match current visual appearance
   - [ ] Test that YAML theme structure is intuitive and well-documented
   - [ ] Validate that error messages are helpful for debugging

### Task 8: Code Cleanup and Documentation

**Priority:** Low
**Estimated Time:** 1-2 hours
**Dependencies:** Task 7 (Testing Complete)

#### Subtasks:

1. **Remove deprecated code**
   - [ ] Search codebase for any remaining hardcoded chalk color usage
   - [ ] Remove any temporary fallback code
   - [ ] Clean up any debug logging added during development

2. **Update type definitions**
   - [ ] Add TypeScript interfaces for theme configuration
   - [ ] Update existing types to reflect theme integration
   - [ ] Add JSDoc comments for public theme API methods

3. **Final verification**
   - [ ] Run complete test suite - ensure 100% pass rate
   - [ ] Perform final manual testing of theme system
   - [ ] Verify all acceptance criteria from spec are met

## Implementation Notes

- **Test-First Development**: Each major task begins with creating comprehensive test coverage
- **Backward Compatibility**: All changes maintain existing API compatibility during transition
- **Error Handling**: Robust error handling with graceful fallbacks to ensure game stability
- **Performance**: Theme loading occurs once at startup to minimize runtime performance impact
- **Flexibility**: YAML theme structure supports easy extension for future color categories