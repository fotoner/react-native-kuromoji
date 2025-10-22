/*
 * Copyright 2014 Takuya Asano
 * Copyright 2010-2014 Atilika Inc. and contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

var async = require("async");
var DynamicDictionaries = require("../dict/DynamicDictionaries");

/**
 * DictionaryLoader base constructor
 * @param {string} dic_path Dictionary path
 * @constructor
 */
function DictionaryLoader() {
    this.dic = new DynamicDictionaries();
}

DictionaryLoader.prototype.loadArrayBuffer = function (file, callback) {
    throw new Error("DictionaryLoader#loadArrayBuffer should be overwrite");
};

/**
 * Load dictionary files
 * @param {DictionaryLoader~onLoad} load_callback Callback function called after loaded
 */
DictionaryLoader.prototype.load = function (load_callback) {
    var dic = this.dic;
    var loadArrayBuffer = this.loadArrayBuffer;

    console.log('📚 [DictionaryLoader] 전체 사전 로딩 시작...\n');
    const loadStartTime = performance.now();

    async.parallel([
        // Trie
        function (callback) {
            console.log('🌲 [Trie] 로딩 시작...');
            const trieStart = performance.now();
            async.map([ "base.dat.gz", "check.dat.gz" ], function (filename, _callback) {
                loadArrayBuffer(filename, function (err, buffer) {
                    if(err) {
                        return _callback(err);
                    }
                    _callback(null, buffer);
                });
            }, function (err, buffers) {
                if(err) {
                    return callback(err);
                }
                const parseStart = performance.now();
                var base_buffer = new Int32Array(buffers[0]);
                var check_buffer = new Int32Array(buffers[1]);

                dic.loadTrie(base_buffer, check_buffer);
                const parseTime = (performance.now() - parseStart).toFixed(1);
                const trieTime = (performance.now() - trieStart).toFixed(1);
                console.log(`  ⚙️  [Trie] Int32Array 변환 + loadTrie: ${parseTime}ms`);
                console.log(`✅ [Trie] 총 시간: ${trieTime}ms\n`);
                callback(null);
            });
        },
        // Token info dictionaries
        function (callback) {
            console.log('📖 [TokenInfo] 로딩 시작...');
            const tokenInfoStart = performance.now();
            async.map([ "tid.dat.gz", "tid_pos.dat.gz", "tid_map.dat.gz" ], function (filename, _callback) {
                loadArrayBuffer(filename, function (err, buffer) {
                    if(err) {
                        console.log(`Error loading file: ${filename}`, err);
                        return _callback(err);
                    }
                    _callback(null, buffer);
                });
            }, function (err, buffers) {
                if(err) {
                    console.log('Error in async map for token info dictionaries:', err);
                    return callback(err);
                }
                const parseStart = performance.now();
                var token_info_buffer = new Uint8Array(buffers[0]);
                var pos_buffer = new Uint8Array(buffers[1]);
                var target_map_buffer = new Uint8Array(buffers[2]);

                dic.loadTokenInfoDictionaries(token_info_buffer, pos_buffer, target_map_buffer);
                const parseTime = (performance.now() - parseStart).toFixed(1);
                const tokenInfoTime = (performance.now() - tokenInfoStart).toFixed(1);
                console.log(`  ⚙️  [TokenInfo] Uint8Array 변환 + loadTokenInfoDictionaries: ${parseTime}ms`);
                console.log(`✅ [TokenInfo] 총 시간: ${tokenInfoTime}ms\n`);
                callback(null);
            });
        },
        // Connection cost matrix
        function (callback) {
            console.log('🔗 [ConnectionCosts] 로딩 시작...');
            const ccStart = performance.now();
            loadArrayBuffer("cc.dat.gz", function (err, buffer) {
                if(err) {
                    return callback(err);
                }
                const parseStart = performance.now();
                var cc_buffer = new Int16Array(buffer);
                dic.loadConnectionCosts(cc_buffer);
                const parseTime = (performance.now() - parseStart).toFixed(1);
                const ccTime = (performance.now() - ccStart).toFixed(1);
                console.log(`  ⚙️  [ConnectionCosts] Int16Array 변환 + loadConnectionCosts: ${parseTime}ms`);
                console.log(`✅ [ConnectionCosts] 총 시간: ${ccTime}ms\n`);
                callback(null);
            });
        },
        // Unknown dictionaries
        function (callback) {
            console.log('❓ [Unknown] 로딩 시작...');
            const unknownStart = performance.now();
            async.map([ "unk.dat.gz", "unk_pos.dat.gz", "unk_map.dat.gz", "unk_char.dat.gz", "unk_compat.dat.gz", "unk_invoke.dat.gz" ], function (filename, _callback) {
                loadArrayBuffer(filename, function (err, buffer) {
                    if(err) {
                        return _callback(err);
                    }
                    _callback(null, buffer);
                });
            }, function (err, buffers) {
                if(err) {
                    return callback(err);
                }
                const parseStart = performance.now();
                var unk_buffer = new Uint8Array(buffers[0]);
                var unk_pos_buffer = new Uint8Array(buffers[1]);
                var unk_map_buffer = new Uint8Array(buffers[2]);
                var cat_map_buffer = new Uint8Array(buffers[3]);
                var compat_cat_map_buffer = new Uint32Array(buffers[4]);
                var invoke_def_buffer = new Uint8Array(buffers[5]);

                dic.loadUnknownDictionaries(unk_buffer, unk_pos_buffer, unk_map_buffer, cat_map_buffer, compat_cat_map_buffer, invoke_def_buffer);
                const parseTime = (performance.now() - parseStart).toFixed(1);
                const unknownTime = (performance.now() - unknownStart).toFixed(1);
                console.log(`  ⚙️  [Unknown] TypedArray 변환 + loadUnknownDictionaries: ${parseTime}ms`);
                console.log(`✅ [Unknown] 총 시간: ${unknownTime}ms\n`);
                callback(null);
            });
        }
    ], function (err) {
        const totalTime = (performance.now() - loadStartTime).toFixed(1);
        console.log('='.repeat(60));
        console.log(`🎉 [DictionaryLoader] 전체 사전 로딩 완료! 총 시간: ${totalTime}ms`);
        console.log('='.repeat(60) + '\n');
        load_callback(err, dic);
    });
};

/**
 * Callback
 * @callback DictionaryLoader~onLoad
 * @param {Object} err Error object
 * @param {DynamicDictionaries} dic Loaded dictionary
 */

module.exports = DictionaryLoader;
