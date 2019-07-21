import * as vscode from 'vscode';
import { translate } from './commands/translate';

const commands = [
	translate
]

export function activate(context: vscode.ExtensionContext) {
	console.log('Auto translator activated');
	commands.forEach(c => {
		context.subscriptions.push(c);
	})
}

export function deactivate() {}
