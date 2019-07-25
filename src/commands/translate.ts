import * as vscode from 'vscode';

export const translate = vscode.commands.registerCommand('extension.translate', async () => {
    const translationKey = await vscode.window.showInputBox({prompt: 'Provide translation key'});
    if(!translationKey) return;
    const translationValue = await vscode.window.showInputBox({prompt: 'Provide translation value'});
    if(!translationValue) return;  

    const config = vscode.workspace.getConfiguration('autoTranslatorExt');
    const translationFilePath = config['translationFilePath'];

    
});