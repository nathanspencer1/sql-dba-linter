import * as vscode from "vscode";

interface ValidationRule {
	check: (document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]) => void;
	enabled: () => boolean;
}

export class SqlValidator {
	private diagnosticCollection: vscode.DiagnosticCollection;
	private rules: ValidationRule[];

	constructor(diagnosticCollection: vscode.DiagnosticCollection) {
		this.diagnosticCollection = diagnosticCollection;
		this.rules = [
			{
				check: this.checkUseStatement.bind(this),
				enabled: () => this.getConfig<boolean>("requireUseStatement", true),
			},
			{
				check: this.checkThreePartNaming.bind(this),
				enabled: () => this.getConfig<boolean>("requireThreePartNaming", true),
			},
			{
				check: this.checkOrOperator.bind(this),
				enabled: () => this.getConfig<boolean>("disallowOrOperator", true),
			},
			{
				check: this.checkOrderBy.bind(this),
				enabled: () => this.getConfig<boolean>("disallowOrderBy", true),
			},
			{ check: this.checkCountStar.bind(this), enabled: () => this.getConfig<boolean>("disallowCountStar", true) },
		];
	}

	private getConfig<T>(key: string, defaultValue: T): T {
		return vscode.workspace.getConfiguration("sqlDbaLinter").get<T>(key, defaultValue);
	}

	public validate(document: vscode.TextDocument): void {
		if (document.languageId !== "sql") {
			return;
		}

		const diagnostics: vscode.Diagnostic[] = [];

		// Run all enabled rules
		for (const rule of this.rules) {
			if (rule.enabled()) {
				rule.check(document, diagnostics);
			}
		}

		this.diagnosticCollection.set(document.uri, diagnostics);
	}

	private checkUseStatement(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
		const text = document.getText();
		const lines = text.split("\n");

		// Remove leading comments and whitespace to find first meaningful statement
		let foundUse = false;
		let inBlockComment = false;
		const useRegex = /^\s*USE\s+\[?(\w+)\]?\s*(;|\s|$)/i;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Skip empty lines and comments
			if (inBlockComment && line.endsWith("*/")) {
				inBlockComment = false;
				continue;
			}

			if (line === "" || line.startsWith("--")) {
				continue;
			}

			// Handle block comments
			if (line.startsWith("/*")) {
				inBlockComment = true;
				continue;
			}

			if (inBlockComment) {
				continue;
			}

			// This is the first code line
			const match = line.match(useRegex);

			if (match) {
				foundUse = true;
			}
			break;
		}

