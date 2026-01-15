import * as vscode from 'vscode';
import { SqlValidator } from './validator';

let validator: SqlValidator;

export function activate(context: vscode.ExtensionContext) {
  console.log('SQL DBA Linter is now active');

  // Create diagnostic collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('sql-dba-linter');
  context.subscriptions.push(diagnosticCollection);

  // Initialize validator
  validator = new SqlValidator(diagnosticCollection);

  // Validate all open SQL documents on activation
  vscode.workspace.textDocuments.forEach(document => {
    if (document.languageId === 'sql') {
      validator.validate(document);
    }
  });

  // Validate when document is opened
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(document => {
      if (document.languageId === 'sql') {
        validator.validate(document);
      }
    })
  );

  // Validate when document content changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document.languageId === 'sql') {
        validator.validate(event.document);
      }
    })
  );

  // Clear diagnostics when document is closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(document => {
      validator.clear(document);
    })
  );

  // Re-validate all documents when configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(event => {
      if (event.affectsConfiguration('sqlDbaLinter')) {
        vscode.workspace.textDocuments.forEach(document => {
          if (document.languageId === 'sql') {
            validator.validate(document);
          }
        });
      }
    })
  );

  // Command to manually trigger validation
  context.subscriptions.push(
    vscode.commands.registerCommand('sqlDbaLinter.validate', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.languageId === 'sql') {
        validator.validate(editor.document);
        vscode.window.showInformationMessage('SQL validation complete. Check Problems panel for issues.');
      } else {
        vscode.window.showWarningMessage('Please open a SQL file to validate.');
      }
    })
  );
}

export function deactivate() {
  if (validator) {
    validator.clearAll();
  }
}
