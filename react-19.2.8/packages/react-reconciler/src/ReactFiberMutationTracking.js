/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import {
  enableDefaultTransitionIndicator,
  enableViewTransition,
} from 'shared/ReactFeatureFlags';

// 整个 React Root 本次提交是否发生过 DOM 变更
export let rootMutationContext: boolean = false;
// 当前 ViewTransition 子树是否发生过 DOM 变更
export let viewTransitionMutationContext: boolean = false;

// 开启新的root提交时，要清空旧的dom记录
// 就是意思开始新的root提交时，这时候要重置，表示暂时还没有dom变更
export function pushRootMutationContext(): void {
  if (enableDefaultTransitionIndicator) {
    rootMutationContext = false;
  }
  if (enableViewTransition) {
    viewTransitionMutationContext = false;
  }
}

export function pushMutationContext(): boolean {
  if (!enableViewTransition) {
    return false;
  }
  const prev = viewTransitionMutationContext;
  viewTransitionMutationContext = false;
  return prev;
}

export function popMutationContext(prev: boolean): void {
  if (enableViewTransition) {
    if (viewTransitionMutationContext) {
      rootMutationContext = true;
    }
    viewTransitionMutationContext = prev;
  }
}

// 标记发生了dom变更
export function trackHostMutation(): void {
  // This is extremely hot function that must be inlined. Don't add more stuff.
  if (enableViewTransition) {
    viewTransitionMutationContext = true;
  } else if (enableDefaultTransitionIndicator) {
    // We only set this if enableViewTransition is not on. Otherwise we track
    // it on the viewTransitionMutationContext and collect it when we pop
    // to avoid more than a single operation in this hot path.
    rootMutationContext = true;
  }
}
