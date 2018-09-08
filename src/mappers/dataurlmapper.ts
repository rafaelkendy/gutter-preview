import { AbsoluteUrlMapper } from './mapper';
import { TextDocument } from 'vscode';

export const dataUrlMapper: AbsoluteUrlMapper = {
    map(document: TextDocument, imagePath: string) {
        let absoluteImagePath: string;
        if (imagePath.indexOf('data:image') === 0) {
            absoluteImagePath = imagePath;
        }
        return absoluteImagePath;
    },
    refreshConfig() {}
};