		if (!foundUse) {
			const range = new vscode.Range(0, 0, 0, lines[0]?.length || 0);
			const diagnostic = new vscode.Diagnostic(range, "Script must begin with a USE {DATABASE} statement", vscode.DiagnosticSeverity.Error);
			diagnostic.source = "SQL DBA Linter";
			diagnostic.code = "missing-use-statement";
			diagnostics.push(diagnostic);
		}
	}

	private checkThreePartNaming(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
		const text = document.getText();
		const lines = text.split("\n");
		let inBlockComment = false;

		// Pattern to match table references in common SQL statements
		// This looks for FROM, JOIN, INTO, UPDATE statements
		const tableRefRegex = /\b(FROM|JOIN|INTO|UPDATE)\s+(?!\s*\()\s*(\[?[\w]+\]?\.)?(\[?[\w]+\]?\.)?\[?([\w]+)\]?\s/gi;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Handle block comments
			if (inBlockComment) {
				if (line.includes("*/")) {
					inBlockComment = false;
				}
				continue;
			}

			// Skip comments
			if (line.trim().startsWith("--")) {
				continue;
			}

			if (line.includes("/*")) {
				inBlockComment = true;
				continue;
			}

			let match;
			while ((match = tableRefRegex.exec(line)) !== null) {
				// check if there is a "--" before the match in the line
				const commentIndex = line.indexOf("--");
				if (commentIndex !== -1 && match.index > commentIndex) {
					continue;
				}

				const fullMatch = match[0];
				const part1 = match[2]; // database.
				const part2 = match[3]; // schema.
				const tableName = match[4];

				// Check if it's a three-part name (database.schema.table)
				if (!part1 || !part2) {
					const startPos = match.index + match[1].length;
					const range = new vscode.Range(i, startPos, i, startPos + fullMatch.length - match[1].length);

					const diagnostic = new vscode.Diagnostic(
						range,
						`Table reference '${tableName}' should use three-part naming: {DATABASE}.{SCHEMA}.{TABLE}`,
						vscode.DiagnosticSeverity.Error
					);
					diagnostic.source = "SQL DBA Linter";
					diagnostic.code = "three-part-naming";
					diagnostics.push(diagnostic);
				}
			}
		}
	}

	private checkOrOperator(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
		const text = document.getText();
		const lines = text.split("\n");
		let inBlockComment = false;

		// Match OR operator (not part of ORDER)
		const orRegex = /\b(OR)\b(?!\s*DER)/gi;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Handle block comments
			if (inBlockComment) {
				if (line.includes("*/")) {
					inBlockComment = false;
				}
				continue;
			}

			// Skip comments
			if (line.trim().startsWith("--")) {
				continue;
			}

			if (line.includes("/*")) {
				inBlockComment = true;
				continue;
			}

			let match;
			while ((match = orRegex.exec(line)) !== null) {
				const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
				const diagnostic = new vscode.Diagnostic(
					range,
					"OR operator is not allowed. Consider using IN clause or separate queries instead.",
					vscode.DiagnosticSeverity.Error
				);
				diagnostic.source = "SQL DBA Linter";
				diagnostic.code = "or-operator-disallowed";
				diagnostics.push(diagnostic);
			}
		}
	}

	private checkOrderBy(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
		const text = document.getText();
		const lines = text.split("\n");
		let inBlockComment = false;
		const orderByRegex = /\bORDER\s+BY\b/gi;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Handle block comments
			if (inBlockComment) {
				if (line.includes("*/")) {
					inBlockComment = false;
				}
				continue;
			}

			// Skip comments
			if (line.trim().startsWith("--")) {
				continue;
			}

			if (line.includes("/*")) {
				inBlockComment = true;
				continue;
			}

			let match;
			while ((match = orderByRegex.exec(line)) !== null) {
				const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
				const diagnostic = new vscode.Diagnostic(range, "ORDER BY clause is not allowed", vscode.DiagnosticSeverity.Error);
				diagnostic.source = "SQL DBA Linter";
				diagnostic.code = "order-by-disallowed";
				diagnostics.push(diagnostic);
			}
		}
	}

	private checkCountStar(document: vscode.TextDocument, diagnostics: vscode.Diagnostic[]): void {
		const text = document.getText();
		const lines = text.split("\n");
		let inBlockComment = false;
		const countStarRegex = /\bCOUNT\s*\(\s*\*\s*\)/gi;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Handle block comments
			if (inBlockComment) {
				if (line.includes("*/")) {
					inBlockComment = false;
				}
				continue;
			}

			// Skip comments
			if (line.trim().startsWith("--")) {
				continue;
			}
			if (line.includes("/*")) {
				inBlockComment = true;
				continue;
			}
			let match;
			while ((match = countStarRegex.exec(line)) !== null) {
				const range = new vscode.Range(i, match.index, i, match.index + match[0].length);
				const diagnostic = new vscode.Diagnostic(range, "COUNT(*) is not allowed. Specify a column name instead.", vscode.DiagnosticSeverity.Error);
				diagnostic.source = "SQL DBA Linter";
				diagnostic.code = "count-star-disallowed";
				diagnostics.push(diagnostic);
			}
		}
	}

	public clear(document: vscode.TextDocument): void {
		this.diagnosticCollection.delete(document.uri);
	}

	public clearAll(): void {
		this.diagnosticCollection.clear();
	}
}
