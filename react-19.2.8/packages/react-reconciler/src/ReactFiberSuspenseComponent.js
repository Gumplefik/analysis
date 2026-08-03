/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Wakeable, SuspenseListTailMode} from 'shared/ReactTypes';
import type {Fiber} from './ReactInternalTypes';
import type {SuspenseInstance} from './ReactFiberConfig';
import type {Lane} from './ReactFiberLane';
import type {TreeContext} from './ReactFiberTreeContext';
import type {CapturedValue} from './ReactCapturedValue';

import {SuspenseComponent, SuspenseListComponent} from './ReactWorkTags';
import {NoFlags, DidCapture} from './ReactFiberFlags';
import {
  isSuspenseInstancePending,
  isSuspenseInstanceFallback,
} from './ReactFiberConfig';

// A null SuspenseState represents an unsuspended normal Suspense boundary.
// A non-null SuspenseState means that it is blocked for one reason or another.
// - A non-null dehydrated field means it's blocked pending hydration.
//   - A non-null dehydrated field can use isSuspenseInstancePending or
//     isSuspenseInstanceFallback to query the reason for being dehydrated.
// - A null dehydrated field means it's blocked by something suspending and
//   we're currently showing a fallback instead.
// SuspenseState 非空表示真实组件暂时不能正常显示：
// dehydrated 为空时表示组件正在等待数据，页面显示 fallback（如 Loading）；
// dehydrated 非空时表示页面已有服务端内容，正在等待客户端 React 接管。
export type SuspenseState = {
  // If this boundary is still dehydrated, we store the SuspenseInstance
  // here to indicate that it is dehydrated (flag) and for quick access
  // to check things like isSuspenseInstancePending.
  // 服务端 Suspense 内容的 DOM 边界；为空表示不是等待接管服务端内容，而是在显示 fallback。
  dehydrated: null | SuspenseInstance,
  // 保存服务端渲染时所在的树位置，客户端接管时用它匹配相同位置并生成一致的 useId。
  treeContext: null | TreeContext,
  // Represents the lane we should attempt to hydrate a dehydrated boundary at.
  // OffscreenLane is the default for dehydrated boundaries.
  // NoLane is the default for normal boundaries, which turns into "normal" pri.
  // 再次尝试接管服务端内容时使用的任务优先级。
  retryLane: Lane,
  // Stashed Errors that happened while attempting to hydrate this boundary.
  // 接管服务端内容时发生的错误，暂存在这里，后续统一处理或上报。
  hydrationErrors: Array<CapturedValue<mixed>> | null,
};

export type SuspenseListRenderState = {
  isBackwards: boolean,
  // The currently rendering tail row.
  rendering: null | Fiber,
  // The absolute time when we started rendering the most recent tail row.
  renderingStartTime: number,
  // The last of the already rendered children.
  last: null | Fiber,
  // Remaining rows on the tail of the list.
  tail: null | Fiber,
  // Tail insertions setting.
  tailMode: SuspenseListTailMode,
  // Keep track of total number of forks during multiple passes
  treeForkCount: number,
};

export type RetryQueue = Set<Wakeable>;

export function findFirstSuspended(row: Fiber): null | Fiber {
  let node = row;
  // $FlowFixMe[invalid-compare]
  while (node !== null) {
    if (node.tag === SuspenseComponent) {
      const state: SuspenseState | null = node.memoizedState;
      if (state !== null) {
        const dehydrated: null | SuspenseInstance = state.dehydrated;
        if (
          dehydrated === null ||
          isSuspenseInstancePending(dehydrated) ||
          isSuspenseInstanceFallback(dehydrated)
        ) {
          return node;
        }
      }
    } else if (
      node.tag === SuspenseListComponent &&
      // Independent revealOrder can't be trusted because it doesn't
      // keep track of whether it suspended or not.
      node.memoizedProps.revealOrder !== 'independent'
    ) {
      const didSuspend = (node.flags & DidCapture) !== NoFlags;
      if (didSuspend) {
        return node;
      }
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === row) {
      return null;
    }
    while (node.sibling === null) {
      if (node.return === null || node.return === row) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  return null;
}
