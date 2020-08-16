import * as vscode from 'vscode';
import { TranslateCommand } from './translate';

class TranslatePrintTranslationKeyCommand extends TranslateCommand{
    public async runAndPrintTranslationKey(){
        await this.run();
        if(vscode.window.activeTextEditor){
            vscode.window.activeTextEditor.insertSnippet(new vscode.SnippetString(this.translationKey), vscode.window.activeTextEditor.selection.active);
        }
    }
}

export const translatePrintTranslationKey = vscode.commands.registerCommand('extension.translatePrintTranslationKey', async () => {
    try{
        const translateCommand: TranslatePrintTranslationKeyCommand = new TranslatePrintTranslationKeyCommand(vscode.workspace.getConfiguration('autoTranslatorExt'));
        await translateCommand.runAndPrintTranslationKey();
    } catch (e){
        vscode.window.showErrorMessage(e.message);
    }
});