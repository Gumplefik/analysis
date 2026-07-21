/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

// 两个渲染模式
// createRoot	纯客户端渲染 CSR	清空容器，再创建 DOM
// hydrateRoot	SSR / SSG 后的客户端激活	尽量复用已有 DOM，并绑定事件

export {createRoot, hydrateRoot, version} from './src/client/ReactDOMClient';
