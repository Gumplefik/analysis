/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// 支持File、Blob 或 MediaSource 对象。
export function setSrcObject(domElement: Element, tag: string, value: any) {
  // We optimistically create the URL regardless of object type. This lets us
  // support cross-realms and any type that the browser supports like new types.
  // 将文件对象转为url
  const url = URL.createObjectURL(value as any);
  const loadEvent = tag === 'img' ? 'load' : 'loadstart';
  const cleanUp = () => {
    // Once the object has started loading, then it's already collected by the
    // browser and it won't refer to it by the URL anymore so we can now revoke it.
    // 释放对象引用
    URL.revokeObjectURL(url);
    // 清理事件监听
    domElement.removeEventListener(loadEvent, cleanUp);
    domElement.removeEventListener('error', cleanUp);
  };
  domElement.addEventListener(loadEvent, cleanUp);
  domElement.addEventListener('error', cleanUp);
  domElement.setAttribute('src', url);
}
