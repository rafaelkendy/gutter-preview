import * as tmp from 'tmp';
import * as request from 'request';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import { copyFile } from './fileutil';
import { promisify } from 'util';

tmp.setGracefulCleanup();

let imageCache: Map<String, Thenable<string>> = new Map();
let currentColor: string;
export const ImageCache = {
    setCurrentColor: (color: string) => {
        if (currentColor != color) {
            currentColor = color;
            imageCache.clear();
        }
    },
    delete: (key: string) => {
        imageCache.delete(key);
    },
    set: (key: string, value: Thenable<string>) => {
        imageCache.set(key, value);
    },
    get: (key: string) => {
        return imageCache.get(key);
    },
    has: (key: string) => {
        return imageCache.has(key);
    },
    store: (absoluteImagePath: string): Thenable<string> => {
        const currentColorForClojure: string = currentColor;
        if (ImageCache.has(absoluteImagePath)) {
            return ImageCache.get(absoluteImagePath);
        } else {
            try {
                const absoluteImageUrl = url.parse(absoluteImagePath);
                const tempFile = tmp.fileSync({
                    postfix: absoluteImageUrl.pathname ? path.parse(absoluteImageUrl.pathname).ext : 'png'
                });
                const filePath = tempFile.name;
                const promise = new Promise<string>((resolve, reject) => {
                    if (absoluteImageUrl.protocol && absoluteImageUrl.protocol.startsWith('http')) {
                        var r = request(absoluteImagePath);
                        r.on('error', function(err) {
                            reject(err);
                        });
                        r.on('response', function(res) {
                            r.pipe(fs.createWriteStream(filePath)).on('close', () => {
                                resolve(filePath);
                            });
                        });
                    } else {
                        try {
                            const handle = fs.watch(absoluteImagePath, function fileChangeListener() {
                                handle.close();
                                fs.unlink(filePath, () => {});
                                ImageCache.delete(absoluteImagePath);
                            });
                        } catch (e) {}
                        copyFile(absoluteImagePath, filePath, err => {
                            if (!err) {
                                resolve(filePath);
                            }
                        });
                    }
                });
                ImageCache.set(absoluteImagePath, promise);
                const injectStyles = (path: string) => {
                    return new Promise<string>((res, rej) => {
                        if (path.endsWith('.svg')) {
                            const read = promisify(fs.readFile);
                            const write = promisify(fs.writeFile);

                            read(path)
                                .then(data => {
                                    const original = data.toString('UTF-8');
                                    return original.replace('<svg', `<svg style="color:${currentColorForClojure}"`);
                                })
                                .then(data => {
                                    return write(path, data);
                                })
                                .then(() => res(path))
                                .catch(err => rej(err));
                        } else {
                            res(path);
                        }
                    });
                };
                return promise.then(p => injectStyles(p));
            } catch (error) {}
        }
    },

    cleanup: () => {
        imageCache.forEach(value => {
            value.then(tmpFile => fs.unlink(tmpFile, () => {}));
        });
        imageCache.clear();
    }
};
