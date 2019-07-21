import * as vscode from 'vscode';

export const translate = vscode.commands.registerCommand('extension.translate', () => {
    vscode.window.showInformationMessage('Translation!!!');
});