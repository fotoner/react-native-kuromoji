"use strict";

const DictionaryLoader = require("./DictionaryLoader");
import { File } from "expo-file-system/next";
import { gunzipSync } from "fflate";

function ReactNativeDictionaryLoader(options) {
  DictionaryLoader.call(this, null);
  this.assets = options.assets; // dictionary files are assets that must be passed in to the builder
  this.loadArrayBuffer = this.loadArrayBuffer.bind(this);
}

ReactNativeDictionaryLoader.prototype = Object.create(
  DictionaryLoader.prototype
);
ReactNativeDictionaryLoader.prototype.constructor = ReactNativeDictionaryLoader;

ReactNativeDictionaryLoader.prototype.loadArrayBuffer = async function (
  filename,
  callback
) {
  try {
    console.log(`🔍 [${filename}] 로딩 시작...`);
    const startTotal = performance.now();

    const asset = this.assets[filename];
    if (!asset) {
      throw new Error(`Asset not found for filename: ${filename}`);
    }

    const uri = asset.localUri;
    if (!uri) {
      throw new Error(`File not found: ${filename}`);
    }

    // 1. 파일 읽기 (바이너리 직접 읽기 - Base64 디코딩 불필요!)
    const startRead = performance.now();
    const file = new File(uri);
    const buffer = await file.bytes();
    const readTime = (performance.now() - startRead).toFixed(1);
    console.log(
      `  📂 [${filename}] File.bytes(): ${readTime}ms (${buffer.length} bytes)`
    );

    // 2. 압축 해제 (동기 - React Native에는 Worker 없음)
    const startInflate = performance.now();
    const decompressed = gunzipSync(buffer);
    const inflateTime = (performance.now() - startInflate).toFixed(1);
    console.log(
      `  📦 [${filename}] fflate.gunzipSync: ${inflateTime}ms (${decompressed.length} bytes)`
    );

    // 3. ArrayBuffer 변환
    const startConvert = performance.now();
    const arrayBuffer = decompressed.buffer;
    const convertTime = (performance.now() - startConvert).toFixed(1);
    console.log(`  🔄 [${filename}] .buffer 접근: ${convertTime}ms`);

    const totalTime = (performance.now() - startTotal).toFixed(1);
    console.log(`✅ [${filename}] 총 로딩 시간: ${totalTime}ms\n`);

    callback(null, arrayBuffer);
  } catch (error) {
    console.error(`❌ [${filename}] Error in loadArrayBuffer:`, error);
    callback(error, null);
  }
};

module.exports = ReactNativeDictionaryLoader;
