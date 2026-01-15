# SQL DBA Linter

A VSCode extension that validates SQL scripts against common DBA rules and best practices.

## Features

- **USE Statement Validation**: Ensures scripts begin with a `USE {DATABASE}` statement
- **Three-Part Naming Convention**: Validates that table references use `{DATABASE}.{SCHEMA}.{TABLE}` format
- **OR Operator Detection**: Flags usage of OR operators
- **ORDER BY Detection**: Flags usage of ORDER BY clauses

All violations appear in the Problems panel and can be navigated using F8 (next error) and Shift+F8 (previous error).

## Configuration

Configure the linter in your VSCode settings:

- `sqlDbaLinter.requireUseStatement`: Require USE statement at script beginning (default: true)
- `sqlDbaLinter.requireThreePartNaming`: Require three-part naming for tables (default: true)
- `sqlDbaLinter.disallowOrOperator`: Disallow OR operators (default: true)
- `sqlDbaLinter.disallowOrderBy`: Disallow ORDER BY clauses (default: true)
- `sqlDbaLinter.expectedDatabase`: Expected database name for USE statement (optional)

## Installation

### For Development
1. Open this folder in VSCode
2. Run `npm install`
3. Press F5 to launch Extension Development Host

### For Distribution
1. Install vsce: `npm install -g @vscode/vsce`
2. Package the extension: `vsce package`
3. Share the generated `.vsix` file with your team
4. Install via: Extensions view → ... menu → Install from VSIX

## Usage

Open any `.sql` file and the linter will automatically validate it. Errors will appear:
- In the Problems panel (View → Problems)
- As squiggles in the editor
- Navigate with F8 (next) / Shift+F8 (previous)
