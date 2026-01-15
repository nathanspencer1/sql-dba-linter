import * as assert from "assert";
import * as vscode from "vscode";
import { SqlValidator } from "../../validator";

function createMockDocument(content: string, uri: vscode.Uri = vscode.Uri.parse("file:///test.sql")): vscode.TextDocument {
	const lines = content.split("\n");
	return {
		uri,
		fileName: "test.sql",
		isUntitled: false,
		languageId: "sql",
		version: 1,
		isDirty: false,
		isClosed: false,
		eol: vscode.EndOfLine.LF,
		lineCount: lines.length,
		encoding: "utf8",
		getText: () => content,
		getWordRangeAtPosition: () => undefined,
		save: async () => true,
		lineAt: (lineOrPosition: number | vscode.Position) => {
			const line = typeof lineOrPosition === "number" ? lineOrPosition : lineOrPosition.line;
			return {
				lineNumber: line,
				text: lines[line] || "",
				range: new vscode.Range(line, 0, line, (lines[line] || "").length),
				rangeIncludingLineBreak: new vscode.Range(line, 0, line + 1, 0),
				firstNonWhitespaceCharacterIndex: 0,
				isEmptyOrWhitespace: false,
			} as vscode.TextLine;
		},
		offsetAt: () => 0,
		positionAt: () => new vscode.Position(0, 0),
		validateRange: (range: vscode.Range) => range,
		validatePosition: (position: vscode.Position) => position,
	} as vscode.TextDocument;
}

suite("SqlValidator - checkUseStatement", () => {
	let diagnosticCollection: vscode.DiagnosticCollection;
	let validator: SqlValidator;

	setup(() => {
		diagnosticCollection = vscode.languages.createDiagnosticCollection("test");
		validator = new SqlValidator(diagnosticCollection);
	});

	teardown(() => {
		diagnosticCollection.dispose();
	});

	suite("Basic USE Statement Validation", () => {
		test("should not report error when USE statement is present", () => {
			const content = "/*\nBlock Comment\n*/\n-- Line Comment\n \nUSE [TestDB];\n";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkUseStatement"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should not report any diagnostics for valid USE statement");
		});

		test("should not report error when USE statement is present with variations", () => {
			const content = "/*\nBlock Comment\n*/\n-- Line Comment\n \nuse  TestDB;\n";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkUseStatement"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should handle varied USE statement");
		});

		test("should report error when USE statement is missing", () => {
			const content = "/*\nUSE TestDB\n*/\n-- use [TestDB]\n \nSELECT * FROM table1;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkUseStatement"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 1, "Should report one diagnostic for missing USE statement");
			assert.strictEqual(diagnostics[0].code, "missing-use-statement");
			assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
			assert.match(diagnostics[0].message, /Script must begin with a USE/);
		});
	});

	suite("Diagnostic Properties", () => {
		test("should report error with correct range for missing USE statement", () => {
			const content = "SELECT * FROM table1;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkUseStatement"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 1);
			assert.strictEqual(diagnostics[0].range.start.line, 0);
			assert.strictEqual(diagnostics[0].range.start.character, 0);
		});

		test("should set diagnostic source correctly", () => {
			const content = "SELECT * FROM table1;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkUseStatement"](document, diagnostics);

			assert.strictEqual(diagnostics[0].source, "SQL DBA Linter");
		});
	});
});

