# SQL DBA Linter - Setup and Distribution Guide

## Quick Start

### 1. Install Dependencies
```powershell
cd "C:\Users\nathanspencer\Documents\Workshop\sql-dba-linter"
npm install
```

### 2. Compile the Extension
```powershell
npm run compile
```

### 3. Test the Extension
Press **F5** in VSCode to launch the Extension Development Host window. Open any `.sql` file (like `test-sample.sql`) and you'll see violations highlighted in the Problems panel.

## How to Use

Once installed, the linter automatically validates all SQL files:

1. **View Errors**: Open the Problems panel (Ctrl+Shift+M or View → Problems)
2. **Navigate Errors**: 
   - Press **F8** to go to next error
   - Press **Shift+F8** to go to previous error
3. **See Inline**: Errors appear as squiggly underlines in the editor

## Validation Rules

### 1. USE Statement Required
- **Error**: "Script must begin with a USE {DATABASE} statement"
- **Fix**: Add `USE [DatabaseName];` at the top of your script

### 2. Three-Part Naming Convention
- **Warning**: "Table reference should use three-part naming: {DATABASE}.{SCHEMA}.{TABLE}"
- **Example**: 
  - ❌ `FROM Users`
  - ❌ `FROM dbo.Users`
  - ✅ `FROM MyDatabase.dbo.Users`

### 3. OR Operator Disallowed
- **Error**: "OR operator is not allowed"
- **Fix**: Use `IN` clause or separate queries
- **Example**:
  - ❌ `WHERE Status = 'Active' OR Status = 'Pending'`
  - ✅ `WHERE Status IN ('Active', 'Pending')`

### 4. ORDER BY Disallowed
- **Error**: "ORDER BY clause is not allowed"
- **Fix**: Remove ORDER BY or handle ordering at application level

## Configuration

Customize rules in VSCode settings (File → Preferences → Settings → Search "SQL DBA"):

```json
{
  "sqlDbaLinter.requireUseStatement": true,
  "sqlDbaLinter.requireThreePartNaming": true,
  "sqlDbaLinter.disallowOrOperator": true,
  "sqlDbaLinter.disallowOrderBy": true,
  "sqlDbaLinter.expectedDatabase": ""
}
```

### Expected Database
Set a specific database name to enforce:
```json
{
  "sqlDbaLinter.expectedDatabase": "MyProductionDB"
}
```

## Distribution to Team

### Option 1: Package as VSIX (Recommended)

1. **Install VSCE** (one-time setup):
```powershell
npm install -g @vscode/vsce
```

2. **Package the extension**:
```powershell
npm run package
```
This creates `sql-dba-linter-0.0.1.vsix`

3. **Share the VSIX file** with your team via email, shared drive, or internal repository

4. **Team members install** by:
   - Opening VSCode
   - Going to Extensions view (Ctrl+Shift+X)
   - Click the "..." menu → "Install from VSIX..."
   - Select the `.vsix` file

### Option 2: Share Source Code

1. Share the entire `sql-dba-linter` folder
2. Team members:
   - Run `npm install`
   - Press **F5** to use in development mode

### Option 3: Internal Extension Marketplace

For larger teams, consider publishing to a private extension marketplace or repository manager.

## Updating the Extension

After making changes:

1. Update version in `package.json`
2. Run `npm run compile`
3. Test with F5
4. Re-package: `npm run package`
5. Redistribute new VSIX

## Customizing Rules

To add new validation rules, edit [src/validator.ts](src/validator.ts):

1. Add configuration in `package.json` under `contributes.configuration.properties`
2. Create a new check method in `SqlValidator` class
3. Add the rule to the `rules` array in constructor
4. Recompile and test

## Troubleshooting

### Extension not activating
- Check that file is saved with `.sql` extension
- Verify language mode is set to "SQL" (bottom right of VSCode)

### No errors showing
- Open Problems panel (Ctrl+Shift+M)
- Check settings - rules may be disabled
- Verify extension is activated (check Extensions view)

### False positives
- Adjust regex patterns in `validator.ts`
- Add special case handling for comments/strings
- Disable specific rules in settings

## Example Files

- `test-sample.sql` - Contains violations for testing
- `test-sample-correct.sql` - Follows all rules correctly

Open these files to see the linter in action!
