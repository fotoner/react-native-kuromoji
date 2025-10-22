"use strict";

const DictionaryLoader = require("./DictionaryLoader");
import * as FileSystem from "expo-file-system";
import fflate from "fflate";
import { Buffer } from "buffer";

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

    // 1. 파일 읽기 (Base64)
    const startRead = performance.now();
    const fileContents = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const readTime = (performance.now() - startRead).toFixed(1);
    console.log(
      `  📂 [${filename}] FileSystem.readAsStringAsync: ${readTime}ms`
    );

    // 2. Base64 디코딩
    const startDecode = performance.now();
    const buffer = Buffer.from(fileContents, "base64");
    const decodeTime = (performance.now() - startDecode).toFixed(1);
    console.log(
      `  🔓 [${filename}] Base64 decode: ${decodeTime}ms (${buffer.length} bytes)`
    );

    // 3. 압축 해제
    const startInflate = performance.now();
    const decompressed = fflate.inflateSync(buffer);
    const inflateTime = (performance.now() - startInflate).toFixed(1);
    console.log(
      `  📦 [${filename}] fflate.inflateSync: ${inflateTime}ms (${decompressed.length} bytes)`
    );

    // 4. ArrayBuffer 변환
    const startConvert = performance.now();
    const arrayBuffer = Uint8Array.from(decompressed).buffer;
    const convertTime = (performance.now() - startConvert).toFixed(1);
    console.log(`  🔄 [${filename}] Uint8Array.from: ${convertTime}ms`);

    const totalTime = (performance.now() - startTotal).toFixed(1);
    console.log(`✅ [${filename}] 총 로딩 시간: ${totalTime}ms\n`);

    callback(null, arrayBuffer);
  } catch (error) {
    console.error(`❌ [${filename}] Error in loadArrayBuffer:`, error);
    callback(error, null);
  }
};

module.exports = ReactNativeDictionaryLoader;