suite("SqlValidator - checkThreePartNaming", () => {
	let diagnosticCollection: vscode.DiagnosticCollection;
	let validator: SqlValidator;

	setup(() => {
		diagnosticCollection = vscode.languages.createDiagnosticCollection("test");
		validator = new SqlValidator(diagnosticCollection);
	});

	teardown(() => {
		diagnosticCollection.dispose();
	});

	suite("Valid Three-Part Naming", () => {
		test("should not report error for valid FROM clause", () => {
			const content = "SELECT * FROM [db].[schema].[table1];\nSELECT * FROM db.schema.table1\nSELECT * FROM #TempTable;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should accept three-part naming in FROM clause");
		});

		test("should not report error for three-part naming in JOIN clause", () => {
			const content = "SELECT * FROM db1.dbo.table1\nJOIN db2.schema.table2 ON table1.id = table2.id\nJOIN [db3].[dbo].[table3] ON table2.id = table3.id\nJOIN #TempTable t ON t.id = table1.id;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should accept three-part naming in JOIN clause");
		});

		test("should not report error for three-part naming in UPDATE clause", () => {
			const content = "USE [TestDB];\nUPDATE [db].[schema].[table1] SET col1 = 1;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should accept three-part naming in UPDATE clause");
		});

		test("should not report error for three-part naming in INTO clause", () => {
			const content = "USE [TestDB];\nINSERT INTO [db].[schema].[table1] (col1) VALUES (1);";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should accept three-part naming in INTO clause");
		});
	});

	suite("Invalid Naming", () => {
		test("should report error for two-part naming in FROM clause", () => {
			const content = "USE [TestDB];\nSELECT * FROM [schema].[table1] WHERE id = 1;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 1, "Should report error for two-part naming");
			assert.strictEqual(diagnostics[0].code, "three-part-naming");
			assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
		});

		test("should report error for two-part naming in JOIN clause", () => {
			const content = "USE [TestDB];\nSELECT * FROM [db].[schema].[table1] JOIN [schema].[table2] ON table1.id = table2.id;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 1, "Should report one error for two-part naming in JOIN");
			assert.strictEqual(diagnostics[0].code, "three-part-naming");
		});

		test("should report error for single-part table name in FROM clause", () => {
			const content = "USE [TestDB];\nSELECT * FROM [table1] WHERE id = 1;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 1, "Should report error for single-part table name");
			assert.strictEqual(diagnostics[0].code, "three-part-naming");
		});

		test("should report error for two-part naming in UPDATE clause", () => {
			const content = "USE [TestDB];\nUPDATE [schema].[table1] SET col1 = 1;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 1, "Should report error for two-part naming in UPDATE");
			assert.strictEqual(diagnostics[0].code, "three-part-naming");
		});
	});

	suite("Comment Handling", () => {
		test("should ignore table references in comments", () => {
			const content = "/*\nSELECT * FROM table1\nFROM table1\n*/-- FROM table1\nSELECT * FROM [db].[schema].[table1];";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should ignore table reference in block comment");
		});
	});

	suite("Multiple Violations", () => {
		test("should report multiple violations in single query", () => {
			const content = "USE [TestDB];\nSELECT * FROM table1 \n JOIN table2 ON table1.id = table2.id;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 2, "Should report two violations for two unqualified tables");
			assert.strictEqual(diagnostics[0].code, "three-part-naming");
			assert.strictEqual(diagnostics[1].code, "three-part-naming");
			assert.strictEqual(diagnostics[0].range.start.line, 1);
			assert.strictEqual(diagnostics[1].range.start.line, 2);
		});

		test("should report violations mixed with valid three-part naming", () => {
			const content = "USE [TestDB];\nSELECT * FROM [db].[schema].[table1] JOIN bad_table ON table1.id = bad_table.id;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 1, "Should report only one violation for the bad table");
		});
	});

	suite("Edge Cases", () => {
		test("should handle subquery tables with parentheses", () => {
			const content = "USE [TestDB];\nSELECT * FROM (SELECT * FROM [db].[schema].[table1]) AS t;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			// Parentheses after FROM are skipped by regex
			assert.strictEqual(diagnostics.length, 0, "Should skip subquery tables");
		});

		test("should handle multiple JOIN statements", () => {
			const content =
				"USE [TestDB];\nSELECT * FROM [db].[schema].[t1]\nJOIN [db].[schema].[t2] ON t1.id = t2.id\nJOIN [db].[schema].[t3] ON t2.id = t3.id;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should handle multiple three-part JOINs");
		});

		test("should handle empty file", () => {
			const content = "";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should handle empty file gracefully");
		});

		test("should handle file with only comments", () => {
			const content = "-- Just comments\n/* No actual SQL FROM MyTable */";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should handle file with only comments");
		});

		test("should handle INTO with different variations", () => {
			const content =
				"USE [TestDB];\nINSERT INTO [db].[schema].[table1] (col1) VALUES (1);\nINSERT INTO [db].[dbo].[table2] SELECT * FROM [db].[schema].[table1];";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 0, "Should handle multiple INTO statements with three-part naming");
		});
	});

	suite("Diagnostic Accuracy", () => {
		test("should report correct diagnostic", () => {
			const content = "USE [TestDB];\nSELECT * FROM MyTable WHERE id = 1;";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];

			validator["checkThreePartNaming"](document, diagnostics);
			assert.ok(diagnostics.length > 0, "Should have at least one diagnostic");
			assert.strictEqual(diagnostics[0].source, "SQL DBA Linter");
			assert.match(diagnostics[0].message, /MyTable/);
			assert.match(diagnostics[0].message, /three-part naming/i);
			assert.strictEqual(diagnostics[0].range.start.line, 1, "Error should be on line 2 (index 1)");
			assert.ok(diagnostics[0].range.start.character > 0, "Error should have positive character position");
		});
	});
});

suite("SqlValidator - checkCountStar", () => {
	let diagnosticCollection: vscode.DiagnosticCollection;
	let validator: SqlValidator;

	setup(() => {
		diagnosticCollection = vscode.languages.createDiagnosticCollection("test");
		validator = new SqlValidator(diagnosticCollection);
	});

	teardown(() => {
		diagnosticCollection.dispose();
	});

	suite("Disallow COUNT(*) Validation", () => {
		test("should report error for COUNT(*) usage", () => {
			const content = "SELECT COUNT(*) FROM [db].[schema].[table1];";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];
			validator["checkCountStar"](document, diagnostics);

			assert.strictEqual(diagnostics.length, 1, "Should report one diagnostic for COUNT(*) usage");
			assert.strictEqual(diagnostics[0].code, "count-star-disallowed");
			assert.strictEqual(diagnostics[0].severity, vscode.DiagnosticSeverity.Error);
			assert.match(diagnostics[0].message, /COUNT\(\*\) is not allowed. Specify a column name instead./);
		});

		test("should not report error when COUNT(column) is used", () => {
			const content = "SELECT COUNT(column1) FROM [db].[schema].[table1];";
			const document = createMockDocument(content);
			const diagnostics: vscode.Diagnostic[] = [];
			validator["checkCountStar"](document, diagnostics);
			assert.strictEqual(diagnostics.length, 0, "Should not report diagnostics for COUNT(column) usage");
		});
	});
});
