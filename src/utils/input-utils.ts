import * as vscode from 'vscode';
import { TranslationFile } from './translation-file';
import { QuickInputButton } from 'vscode';

export class InputUtils{
  public getTranslationKey(file: TranslationFile): Promise<string> {
    return new Promise((resolve: any, reject: any) => {

      const quickPick = vscode.window.createQuickPick();
      quickPick.placeholder = 'Provide translation key';
      let inputDebounceTimer: any = undefined;
      let filteredOptions: any[] = [];

      const filterOptions = async (filter: string) => {
        const options = await file.getSimilarKeys(filter);
        filteredOptions = options.map(f => ({label: f, description: ''}));
        const additionalOptionsToInclude = [];
        if(options.indexOf(filter) === -1 && filter.length !== 0){
          const addNewOption = {label: filter, description: '[ADD NEW]'};
          additionalOptionsToInclude.push(addNewOption);
        } 

        quickPick.items = additionalOptionsToInclude.concat(filteredOptions);
      }; 

      quickPick.onDidChangeValue((value: string) => {
        if(inputDebounceTimer !== undefined){
          clearTimeout(inputDebounceTimer);
          inputDebounceTimer = undefined;
        }

        inputDebounceTimer = setTimeout(() => filterOptions(value), 100);
      });

      quickPick.onDidChangeSelection((selectedItems: any) => {
        quickPick.value = selectedItems[0].label;
        filterOptions(quickPick.value);
      });

      quickPick.onDidHide(() => {
        quickPick.dispose();
        resolve();
      });

      quickPick.onDidAccept(() => {
        if(filteredOptions.find(o => o.label === quickPick.value) === undefined){
          resolve(quickPick.value);
          quickPick.dispose();
        }
      });

      quickPick.show();
    });
  }

  public async getTextValueFromUser(question: string){
    return await vscode.window.showInputBox({prompt: question});
  }
}