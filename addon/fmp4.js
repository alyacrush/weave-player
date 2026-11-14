'use strict';

// Unencrypted, multiplexed H.264/AAC fMP4. Media bytes and timestamps are
// preserved; the browser's ISO BMFF demuxer handles sample timing.
const Fmp4 = (() => {
  function boxes(bytes, start = 0, end = bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const result = [];
    while (start < end) {
      if (end - start < 8) throw new Error('Truncated MP4 box');
      let size = view.getUint32(start), header = 8;
      const type = String.fromCharCode(...bytes.subarray(start + 4, start + 8));
      if (size === 1) {
        if (end - start < 16) throw new Error('Truncated extended MP4 box');
        size = view.getUint32(start + 8) * 4294967296 + view.getUint32(start + 12);
        header = 16;
      } else if (size === 0) size = end - start;
      if (!Number.isSafeInteger(size) || size < header || start + size > end) throw new Error('Invalid MP4 box size');
      result.push({type, start, data: start + header, end: start + size});
      start += size;
    }
    return result;
  }
  function required(list, type) {
    const box = list.find(b => b.type === type);
    if (!box) throw new Error('Missing MP4 box: ' + type);
    return box;
  }
  function initInfo(bytes, codecs) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const root = boxes(bytes);
    required(root, 'ftyp');
    const moov = required(root, 'moov');
    const children = b => boxes(bytes, b.data, b.end);
    const tracks = children(moov).filter(b => b.type === 'trak');
    required(children(moov), 'mvex');
    const info = {лЕстьВидео: false, лЕстьЗвук: false, чЧастотаКадров: 0, чДиапазон: -1,
      nMaxNumberReferenceFrames: '?', чМинДлительностьВидеоСемпла: NaN,
      чМаксДлительностьВидеоСемпла: NaN, чСредняяДлительностьВидеоСемпла: NaN,
      чПозицияКодирования: NaN, чПозицияТрансляции: NaN, чВремяКодирования: NaN};
    const actualCodecs = [];
    for (const track of tracks) {
      const mdia = required(children(track), 'mdia');
      const minf = required(children(mdia), 'minf');
      const stbl = required(children(minf), 'stbl');
      const stsd = required(children(stbl), 'stsd');
      const entries = boxes(bytes, stsd.data + 8, stsd.end);
      if (entries.length !== 1) throw new Error('Unsupported MP4 sample descriptions');
      const entry = entries[0];
      const p = entry.data;
      if (entry.type === 'encv' || entry.type === 'enca') throw new Error('Encrypted MP4 is unsupported');
      if (entry.type === 'avc1' || entry.type === 'avc3') {
        if (info.лЕстьВидео || entry.end - p < 78) throw new Error('Invalid AVC track');
        const avcc = required(boxes(bytes, p + 78, entry.end), 'avcC');
        if (avcc.end - avcc.data < 4) throw new Error('Invalid avcC');
        info.лЕстьВидео = true;
        info.nProfileIndication = bytes[avcc.data + 1];
        info.nConstraintSetFlag = bytes[avcc.data + 2];
        info.nLevelIndication = bytes[avcc.data + 3];
        info.чШиринаКартинки = view.getUint16(p + 24);
        info.чВысотаКартинки = view.getUint16(p + 26);
        actualCodecs.push(entry.type + '.' + Array.from(bytes.subarray(avcc.data + 1, avcc.data + 4), n => n.toString(16).padStart(2, '0')).join(''));
      } else if (entry.type === 'mp4a') {
        if (info.лЕстьЗвук || entry.end - p < 28) throw new Error('Invalid AAC track');
        info.лЕстьЗвук = true;
        info.чКоличествоКаналов = view.getUint16(p + 16);
        info.чЧастотаДискретизации = view.getUint32(p + 24) / 65536;
        const audioCodec = (codecs || '').split(',').map(s => s.trim()).find(s => /^mp4a\.40\.(2|5|29)$/.test(s));
        if (!audioCodec) throw new Error('Missing or unsupported AAC codec');
        info.nAudioObjectType = Number(audioCodec.split('.').pop());
        actualCodecs.push(audioCodec);
      } else throw new Error('Unsupported MP4 codec: ' + entry.type);
    }
    if (!actualCodecs.length) throw new Error('No supported MP4 tracks');
    info.сКодеки = (info.лЕстьВидео ? 'video' : 'audio') + '/mp4; codecs="' + actualCodecs.join(',') + '"';
    return info;
  }
  function same(a, b) {
    return a && a.length === b.length && a.every((n, i) => n === b[i]);
  }
  function createProcessor() {
    let previous = null, info = null;
    return {
      reset() { previous = null; info = null; },
      process(segment, forceBreak) {
        const init = new Uint8Array(segment.fmp4Init);
        const changed = !same(previous, init);
        if (changed) { info = initInfo(init, segment.fmp4Codecs); previous = init.slice(); }
        const media = new Uint8Array(segment.пДанные);
        const root = boxes(media);
        required(root, 'moof'); required(root, 'mdat');
        segment.лРазрыв = Boolean(segment.лРазрыв || forceBreak || changed);
        segment.пДанные = Object.assign({}, info, {мбМедиасегмент: media, чПреобразованЗа: 0});
        if (segment.лРазрыв) segment.пДанные.мбСегментИнициализации = init;
        delete segment.fmp4Init;
        return segment;
      }
    };
  }
  return {boxes, initInfo, createProcessor};
})();
if (typeof module !== 'undefined') module.exports = Fmp4;
