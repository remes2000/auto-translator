import * as vscode from 'vscode';
import { translate } from './commands/translate';
import { translatePrintTranslationKey } from './commands/translate-print-translation-key';

const commands = [
	translate,
	translatePrintTranslationKey
];

export function activate(context: vscode.ExtensionContext) {
	commands.forEach(c => {
		context.subscriptions.push(c);
	});
}

export function deactivate() {}
