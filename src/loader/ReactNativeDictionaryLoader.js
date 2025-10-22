"use strict";

const DictionaryLoader = require("./DictionaryLoader");
import { File } from "expo-file-system/next";

// 파일 읽기 캐시 (병렬 읽기 최적화)
const fileReadCache = new Map();

function ReactNativeDictionaryLoader(options) {
  DictionaryLoader.call(this, null);
  this.assets = options.assets; // dictionary files are assets that must be passed in to the builder
  this.loadArrayBuffer = this.loadArrayBuffer.bind(this);
}

ReactNativeDictionaryLoader.prototype = Object.create(
  DictionaryLoader.prototype
);
ReactNativeDictionaryLoader.prototype.constructor = ReactNativeDictionaryLoader;

ReactNativeDictionaryLoader.prototype.prefetchFiles = function () {
  const filenames = [
    "base.dat.gz",
    "check.dat.gz",
    "tid.dat.gz",
    "tid_pos.dat.gz",
    "tid_map.dat.gz",
    "cc.dat.gz",
    "unk.dat.gz",
    "unk_pos.dat.gz",
    "unk_map.dat.gz",
    "unk_char.dat.gz",
    "unk_compat.dat.gz",
    "unk_invoke.dat.gz",
  ];

  let startedCount = 0;

  filenames.forEach((filename) => {
    const asset = this.assets[filename];
    if (asset && asset.localUri) {
      const uri = asset.localUri;

      // 파일 읽기 시작 (압축 해제 불필요!)
      if (!fileReadCache.has(uri)) {
        const file = new File(uri);
        const readPromise = file.bytes();
        fileReadCache.set(uri, readPromise);
        startedCount++;
      }
    }
  });
};

ReactNativeDictionaryLoader.prototype.loadArrayBuffer = async function (
  filename,
  callback
) {
  try {
    const asset = this.assets[filename];
    if (!asset) {
      throw new Error(`Asset not found for filename: ${filename}`);
    }

    const uri = asset.localUri;
    if (!uri) {
      throw new Error(`File not found: ${filename}`);
    }
    let readPromise = fileReadCache.get(uri);
    if (!readPromise) {
      const file = new File(uri);
      readPromise = file.bytes();
      fileReadCache.set(uri, readPromise);
    }

    const buffer = await readPromise;
    console.log(
      `  📂 [${filename}] File.bytes(): ${readTime}ms (${buffer.length} bytes)`
    );

    const arrayBuffer = buffer.buffer;

    callback(null, arrayBuffer);
  } catch (error) {
    console.error(`❌ [${filename}] Error in loadArrayBuffer:`, error);
    callback(error, null);
  }
};

module.exports = ReactNativeDictionaryLoader;
