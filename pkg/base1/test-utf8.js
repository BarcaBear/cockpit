import cockpit from "cockpit";
import QUnit from "qunit-tests";

QUnit.test("utf8 basic", function (assert) {
    const str = "Base 64 \u2014 Mozilla Developer Network";
    const expect = [66, 97, 115, 101, 32, 54, 52, 32, 226, 128, 148, 32, 77,
        111, 122, 105, 108, 108, 97, 32, 68, 101, 118, 101, 108,
        111, 112, 101, 114, 32, 78, 101, 116, 119, 111, 114, 107];

    const encoded = cockpit.utf8_encoder().encode(str);
    assert.deepEqual(encoded, expect, "encoded");

    assert.equal(cockpit.utf8_decoder().decode(encoded), str, "decoded");
});

// Copyright 2014 Joshua Bell. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0.html
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Inspired by:
// http://ecmanaut.blogspot.com/2006/07/encoding-decoding-utf8-in-javascript.html

// Helpers for test_utf_roundtrip.

QUnit.test("utf8 round trip", function (assert) {
    const MIN_CODEPOINT = 0;
    const MAX_CODEPOINT = 0x10FFFF;
    const BLOCK_SIZE = 0x1000;
    const SKIP_SIZE = 31;
    const encoder = cockpit.utf8_encoder();
    const decoder = cockpit.utf8_decoder();

    function cpname(n) {
        if (n + 0 !== n)
            return n.toString();
        const w = (n <= 0xFFFF) ? 4 : 6;
        return 'U+' + ('000000' + n.toString(16).toUpperCase()).slice(-w);
    }

    function genblock(from, len, skip) {
        const block = [];
        for (let i = 0; i < len; i += skip) {
            let cp = from + i;
            if (cp >= 0xD800 && cp <= 0xDFFF)
                continue;
            if (cp < 0x10000) {
                block.push(String.fromCharCode(cp));
                continue;
            }
            cp = cp - 0x10000;
            block.push(String.fromCharCode(0xD800 + (cp >> 10)));
            block.push(String.fromCharCode(0xDC00 + (cp & 0x3FF)));
        }
        return block.join('');
    }

    for (let i = MIN_CODEPOINT; i < MAX_CODEPOINT; i += BLOCK_SIZE) {
        const block_tag = cpname(i) + " - " + cpname(i + BLOCK_SIZE - 1);
        const block = genblock(i, BLOCK_SIZE, SKIP_SIZE);
        const encoded = encoder.encode(block);
        const decoded = decoder.decode(encoded);

        const length = block.length;
        for (let j = 0; j < length; j++) {
            if (block[j] != decoded[j])
                assert.deepEqual(block, decoded, "round trip " + block_tag);
        }
    }

    assert.ok(true, "round trip all code points");
});

QUnit.test("utf8 samples", function (assert) {
    // z, cent, CJK water, G-Clef, Private-use character
    const sample = "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD";
    const expected = [0x7A, 0xC2, 0xA2, 0xE6, 0xB0, 0xB4, 0xF0, 0x9D, 0x84, 0x9E, 0xF4, 0x8F, 0xBF, 0xBD];

    const encoded = cockpit.utf8_encoder().encode(sample);
    assert.deepEqual(encoded, expected, "encoded");

    const decoded = cockpit.utf8_decoder().decode(expected);
    assert.deepEqual(decoded, sample, "decoded");
});

QUnit.test("utf8 stream", function (assert) {
    // z, cent, CJK water, G-Clef, Private-use character
    const sample = "z\xA2\u6C34\uD834\uDD1E\uDBFF\uDFFD";
    const expected = [0x7A, 0xC2, 0xA2, 0xE6, 0xB0, 0xB4, 0xF0, 0x9D, 0x84, 0x9E, 0xF4, 0x8F, 0xBF, 0xBD];

    const decoder = cockpit.utf8_decoder();
    let decoded = "";

    for (let i = 0; i < expected.length; i += 2)
        decoded += decoder.decode(expected.slice(i, i + 2), { stream: true });
    decoded += decoder.decode();

    assert.deepEqual(decoded, sample, "decoded");
});

QUnit.test("utf8 invalid", function (assert) {
    const sample = "Base 64 \ufffd\ufffd Mozilla Developer Network";
    const data = [66, 97, 115, 101, 32, 54, 52, 32, 226, /* 128 */ 148, 32, 77,
        111, 122, 105, 108, 108, 97, 32, 68, 101, 118, 101, 108,
        111, 112, 101, 114, 32, 78, 101, 116, 119, 111, 114, 107];

    const decoded = cockpit.utf8_decoder().decode(data);

    assert.deepEqual(decoded, sample, "decoded");
});

QUnit.test("utf8 fatal", function (assert) {
    const data = [66, 97, 115, 101, 32, 54, 52, 32, 226, /* 128 */ 148, 32, 77,
        111, 122, 105, 108, 108, 97, 32, 68, 101, 118, 101, 108,
        111, 112, 101, 114, 32, 78, 101, 116, 119, 111, 114, 107];

    assert.throws(function() { cockpit.utf8_decoder(true).decode(data) }, "fatal throws error");
});

QUnit.start();
